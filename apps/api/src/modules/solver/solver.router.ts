import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { SolverStudioConfig } from '@bmsce/contracts';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/env.js';
import { setJobStatus } from '../../config/redis.js';

const OPTIMIZER_URL = process.env.OPTIMIZER_URL || 'http://localhost:8000';
const OPTIMIZER_HTTP_TIMEOUT_MS = Number(process.env.OPTIMIZER_HTTP_TIMEOUT_MS || 60000);

const solverRunSchema = z.object({
  engine: z.enum(['CONSTRAINT_CSP', 'HYBRID_MIP', 'SIMULATED_ANNEALING', 'GREEDY_BASELINE']).optional(),
  academicTermId: z.string().optional(),
  departmentId: z.string().optional(),
  programId: z.string().optional(),
  sectionIds: z.array(z.string()).optional(),
  semesters: z.array(z.number().int().min(1).max(8)).optional(),
  timeLimit: z.number().int().min(5).max(300).optional(),
  demoMode: z.boolean().optional().default(false),
});

const DAY_NUMBER_TO_CODE: Record<number, string> = {
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

export interface SolverScopeInput {
  academicTermId?: string;
  departmentId?: string;
  programId?: string;
  sectionIds?: string[];
  semesters?: number[];
  timeLimit?: number;
}

export class SolverPayloadError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

/**
 * Build an optimizer OptimizeRequest strictly from Prisma academic relationships:
 * Section -> SubjectOffering -> Subject & FacultyAssignment -> Faculty,
 * FacultyAvailability, FacultyWorkloadRule, Room, and BellSchedule/TimePeriod.
 */
export async function buildOptimizerPayloadFromDb(scope: SolverScopeInput = {}) {
  if (scope.departmentId) {
    const dept = await prisma.department.findUnique({ where: { id: scope.departmentId } });
    if (!dept) {
      throw new SolverPayloadError(
        404,
        'DEPARTMENT_NOT_FOUND',
        `Department '${scope.departmentId}' was not found.`
      );
    }
  }

  let selectedProg: { id: string; departmentId: string } | null = null;
  if (scope.programId) {
    selectedProg = await prisma.program.findUnique({ where: { id: scope.programId } });
    if (!selectedProg || (scope.departmentId && selectedProg.departmentId !== scope.departmentId)) {
      throw new SolverPayloadError(
        404,
        'PROGRAM_NOT_FOUND',
        `Program '${scope.programId}' was not found within the selected department scope.`
      );
    }
  }
  const effectiveDeptId = scope.departmentId ?? selectedProg?.departmentId;

  const term = scope.academicTermId
    ? await prisma.academicTerm.findUnique({ where: { id: scope.academicTermId } })
    : await prisma.academicTerm.findFirst({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });

  if (!term) {
    throw new SolverPayloadError(
      404,
      'ACADEMIC_TERM_NOT_FOUND',
      'No active academic term found for the requested scheduling scope.'
    );
  }

  const sections = await prisma.section.findMany({
    where: {
      academicTermId: term.id,
      status: 'ACTIVE',
      ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
      ...(scope.programId ? { programId: scope.programId } : {}),
      ...(scope.sectionIds?.length ? { id: { in: scope.sectionIds } } : {}),
      ...(scope.semesters?.length ? { semesterNumber: { in: scope.semesters } } : {}),
    },
    orderBy: { sectionCode: 'asc' },
  });

  if (sections.length === 0) {
    throw new SolverPayloadError(
      400,
      'EMPTY_SCHEDULING_SCOPE',
      'No active sections found matching the requested academic scheduling scope.'
    );
  }

  const sectionIds = sections.map((s) => s.id);
  const offerings = await prisma.subjectOffering.findMany({
    where: {
      academicTermId: term.id,
      sectionId: { in: sectionIds },
    },
    include: {
      subject: true,
      section: true,
      facultyAssignments: {
        where: { status: 'ACTIVE' },
        include: { faculty: { include: { user: true } } },
      },
    },
  });

  if (offerings.length === 0) {
    throw new SolverPayloadError(
      400,
      'NO_SUBJECT_OFFERINGS',
      'No subject offerings exist for the selected sections in this academic term.'
    );
  }

  const missingAssignments = offerings
    .filter((o) => o.facultyAssignments.length === 0)
    .map((o) => ({
      offeringId: o.id,
      sectionCode: o.section.sectionCode,
      subjectCode: o.subject.subjectCode,
    }));

  if (missingAssignments.length > 0) {
    throw new SolverPayloadError(
      400,
      'MISSING_FACULTY_ASSIGNMENTS',
      'One or more subject offerings have no active faculty assignments.',
      missingAssignments
    );
  }

  // BellSchedule & TimePeriod -> derive periods_per_day and time->period lookup
  const bellSchedule = await prisma.bellSchedule.findFirst({
    where: { academicTermId: term.id },
    include: { periods: { orderBy: { periodNumber: 'asc' } } },
    orderBy: { isDefault: 'desc' },
  });
  const classPeriods = (bellSchedule?.periods || []).filter((p) => p.periodType === 'CLASS');
  const periodsPerDay = classPeriods.length > 0 ? classPeriods.length : 7;

  // Map each section to ONLY its own SubjectOfferings
  const sectionSubjectsMap = new Map<string, Set<string>>();
  for (const sec of sections) {
    sectionSubjectsMap.set(sec.id, new Set());
  }
  const subjectsMap = new Map<
    string,
    { id: string; code: string; name: string; weekly_hours: number; is_lab: boolean; lab_duration_hours: number }
  >();
  const facultySubjectsMap = new Map<string, { name: string; subjectIds: Set<string>; assignmentMax?: number }>();

  for (const off of offerings) {
    sectionSubjectsMap.get(off.sectionId)?.add(off.subjectId);

    const isLab = off.requiresLab || off.subject.subjectType === 'LAB';
    const existingSubj = subjectsMap.get(off.subjectId);
    const weeklyHours = Math.max(1, Math.round(off.requiredPeriodsPerWeek));
    const labDuration = off.sessionDurationPeriods || off.subject.defaultDurationPeriods || (isLab ? 2 : 1);
    if (!existingSubj) {
      subjectsMap.set(off.subjectId, {
        id: off.subjectId,
        code: off.subject.subjectCode,
        name: off.subject.name,
        weekly_hours: weeklyHours,
        is_lab: isLab,
        lab_duration_hours: labDuration,
      });
    }

    for (const fa of off.facultyAssignments) {
      const entry = facultySubjectsMap.get(fa.facultyId) || {
        name: fa.faculty.user.displayName,
        subjectIds: new Set<string>(),
        assignmentMax: fa.maxPeriodsPerWeek ?? undefined,
      };
      entry.subjectIds.add(off.subjectId);
      facultySubjectsMap.set(fa.facultyId, entry);
    }
  }

  const facultyIds = Array.from(facultySubjectsMap.keys());
  const [workloadRules, availabilities, dbRooms] = await Promise.all([
    prisma.facultyWorkloadRule.findMany({
      where: { academicTermId: term.id, facultyId: { in: facultyIds } },
    }),
    prisma.facultyAvailability.findMany({
      where: {
        academicTermId: term.id,
        facultyId: { in: facultyIds },
        availabilityType: 'UNAVAILABLE',
      },
    }),
    prisma.room.findMany({
      where: {
        isActive: true,
        ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
      },
      orderBy: { roomCode: 'asc' },
    }),
  ]);

  const ruleByFaculty = new Map(workloadRules.map((r) => [r.facultyId, r]));
  const unavailByFaculty = new Map<string, string[]>();
  for (const av of availabilities) {
    if (!av.dayOfWeek) continue;
    const dayCode = DAY_NUMBER_TO_CODE[av.dayOfWeek];
    if (!dayCode) continue;

    let periodIdx = -1;
    if (av.startTime && classPeriods.length > 0) {
      const idx = classPeriods.findIndex((p) => p.startTime === av.startTime);
      if (idx >= 0) periodIdx = idx + 1; // 1-indexed for optimizer
    }
    if (periodIdx > 0) {
      const list = unavailByFaculty.get(av.facultyId) || [];
      list.push(`${dayCode}-${periodIdx}`);
      unavailByFaculty.set(av.facultyId, list);
    }
  }

  const minSectionStudents = Math.min(...sections.map((s) => s.studentCount));
  const eligibleRooms = dbRooms.filter((r) => r.capacity >= minSectionStudents || r.roomType === 'LAB');
  if (eligibleRooms.length === 0) {
    throw new SolverPayloadError(
      400,
      'INSUFFICIENT_ROOMS',
      'No active rooms meet the minimum capacity or capability requirements.'
    );
  }

  const dailyCaps = workloadRules
    .map((r) => r.maxPeriodsPerDay)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const maxDailyFacultyHours = dailyCaps.length > 0 ? Math.min(...dailyCaps) : 4;

  const payload = {
    sections: sections.map((s) => ({
      id: s.id,
      label: s.sectionCode,
      student_count: s.studentCount,
      subject_ids: Array.from(sectionSubjectsMap.get(s.id) || []),
    })),
    subjects: Array.from(subjectsMap.values()),
    faculty: facultyIds.map((fid) => {
      const info = facultySubjectsMap.get(fid)!;
      const rule = ruleByFaculty.get(fid);
      return {
        id: fid,
        name: info.name,
        subject_ids: Array.from(info.subjectIds),
        max_weekly_hours: rule?.maxPeriodsPerWeek ?? info.assignmentMax ?? 18,
        unavailable_slots: unavailByFaculty.get(fid) || [],
      };
    }),
    rooms: eligibleRooms.map((r) => ({
      id: r.id,
      name: r.roomCode,
      capacity: r.capacity,
      is_lab: r.roomType === 'LAB',
    })),
    constraints: {
      enforce_faculty_non_overlap: true,
      enforce_room_non_overlap: true,
      enforce_section_non_overlap: true,
      enforce_lab_contiguity: true,
      max_daily_faculty_hours: maxDailyFacultyHours,
      avoid_first_period_labs: true,
      time_limit_seconds: scope.timeLimit ?? 30,
    },
    days: ['MON', 'TUE', 'WED', 'THU', 'FRI'],
    periods_per_day: periodsPerDay,
  };

  return { term, payload };
}

const optimizerCandidatePayloadSchema = z.object({
  label: z.string().optional(),
  solver: z.string().optional(),
  solver_status: z.string().optional(),
  hard_violations: z.number().int().min(0).optional(),
  objective_score: z.number().optional(),
  metrics: z.record(z.unknown()).optional(),
  slots: z.array(z.unknown()).optional(),
});

const optimizerResponseSchema = z.object({
  feasible: z.boolean().optional(),
  candidates: z.array(optimizerCandidatePayloadSchema),
});

type OptimizerCallResult =
  | { ok: true; data: z.infer<typeof optimizerResponseSchema> }
  | {
      ok: false;
      httpStatus: number;
      errorCode: string;
      solverStatus: string;
      message: string;
      details?: Record<string, unknown>;
    };

/** Call the Python optimizer service with strict validation and failure classification. */
async function callOptimizer(payload: object, timeoutMs = OPTIMIZER_HTTP_TIMEOUT_MS): Promise<OptimizerCallResult> {
  const effectiveUrl = process.env.OPTIMIZER_URL || OPTIMIZER_URL;
  const effectiveTimeout = Number(process.env.OPTIMIZER_HTTP_TIMEOUT_MS || timeoutMs);
  try {
    const res = await fetch(`${effectiveUrl}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(effectiveTimeout),
    });

    if (!res.ok) {
      const rawText = await res.text().catch(() => '');
      let upstreamDetail: unknown = rawText ? rawText.slice(0, 500) : null;
      try {
        const parsedErr = JSON.parse(rawText);
        upstreamDetail = parsedErr?.detail ?? parsedErr?.message ?? upstreamDetail;
      } catch {
        // Keep truncated text
      }
      console.warn(`[Solver] Optimizer request failed with HTTP ${res.status}`);
      return {
        ok: false,
        httpStatus: res.status === 504 ? 504 : 503,
        errorCode: 'OPTIMIZER_HTTP_ERROR',
        solverStatus: 'ERROR',
        message: `Optimizer service returned HTTP ${res.status}.`,
        details: { upstreamStatus: res.status, upstreamDetail },
      };
    }

    const rawText = await res.text();
    let jsonBody: unknown;
    try {
      jsonBody = JSON.parse(rawText);
    } catch {
      console.warn('[Solver] Optimizer returned malformed JSON');
      return {
        ok: false,
        httpStatus: 502,
        errorCode: 'OPTIMIZER_MALFORMED_JSON',
        solverStatus: 'INVALID_RESPONSE',
        message: 'Optimizer service returned malformed JSON.',
      };
    }

    const parsed = optimizerResponseSchema.safeParse(jsonBody);
    if (!parsed.success) {
      console.warn('[Solver] Optimizer response failed schema validation');
      return {
        ok: false,
        httpStatus: 502,
        errorCode: 'OPTIMIZER_INVALID_RESPONSE',
        solverStatus: 'INVALID_RESPONSE',
        message: 'Optimizer service response did not match the expected schema.',
      };
    }

    if (parsed.data.candidates.length === 0) {
      console.warn('[Solver] Optimizer returned zero candidates');
      return {
        ok: false,
        httpStatus: 502,
        errorCode: 'OPTIMIZER_EMPTY_CANDIDATES',
        solverStatus: 'EMPTY',
        message: 'Optimizer service returned zero timetable candidates.',
      };
    }

    return { ok: true, data: parsed.data };
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.warn(`[Solver] Optimizer request timed out after ${effectiveTimeout}ms`);
      return {
        ok: false,
        httpStatus: 504,
        errorCode: 'OPTIMIZER_TIMEOUT',
        solverStatus: 'TIMEOUT',
        message: `Optimizer request timed out after ${effectiveTimeout}ms.`,
        details: { timeoutMs: effectiveTimeout },
      };
    }
    console.warn(`[Solver] Optimizer unreachable: ${err?.message || 'unknown error'}`);
    return {
      ok: false,
      httpStatus: 503,
      errorCode: 'OPTIMIZER_UNAVAILABLE',
      solverStatus: 'UNAVAILABLE',
      message: `Optimizer service is unreachable: ${err?.message || 'connection failed'}.`,
    };
  }
}

export const solverRouter = Router();

// Solver Studio metadata and constraints configuration (DB-backed, TASK-501)
solverRouter.get('/studio-config', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId =
      typeof req.query.departmentId === 'string' && req.query.departmentId.trim()
        ? req.query.departmentId.trim()
        : null;
    const programId =
      typeof req.query.programId === 'string' && req.query.programId.trim()
        ? req.query.programId.trim()
        : null;
    const academicTermId =
      typeof req.query.academicTermId === 'string' && req.query.academicTermId.trim()
        ? req.query.academicTermId.trim()
        : null;

    const [departments, programs, academicTerms] = await Promise.all([
      prisma.department.findMany({ orderBy: { code: 'asc' } }),
      prisma.program.findMany({ orderBy: { code: 'asc' } }),
      prisma.academicTerm.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const selectedDept = departmentId
      ? departments.find((d) => d.id === departmentId) ?? null
      : null;
    if (departmentId && !selectedDept) {
      return res.status(404).json({
        error: { code: 'DEPARTMENT_NOT_FOUND', message: `Department '${departmentId}' was not found.` },
      });
    }

    const selectedProg = programId
      ? programs.find((p) => p.id === programId) ?? null
      : null;
    if (programId && (!selectedProg || (departmentId && selectedProg.departmentId !== departmentId))) {
      return res.status(404).json({
        error: {
          code: 'PROGRAM_NOT_FOUND',
          message: `Program '${programId}' was not found within the selected department scope.`,
        },
      });
    }

    const selectedTerm = academicTermId
      ? academicTerms.find((t) => t.id === academicTermId) ?? null
      : null;
    if (academicTermId && !selectedTerm) {
      return res.status(404).json({
        error: {
          code: 'ACADEMIC_TERM_NOT_FOUND',
          message: `Academic term '${academicTermId}' was not found.`,
        },
      });
    }

    const effectiveDeptId = departmentId ?? selectedProg?.departmentId ?? null;

    const [sections, offerings, facultyCount, roomsCount, bellSchedules] = await Promise.all([
      prisma.section.findMany({
        where: {
          status: 'ACTIVE',
          ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
          ...(programId ? { programId } : {}),
          ...(academicTermId ? { academicTermId } : {}),
        },
        select: { id: true, semesterNumber: true },
      }),
      prisma.subjectOffering.findMany({
        where: {
          ...(academicTermId ? { academicTermId } : {}),
          ...(effectiveDeptId || programId
            ? {
                section: {
                  ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
                  ...(programId ? { programId } : {}),
                },
              }
            : {}),
        },
        select: {
          id: true,
          _count: {
            select: {
              facultyAssignments: { where: { status: 'ACTIVE' } },
            },
          },
        },
      }),
      prisma.faculty.count({
        where: {
          status: 'ACTIVE',
          ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
        },
      }),
      prisma.room.count({
        where: {
          isActive: true,
          ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
        },
      }),
      prisma.bellSchedule.findMany({
        where: { ...(academicTermId ? { academicTermId } : {}) },
        include: { periods: { where: { periodType: 'CLASS' } } },
        orderBy: [{ isDefault: 'desc' }, { effectiveFrom: 'desc' }],
        take: 1,
      }),
    ]);

    const semesters = Array.from(new Set(sections.map((s) => s.semesterNumber))).sort(
      (a, b) => a - b
    );
    const missingFacultyAssignmentsCount = offerings.filter(
      (o) => o._count.facultyAssignments === 0
    ).length;
    const classPeriodsCount = bellSchedules[0]?.periods.length ?? 0;
    const classPeriodsPerDay = classPeriodsCount > 0 ? classPeriodsCount : null;

    const issues: string[] = [];
    if (sections.length === 0) {
      issues.push('No active sections found in the selected scope.');
    }
    if (offerings.length === 0) {
      issues.push('No subject offerings found in the selected scope.');
    }
    if (missingFacultyAssignmentsCount > 0) {
      issues.push(
        `${missingFacultyAssignmentsCount} subject offering(s) have no active faculty assignment.`
      );
    }
    if (roomsCount === 0) {
      issues.push('No active rooms found in the selected scope.');
    }
    if (classPeriodsPerDay === null) {
      issues.push('No BellSchedule with CLASS periods found; solver will default to 7 periods/day.');
    }

    const hasData =
      departments.length > 0 ||
      academicTerms.length > 0 ||
      sections.length > 0 ||
      offerings.length > 0;

    const auditPassed =
      sections.length > 0 &&
      offerings.length > 0 &&
      missingFacultyAssignmentsCount === 0 &&
      roomsCount > 0;

    const configData: SolverStudioConfig = {
      hasData,
      isDemoData: departments.some((d) => d.isDemo) || academicTerms.some((t) => t.isDemo),
      scopeLabel: {
        department: selectedDept
          ? `${selectedDept.code} — ${selectedDept.name}`
          : selectedProg
          ? departments.find((d) => d.id === selectedProg.departmentId)?.name ?? 'Selected Department'
          : 'All Departments',
        program: selectedProg ? `${selectedProg.code} — ${selectedProg.name}` : 'All Programs',
        academicTerm: selectedTerm
          ? `${selectedTerm.academicYearLabel} (${selectedTerm.termLabel})`
          : 'All Academic Terms',
      },
      appliedFilters: { departmentId, programId, academicTermId },
      availableFilters: {
        departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
        programs: programs.map((p) => ({
          id: p.id,
          departmentId: p.departmentId,
          code: p.code,
          name: p.name,
        })),
        academicTerms: academicTerms.map((t) => ({
          id: t.id,
          academicYearLabel: t.academicYearLabel,
          termLabel: t.termLabel,
          status: t.status,
        })),
        semesters,
      },
      scopeSummary: {
        sectionsCount: sections.length,
        subjectOfferingsCount: offerings.length,
        facultyCount,
        roomsCount,
        classPeriodsPerDay,
        missingFacultyAssignmentsCount,
      },
      hardConstraints: [
        {
          code: 'HC-1',
          name: 'Zero Faculty Overlaps',
          description: 'A faculty member cannot be assigned to two sessions in the same time slot.',
          status: `Active Faculty in Scope: ${facultyCount}`,
          isStrict: true,
        },
        {
          code: 'HC-2',
          name: 'Zero Physical Room Collisions',
          description: 'Each active room can host at most one session per time slot.',
          status: `Active Rooms in Scope: ${roomsCount}`,
          isStrict: true,
        },
        {
          code: 'HC-6',
          name: 'Contiguous Laboratory Blocks',
          description: 'Multi-period laboratory offerings are scheduled in contiguous periods on the same day.',
          status: 'Enforced in CP-SAT',
          isStrict: true,
        },
        {
          code: 'HC-7',
          name: 'Faculty Unavailability Respect',
          description: 'FacultyAvailability UNAVAILABLE slots are excluded from candidate schedules.',
          status: 'Enforced in CP-SAT & Greedy',
          isStrict: true,
        },
      ],
      softTargets: [
        {
          key: 'SC-3',
          name: 'Consecutive Same-Subject Penalty',
          description: 'Penalizes excessive consecutive theory periods of the same subject for a section.',
          weight: 6,
          priority: 'HIGH',
        },
        {
          key: 'SC-4',
          name: 'Faculty Weekly Load Balance',
          description: 'Balances teaching load across eligible faculty members.',
          weight: 3,
          priority: 'MEDIUM',
        },
      ],
      engineStrategies: [
        { id: 'CONSTRAINT_CSP', label: 'Constraint CSP (OR-Tools CP-SAT)', note: 'Optimal constraint solver' },
        { id: 'GREEDY_BASELINE', label: 'Greedy Baseline', note: 'Fast heuristic baseline' },
      ],
      preExecutionAudit: {
        passed: auditPassed,
        summary: auditPassed
          ? `Scope ready: ${sections.length} section(s), ${offerings.length} offering(s), ${facultyCount} faculty, ${roomsCount} room(s).`
          : issues[0] || 'Scope requires configuration before solving.',
        issues,
      },
    };

    return res.json({ data: configData });
  } catch (err) {
    return next(err);
  }
});

// Trigger solver execution
solverRouter.post('/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Role check: Only HOD, Faculty, or Admin can invoke solver
    if (req.user && ['STUDENT', 'CR'].includes(req.user.role)) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Student and CR roles are not permitted to trigger master timetable generation.',
        },
      });
    }

    const parseResult = solverRunSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid solver run parameters',
          details: parseResult.error.format(),
        },
      });
    }

    const {
      engine = 'CONSTRAINT_CSP',
      academicTermId,
      departmentId,
      programId,
      sectionIds,
      semesters,
      timeLimit = 30,
      demoMode = false,
    } = parseResult.data;

    if (demoMode && config.isProduction) {
      return res.status(403).json({
        error: {
          code: 'DEMO_MODE_FORBIDDEN',
          message: 'Simulated demo solver mode is disabled in production.',
        },
      });
    }

    if (demoMode && !config.isDemo) {
      return res.status(403).json({
        error: {
          code: 'DEMO_MODE_DISABLED',
          message: 'Simulated demo solver mode requires explicit demo environment configuration.',
        },
      });
    }

    const startTime = Date.now();
    const jobId = `job-solver-${Date.now()}`;

    // Log job start to Redis / resilient store
    await setJobStatus(jobId, {
      status: 'RUNNING',
      engine,
      semesters,
      startedAt: new Date().toISOString(),
    });

    let built: { term: { id: string }; payload: any };
    try {
      built = await buildOptimizerPayloadFromDb({
        academicTermId,
        departmentId,
        programId,
        sectionIds,
        semesters,
        timeLimit,
      });
    } catch (err) {
      if (err instanceof SolverPayloadError) {
        return res.status(err.statusCode).json({
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        });
      }
      throw err;
    }

  const user = req.user?.userId
    ? { id: req.user.userId }
    : await prisma.user.findFirst();

  if (!user) {
    return res.status(400).json({
      error: { code: 'REQUESTER_NOT_FOUND', message: 'No user record available to attribute optimization run.' },
    });
  }

  // Explicit isolated demo simulation (never mixed with real candidates or publishable)
  if (demoMode) {
    const runtimeMs = Date.now() - startTime;
    return res.json({
      data: {
        runId: `demo-sim-${Date.now()}`,
        status: 'DEMO_SIMULATED',
        solverStatus: 'DEMO_SIMULATED',
        runtimeMs,
        candidatesGenerated: 1,
        isDemoSimulated: true,
        canPublish: false,
        warning:
          'DEMO / SIMULATED RESULT — Not generated by OR-Tools, not persisted as OptimizationCandidate, and cannot be published.',
        candidates: [
          {
            label: 'DEMO / SIMULATED Candidate A',
            solver: 'DEMO_SIMULATED',
            solver_status: 'DEMO_SIMULATED',
            hard_violations: 0,
            objective_score: 0,
            is_demo_simulated: true,
            metrics: {
              sections: built.payload.sections.length,
              simulated: true,
            },
            slots: [],
          },
        ],
        source: 'DEMO_SIMULATED',
      },
    });
  }

  // Call the real Python optimizer service
  const optimizerCall = await callOptimizer(built.payload);
  const runtimeMs = Date.now() - startTime;

  if (!optimizerCall.ok) {
    const failedRun = await prisma.optimizationRun.create({
      data: {
        academicTermId: built.term.id,
        requestedById: user.id,
        algorithmCode: engine,
        timeLimitSeconds: timeLimit,
        status: 'FAILED',
        solverStatus: optimizerCall.solverStatus,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        runtimeMs: BigInt(runtimeMs),
        inputSnapshot: JSON.stringify({
          sections: built.payload.sections.length,
          subjects: built.payload.subjects.length,
          faculty: built.payload.faculty.length,
          rooms: built.payload.rooms.length,
          error: {
            code: optimizerCall.errorCode,
            message: optimizerCall.message,
            details: optimizerCall.details ?? null,
          },
        }),
      },
    });

    return res.status(optimizerCall.httpStatus).json({
      error: {
        code: optimizerCall.errorCode,
        message: optimizerCall.message,
        runId: failedRun.id,
        details: optimizerCall.details ?? null,
      },
    });
  }

  const optimizerResult = optimizerCall.data;
  const solverStatus = optimizerResult.feasible ? 'OPTIMAL' : 'FEASIBLE';
  const candidateCount = optimizerResult.candidates.length;

  // Persist run + candidates atomically so partial/duplicate candidates cannot occur on DB error
  const run = await prisma.$transaction(async (tx) => {
    const createdRun = await tx.optimizationRun.create({
      data: {
        academicTermId: built.term.id,
        requestedById: user.id,
        algorithmCode: engine,
        timeLimitSeconds: timeLimit,
        status: 'COMPLETED',
        solverStatus,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        runtimeMs: BigInt(runtimeMs),
        inputSnapshot: JSON.stringify({
          sections: built.payload.sections.length,
          subjects: built.payload.subjects.length,
          faculty: built.payload.faculty.length,
          rooms: built.payload.rooms.length,
        }),
      },
    });

    for (let i = 0; i < optimizerResult.candidates.length; i++) {
      const c = optimizerResult.candidates[i];
      await tx.optimizationCandidate.create({
        data: {
          optimizationRunId: createdRun.id,
          candidateNumber: i + 1,
          label: c.label || `Candidate ${String.fromCharCode(65 + i)} (${c.solver || engine})`,
          solverStatus: c.solver_status || 'OPTIMAL',
          isFeasible: (c.hard_violations ?? 0) === 0,
          hardViolationCount: c.hard_violations ?? 0,
          softPenalty: c.objective_score ?? 0,
          qualityScore: Math.max(0, 100 - (c.objective_score ?? 0)),
          metrics: JSON.stringify(c.metrics || {}),
          explanation: `Generated via ${c.solver || engine} engine. ${c.slots?.length || 0} scheduled contact periods.`,
        },
      });
    }

    return createdRun;
  });

  return res.json({
    data: {
      runId: run.id,
      status: 'COMPLETED',
      solverStatus,
      runtimeMs,
      candidatesGenerated: candidateCount,
      isDemoSimulated: false,
      canPublish: true,
      candidates: optimizerResult.candidates,
      source: 'OR_TOOLS_PYTHON_SERVICE',
    },
  });
  } catch (err) {
    return next(err);
  }
});

// Candidate comparison data matching design/candidate-comparison.png
solverRouter.get('/candidates/compare', async (req: Request, res: Response) => {
  return res.json({
    data: {
      activeBaselineVersion: 'v4.2-OSD (DAAB Ratified)',
      candidates: [
        {
          id: 'cand-a',
          number: 1,
          name: 'Option A • Recommended Proxy',
          strategyType: 'SUBSTITUTE_FACULTY',
          title: 'Substitute Faculty Peer Allocation',
          description: 'Prof. S. Malathi (Assoc. Prof, DAA Co-Instructor) assumes Period 1 contact duties in Room PJ-302.',
          disruptionImpactScore: 96.2,
          impactCategory: 'Minimal Ripple',
          targetTime: 'Mon 08:30 – 09:30 AM',
          venue: 'PJ-302 (Reserved)',
          replacement: 'Prof. S. Malathi',
          facultyAvailable: 'Assigned: 15h / 18h limit (Weekly cap 18h / 18h max)',
          cohortMovement: 'Zero relocation (Students seated in PJ-302)',
          curriculumSync: 'Module 3 Exam Trackers matched, sync in viva',
          isRecommended: true,
          isSelected: true,
        },
        {
          id: 'cand-b',
          number: 2,
          name: 'Option B • Slot Relocation',
          strategyType: 'MUTUAL_SLOT_SWAP',
          title: 'Mutual Slot Reschedule / Swap',
          description: 'Shift DAA Core lecture to Thursday Period 7 (03:45–04:45 PM); release Monday Period 1 as sports.',
          disruptionImpactScore: 84.6,
          impactCategory: 'Contained Rescheduled',
          targetTime: 'Thu 03:45 – 04:45 PM',
          venue: 'PJ-302 (Slot Open)',
          replacement: 'Dr. A. Ramanathan (Post-recovery)',
          facultyAvailable: 'Open calendar window on Thursday',
          cohortMovement: 'Contains fatigue alert: 3 consecutive hours in lab',
          curriculumSync: 'Zero collision detected in Central Matrix',
          isRecommended: false,
          isSelected: false,
        },
        {
          id: 'cand-c',
          number: 3,
          name: 'Option C • Regulated Cancellation',
          strategyType: 'FREE_PERIOD',
          title: 'Supervised Digital Library Self-Study',
          description: 'Release Period 1 as supervised preparatory study in Digital Library (LIB-3) with biometric logging.',
          disruptionImpactScore: 68.0,
          impactCategory: 'Deficit Incurred',
          targetTime: 'Mon 08:30 – 09:30 AM',
          venue: 'Digital Library (LIB-3)',
          replacement: 'Asst. Librarian On-Duty',
          facultyAvailable: 'Zero faculty credit required',
          cohortMovement: 'Deficit: 1.0 h per sem. (Regulatory balance required: 39 / 40)',
          curriculumSync: 'Requires make-up hour before CIE-2',
          isRecommended: false,
          isSelected: false,
        },
      ],
      differentialVisualizer: {
        original: [
          { slot: '08:30 - 09:30', period: 'PERIOD 1', title: 'DAA Core (Theory)', faculty: 'Dr. A. Ramanathan', isDisrupted: true },
          { slot: '09:30 - 10:30', period: 'PERIOD 2', title: 'DBMS Principles', faculty: 'Dr. P. Jayashree' },
          { slot: '10:45 - 11:45', period: 'PERIOD 3', title: 'Computer Networks', faculty: 'Prof. M. K. Rao' },
          { slot: '11:45 - 12:45', period: 'PERIOD 4', title: 'Theory of Computation', faculty: 'Dr. G. Anita' },
          { slot: '12:45 - 01:45', period: 'RECESS', title: 'Campus Lunch', faculty: '-' },
          { slot: '01:45 - 04:45', period: 'PERIOD 5-7', title: 'Algorithms & Networks Lab', faculty: 'Batch B1/B2/B3' },
        ],
        repaired: [
          { slot: '08:30 - 09:30', period: 'PERIOD 1', title: 'DAA Core (Theory)', faculty: 'Prof. S. Malathi [PROXY]', isChanged: true, changeType: 'PROXY' },
          { slot: '09:30 - 10:30', period: 'PERIOD 2', title: 'DBMS Principles', faculty: 'Dr. P. Jayashree' },
          { slot: '10:45 - 11:45', period: 'PERIOD 3', title: 'Computer Networks', faculty: 'Prof. M. K. Rao' },
          { slot: '11:45 - 12:45', period: 'PERIOD 4', title: 'Theory of Computation', faculty: 'Dr. G. Anita' },
          { slot: '12:45 - 01:45', period: 'RECESS', title: 'Campus Lunch', faculty: '-' },
          { slot: '01:45 - 04:45', period: 'PERIOD 5-7', title: 'Algorithms & Networks Lab', faculty: 'Batch B1/B2/B3' },
        ],
      },
      constraintVerifications: [
        { name: 'Faculty Concurrency & Collision Check', status: 'PASS', detail: '0 overlaps. Prof. S. Malathi has no concurrent teaching hours scheduled in Period 1.' },
        { name: 'Cohort Timetable Integrity', status: 'PASS', detail: '0 clashes for 5th Sem CSE-B. Students retain their scheduled physical presence in Room PJ-302.' },
        { name: 'Room & Venue Collision Integrity', status: 'PASS', detail: 'PJ-302 occupancy confirmed. No parallel room reservation exists in Master Allocation Matrix.' },
        { name: 'NEP 2022 Lab Continuity Compliance', status: 'PASS', detail: '100% preserved. Afternoon 3-hour integrated laboratory practical block (Periods 5–7) remains untouched.' },
        { name: 'AICTE Workload Regulatory Threshold', status: 'PASS', detail: 'Compliant. Prof. S. Malathi load advances from 15.0h to 16.0h/wk (well below 18.0h AICTE ceiling).' },
      ],
      impactDeltas: {
        studentsEnrolled: 64,
        sessionsShifted: 1,
        roomVariancePct: 0.0,
        curricularDeviationPct: 0.5,
        workloadBalance: {
          profSMalathi: '+1.0 h/wk (16.0h / 18.0h)',
          drARamanathan: '-1.0 h/wk (14.0h / 16.0h)',
        },
      },
    },
  });
});

