import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  PublishCandidateRequestSchema,
  type CandidateComparisonResponse,
  type PublishCandidateResponse,
  type SolverStudioConfig,
} from '@bmsce/contracts';
import { prisma } from '../../config/prisma.js';
import { config } from '../../config/env.js';
import { setJobStatus } from '../../config/redis.js';
import { requireAuth } from '../../middleware/auth.js';

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

const DAY_CODE_TO_NUMBER: Record<string, number> = {
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
  SUN: 7,
};

const PUBLISHER_ROLES = new Set(['HOD', 'DEPT_HEAD', 'ADMIN', 'DEAN', 'PLATFORM_ADMIN']);
const PUBLISH_TRANSACTION_MAX_ATTEMPTS = 3;

function requirePublishAuthority(req: Request, res: Response, next: NextFunction) {
  // requireAuth is deliberately registered first on this route. Keep this check
  // separate so an authenticated caller without a publishing role gets a 403.
  if (!PUBLISHER_ROLES.has(req.user!.role.toUpperCase())) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only HOD, Department Head, Dean, or Academic Administrator may publish optimization candidates.',
      },
    });
  }

  return next();
}

function isRetryablePublishConflict(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
      ? error.code
      : null;
  // P2002 is the timetable version unique-key collision; P2034 is Prisma's
  // serializable transaction write-conflict. In both cases the transaction has
  // rolled back and it is safe to re-read the current version chain.
  return code === 'P2002' || code === 'P2034';
}

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

  return {
    term,
    payload,
    meta: {
      effectiveDeptId: effectiveDeptId ?? null,
      offeringBySectionSubject: new Map(
        offerings.map((o) => [
          `${o.sectionId}:${o.subjectId}`,
          {
            id: o.id,
            requiresLab: o.requiresLab || o.subject.subjectType === 'LAB',
          },
        ])
      ),
      validFacultyIds: new Set(facultyIds),
      validRoomIds: new Set(eligibleRooms.map((r) => r.id)),
      classPeriods: classPeriods.map((p) => ({
        periodNumber: p.periodNumber,
        startTime: p.startTime,
        endTime: p.endTime,
      })),
    },
  };
}

const optimizerAssignedSlotSchema = z.object({
  section_id: z.string().min(1),
  subject_id: z.string().min(1),
  faculty_id: z.string().min(1),
  room_id: z.string().min(1),
  day: z.string().min(1),
  period: z.number().int().min(1),
  is_lab: z.boolean().optional().default(false),
});

const optimizerCandidatePayloadSchema = z.object({
  label: z.string().optional(),
  solver: z.string().optional(),
  solver_status: z.string().optional(),
  hard_violations: z.number().int().min(0).optional(),
  objective_score: z.number().optional(),
  metrics: z.record(z.unknown()).optional(),
  slots: z.array(optimizerAssignedSlotSchema),
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

    let built: Awaited<ReturnType<typeof buildOptimizerPayloadFromDb>>;
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

      const formatFallbackPeriod = (periodNum: number) => {
        const startHour = 8 + (periodNum - 1);
        const endHour = startHour + 1;
        const pad = (h: number) => `${String(h).padStart(2, '0')}:30`;
        return { startTime: pad(startHour), endTime: pad(endHour) };
      };

      // Validate and map every candidate's scheduled slots BEFORE persisting anything
      const mappedCandidates: Array<{
        candidateNumber: number;
        label: string;
        solverStatus: string;
        isFeasible: boolean;
        hardViolationCount: number;
        softPenalty: number;
        qualityScore: number;
        unscheduledSessionCount: number;
        metrics: string;
        explanation: string;
        sessions: Array<{
          subjectOfferingId: string;
          facultyId: string;
          roomId: string;
          sectionId: string;
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          durationPeriods: number;
          sessionKind: string;
        }>;
      }> =[];

    for (let i = 0; i < optimizerResult.candidates.length; i++) {
      const c = optimizerResult.candidates[i];
      if (!c.slots || c.slots.length === 0) {
        const failedRun = await prisma.optimizationRun.create({
          data: {
            academicTermId: built.term.id,
            requestedById: user.id,
            algorithmCode: engine,
            timeLimitSeconds: timeLimit,
            status: 'FAILED',
            solverStatus: 'INVALID_RESPONSE',
            failureCode: 'OPTIMIZER_EMPTY_SLOTS',
            failureMessage: `Candidate ${i + 1} returned zero scheduled slots.`,
            startedAt: new Date(startTime),
            completedAt: new Date(),
            runtimeMs: BigInt(runtimeMs),
          },
        });
        return res.status(502).json({
          error: {
            code: 'OPTIMIZER_EMPTY_SLOTS',
            message: `Optimizer candidate ${i + 1} returned zero scheduled slots.`,
            runId: failedRun.id,
          },
        });
      }

      const mappedSessions: (typeof mappedCandidates)[number]['sessions'] = [];
      for (const slot of c.slots) {
        const dayOfWeek = DAY_CODE_TO_NUMBER[slot.day.toUpperCase()];
        const offering = built.meta.offeringBySectionSubject.get(`${slot.section_id}:${slot.subject_id}`);
        const validFaculty = built.meta.validFacultyIds.has(slot.faculty_id);
        const validRoom = built.meta.validRoomIds.has(slot.room_id);
        const validPeriod = slot.period >= 1 && slot.period <= built.payload.periods_per_day;

        if (!dayOfWeek || !offering || !validFaculty || !validRoom || !validPeriod) {
          const failedRun = await prisma.optimizationRun.create({
            data: {
              academicTermId: built.term.id,
              requestedById: user.id,
              algorithmCode: engine,
              timeLimitSeconds: timeLimit,
              status: 'FAILED',
              solverStatus: 'INVALID_RESPONSE',
              failureCode: 'OPTIMIZER_INVALID_SLOT',
              failureMessage: `Candidate ${i + 1} returned an invalid slot reference (section=${slot.section_id}, subject=${slot.subject_id}, faculty=${slot.faculty_id}, room=${slot.room_id}, day=${slot.day}, period=${slot.period}).`,
              startedAt: new Date(startTime),
              completedAt: new Date(),
              runtimeMs: BigInt(runtimeMs),
            },
          });
          return res.status(502).json({
            error: {
              code: 'OPTIMIZER_INVALID_SLOT',
              message: 'Optimizer response contained invalid entity or slot references.',
              runId: failedRun.id,
            },
          });
        }

        const periodObj = built.meta.classPeriods[slot.period - 1];
        const times = periodObj
          ? { startTime: periodObj.startTime, endTime: periodObj.endTime }
          : formatFallbackPeriod(slot.period);

        mappedSessions.push({
          subjectOfferingId: offering.id,
          facultyId: slot.faculty_id,
          roomId: slot.room_id,
          sectionId: slot.section_id,
          dayOfWeek,
          startTime: times.startTime,
          endTime: times.endTime,
          durationPeriods: 1,
          sessionKind: slot.is_lab || offering.requiresLab ? 'LAB' : 'LECTURE',
        });
      }

      const rawUnscheduled =
        typeof c.metrics?.unscheduled_sessions === 'number' ? c.metrics.unscheduled_sessions : 0;

      mappedCandidates.push({
        candidateNumber: i + 1,
        label: c.label || `Candidate ${String.fromCharCode(65 + i)} (${c.solver || engine})`,
        solverStatus: c.solver_status || 'OPTIMAL',
        isFeasible: (c.hard_violations ?? 0) === 0,
        hardViolationCount: c.hard_violations ?? 0,
        softPenalty: c.objective_score ?? 0,
        qualityScore: Math.max(0, 100 - (c.objective_score ?? 0)),
        unscheduledSessionCount: rawUnscheduled,
        metrics: JSON.stringify(c.metrics || {}),
        explanation: `Generated via ${c.solver || engine} engine. ${mappedSessions.length} scheduled contact periods.`,
        sessions: mappedSessions,
      });
    }

    // Persist run + candidates + candidate sessions atomically
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
            departmentId: built.meta.effectiveDeptId,
            programId: programId ?? null,
            semesters: semesters ?? [],
            sections: built.payload.sections.length,
            subjects: built.payload.subjects.length,
            faculty: built.payload.faculty.length,
            rooms: built.payload.rooms.length,
          }),
        },
      });

      for (const mc of mappedCandidates) {
        const createdCandidate = await tx.optimizationCandidate.create({
          data: {
            optimizationRunId: createdRun.id,
            candidateNumber: mc.candidateNumber,
            label: mc.label,
            solverStatus: mc.solverStatus,
            isFeasible: mc.isFeasible,
            hardViolationCount: mc.hardViolationCount,
            softPenalty: mc.softPenalty,
            qualityScore: mc.qualityScore,
            unscheduledSessionCount: mc.unscheduledSessionCount,
            metrics: mc.metrics,
            explanation: mc.explanation,
          },
        });

        await tx.candidateSession.createMany({
          data: mc.sessions.map((s) => ({
            optimizationCandidateId: createdCandidate.id,
            subjectOfferingId: s.subjectOfferingId,
            facultyId: s.facultyId,
            roomId: s.roomId,
            sectionId: s.sectionId,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            durationPeriods: s.durationPeriods,
            sessionKind: s.sessionKind,
          })),
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

          // Real DB-backed candidate comparison (TASK-502)
          solverRouter.get('/candidates/compare', async (req: Request, res: Response, next: NextFunction) => {
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
              const runId =
                typeof req.query.runId === 'string' && req.query.runId.trim()
                  ? req.query.runId.trim()
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
                : academicTerms.find((t) => t.status === 'ACTIVE') ?? academicTerms[0] ?? null;

              if (academicTermId && !selectedTerm) {
                return res.status(404).json({
                  error: { code: 'ACADEMIC_TERM_NOT_FOUND', message: `Academic term '${academicTermId}' was not found.` },
                });
              }

              const effectiveDeptId = departmentId ?? selectedProg?.departmentId ?? null;
              const effectiveTermId = selectedTerm?.id ?? null;

              // Fetch available completed runs matching the requested scope
              const runScopeWhere: any = {
                status: 'COMPLETED',
                algorithmCode: { not: 'DEMO_SIMULATED' },
                ...(effectiveTermId ? { academicTermId: effectiveTermId } : {}),
                ...(effectiveDeptId || programId
                  ? {
                    candidates: {
                      some: {
                        sessions: {
                          some: {
                            section: {
                              ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
                              ...(programId ? { programId } : {}),
                            },
                          },
                        },
                      },
                    },
                  }
                  : {}),
              };

              const availableRuns = await prisma.optimizationRun.findMany({
                where: runScopeWhere,
                orderBy: { createdAt: 'desc' },
                take: 15,
                include: {
                  _count: { select: { candidates: true } },
                },
              });

              let targetRun:
                | (Awaited<ReturnType<typeof prisma.optimizationRun.findUnique>> & {
                  academicTerm: { academicYearLabel: string; termLabel: string };
                })
                | null = null;

              if (runId) {
                const foundRun = await prisma.optimizationRun.findUnique({
                  where: { id: runId },
                  include: { academicTerm: true },
                });
                if (!foundRun) {
                  return res.status(404).json({
                    error: { code: 'RUN_NOT_FOUND', message: `Optimization run '${runId}' was not found.` },
                  });
                }
                if (foundRun.status !== 'COMPLETED' || foundRun.algorithmCode === 'DEMO_SIMULATED') {
                  return res.status(400).json({
                    error: {
                      code: 'INVALID_RUN_STATUS',
                      message: `Optimization run '${runId}' is not a completed real optimization run (status=${foundRun.status}).`,
                    },
                  });
                }
                if (academicTermId && foundRun.academicTermId !== academicTermId) {
                  return res.status(404).json({
                    error: {
                      code: 'RUN_SCOPE_MISMATCH',
                      message: `Optimization run '${runId}' does not belong to academic term '${academicTermId}'.`,
                    },
                  });
                }
                targetRun = foundRun;
              } else if (availableRuns.length > 0) {
                targetRun = await prisma.optimizationRun.findUnique({
                  where: { id: availableRuns[0].id },
                  include: { academicTerm: true },
                });
              }

              const effectiveDeptForLabel =
                selectedDept ??
                (effectiveDeptId ? departments.find((d) => d.id === effectiveDeptId) ?? null : null);

              const scopeLabel = {
                department: effectiveDeptForLabel ? `${effectiveDeptForLabel.name} (${effectiveDeptForLabel.code})` : 'All Departments',
                program: selectedProg ? `${selectedProg.name} (${selectedProg.code})` : 'All Programs',
                academicTerm: selectedTerm ? `${selectedTerm.academicYearLabel} (${selectedTerm.termLabel})` : 'No Academic Term',
              };

              const availableFilters = {
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
                runs: availableRuns.map((r) => ({
                  id: r.id,
                  algorithmCode: r.algorithmCode,
                  solverStatus: r.solverStatus ?? null,
                  createdAt: r.createdAt.toISOString(),
                  candidateCount: r._count.candidates,
                })),
              };

              if (!targetRun) {
                const emptyPayload: CandidateComparisonResponse = {
                  hasData: false,
                  scopeLabel,
                  appliedFilters: {
                    departmentId,
                    programId,
                    academicTermId: effectiveTermId,
                    runId: null,
                  },
                  availableFilters,
                  run: null,
                  candidates: [],
                };
                return res.json({ data: emptyPayload });
              }

              const dbCandidates = await prisma.optimizationCandidate.findMany({
                where: { optimizationRunId: targetRun.id },
                orderBy: { candidateNumber: 'asc' },
                include: {
                  sessions: {
                    include: {
                      subjectOffering: { include: { subject: true } },
                      section: true,
                      faculty: { include: { user: true } },
                      room: true,
                    },
                    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
                  },
                },
              });

              const candidateIds = dbCandidates.map((c) => c.id);
              const publishedVersions = candidateIds.length
                ? await prisma.timetableVersion.findMany({
                  where: { optimizationCandidateId: { in: candidateIds } },
                  orderBy: { versionNumber: 'desc' },
                })
                : [];
              const publishedByCandidateId = new Map<string, { id: string; versionNumber: number }>();
              for (const pv of publishedVersions) {
                if (pv.optimizationCandidateId && !publishedByCandidateId.has(pv.optimizationCandidateId)) {
                  publishedByCandidateId.set(pv.optimizationCandidateId, {
                    id: pv.id,
                    versionNumber: pv.versionNumber,
                  });
                }
              }

              const candidatesPayload: CandidateComparisonResponse['candidates'] = dbCandidates.map((cand) => {
                let parsedMetrics: Record<string, unknown> = {};
                try {
                  parsedMetrics = JSON.parse(cand.metrics || '{}');
                } catch {
                  parsedMetrics = {};
                }

                const sectionMap = new Map<
                  string,
                  {
                    sectionId: string;
                    sectionCode: string;
                    semesterNumber: number;
                    sessionCount: number;
                    labSessionCount: number;
                    totalPeriods: number;
                  }
                >();

                for (const s of cand.sessions) {
                  const existing = sectionMap.get(s.sectionId) || {
                    sectionId: s.sectionId,
                    sectionCode: s.section.sectionCode,
                    semesterNumber: s.section.semesterNumber,
                    sessionCount: 0,
                    labSessionCount: 0,
                    totalPeriods: 0,
                  };
                  existing.sessionCount += 1;
                  if (s.sessionKind === 'LAB') existing.labSessionCount += 1;
                  existing.totalPeriods += s.durationPeriods || 1;
                  sectionMap.set(s.sectionId, existing);
                }

                const sortedSessions = [...cand.sessions].sort((a, b) => {
                  const secCmp = a.section.sectionCode.localeCompare(b.section.sectionCode);
                  if (secCmp !== 0) return secCmp;
                  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                  return a.startTime.localeCompare(b.startTime);
                });

                const pubInfo = publishedByCandidateId.get(cand.id) ?? null;

                return {
                  id: cand.id,
                  optimizationRunId: cand.optimizationRunId,
                  candidateNumber: cand.candidateNumber,
                  label: cand.label,
                  solverStatus: cand.solverStatus,
                  isFeasible: cand.isFeasible,
                  hardViolationCount: cand.hardViolationCount,
                  softPenalty: cand.softPenalty ?? null,
                  qualityScore: cand.qualityScore ?? null,
                  unscheduledSessionCount: cand.unscheduledSessionCount,
                  sessionCount: cand.sessions.length,
                  metrics: parsedMetrics,
                  explanation: cand.explanation ?? null,
                  isPublished: Boolean(pubInfo),
                  publishedVersionId: pubInfo?.id ?? null,
                  publishedVersionNumber: pubInfo?.versionNumber ?? null,
                  sectionSummaries: Array.from(sectionMap.values()).sort((a, b) =>
                    a.sectionCode.localeCompare(b.sectionCode)
                  ),
                  sessionsPreview: sortedSessions.slice(0, 60).map((s) => ({
                    id: s.id,
                    subjectOfferingId: s.subjectOfferingId,
                    subjectCode: s.subjectOffering.subject.subjectCode,
                    subjectName: s.subjectOffering.subject.name,
                    sectionId: s.sectionId,
                    sectionCode: s.section.sectionCode,
                    facultyId: s.facultyId,
                    facultyName: s.faculty.user.displayName,
                    roomId: s.roomId,
                    roomCode: s.room.roomCode,
                    dayOfWeek: s.dayOfWeek,
                    dayCode: DAY_NUMBER_TO_CODE[s.dayOfWeek] || `D${s.dayOfWeek}`,
                    startTime: s.startTime,
                    endTime: s.endTime,
                    durationPeriods: s.durationPeriods,
                    sessionKind: s.sessionKind,
                    batchId: s.batchId ?? null,
                  })),
                };
              });

              const responsePayload: CandidateComparisonResponse = {
                hasData: candidatesPayload.length > 0,
                scopeLabel,
                appliedFilters: {
                  departmentId,
                  programId,
                  academicTermId: targetRun.academicTermId,
                  runId: targetRun.id,
                },
                availableFilters,
                run: {
                  id: targetRun.id,
                  algorithmCode: targetRun.algorithmCode,
                  status: targetRun.status,
                  solverStatus: targetRun.solverStatus ?? null,
                  runtimeMs: targetRun.runtimeMs !== null ? Number(targetRun.runtimeMs) : null,
                  createdAt: targetRun.createdAt.toISOString(),
                  completedAt: targetRun.completedAt ? targetRun.completedAt.toISOString() : null,
                  academicTermLabel: `${targetRun.academicTerm.academicYearLabel} (${targetRun.academicTerm.termLabel})`,
                },
                candidates: candidatesPayload,
              };

              return res.json({ data: responsePayload });
            } catch (err) {
              return next(err);
            }
          });

          // Publish a validated OptimizationCandidate to a non-destructive TimetableVersion (TASK-502)
          solverRouter.post('/publish', requireAuth, requirePublishAuthority, async (req: Request, res: Response, next: NextFunction) => {
            try {
    const parsed = PublishCandidateRequestSchema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid publish request payload.',
      details: parsed.error.flatten(),
    },
  });
}

const { candidateId, departmentId, programId, academicTermId, publicationNote } = parsed.data;

const candidate = await prisma.optimizationCandidate.findUnique({
  where: { id: candidateId },
  include: {
    optimizationRun: {
      include: { academicTerm: true },
    },
    sessions: {
      include: {
        section: true,
        batch: true,
        faculty: true,
        room: true,
        subjectOffering: {
          include: {
            subject: true,
            facultyAssignments: { where: { status: 'ACTIVE' } },
          },
        },
      },
    },
  },
    });

if (!candidate) {
  return res.status(404).json({
    error: { code: 'CANDIDATE_NOT_FOUND', message: `Optimization candidate '${candidateId}' was not found.` },
  });
}

if (
  candidate.optimizationRun.status !== 'COMPLETED' ||
  candidate.optimizationRun.algorithmCode === 'DEMO_SIMULATED'
) {
  return res.status(400).json({
    error: {
      code: 'INVALID_CANDIDATE_RUN',
      message: `Candidate '${candidateId}' belongs to a non-completed or demo run (status=${candidate.optimizationRun.status}).`,
    },
      });
    }

if (
  !candidate.isFeasible ||
  candidate.hardViolationCount > 0 ||
  candidate.unscheduledSessionCount > 0
) {
  return res.status(400).json({
    error: {
      code: 'INFEASIBLE_CANDIDATE',
      message: `Candidate '${candidate.label}' is not fully feasible and cannot be published.`,
    },
  });
}

if (candidate.sessions.length === 0) {
  return res.status(400).json({
    error: {
      code: 'INCOMPLETE_CANDIDATE_SCHEDULE',
      message: `Candidate '${candidate.label}' has zero persisted sessions and cannot be published.`,
    },
  });
}

const invalidSession = candidate.sessions.find((session) => {
  const hasValidTime =
    /^([01]\d|2[0-3]):[0-5]\d$/.test(session.startTime) &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(session.endTime) &&
    session.startTime < session.endTime;
  const facultyIsAssigned = session.subjectOffering.facultyAssignments.some(
    (assignment) => assignment.facultyId === session.facultyId
  );

  return (
    session.dayOfWeek < 1 ||
    session.dayOfWeek > 6 ||
    session.durationPeriods < 1 ||
    !hasValidTime ||
    session.subjectOffering.sectionId !== session.sectionId ||
    session.subjectOffering.academicTermId !== candidate.optimizationRun.academicTermId ||
    (session.batch !== null && session.batch.sectionId !== session.sectionId) ||
    !session.subjectOffering.subject.isActive ||
    session.section.status !== 'ACTIVE' ||
    session.faculty.status !== 'ACTIVE' ||
    !session.room.isActive ||
    !facultyIsAssigned
  );
});

if (invalidSession) {
  return res.status(400).json({
    error: {
      code: 'INVALID_CANDIDATE_SESSION',
      message: `Candidate '${candidate.label}' contains an invalid or stale persisted session and cannot be published.`,
      details: { candidateSessionId: invalidSession.id },
    },
  });
}

// Verify academic scope
if (academicTermId && candidate.optimizationRun.academicTermId !== academicTermId) {
  return res.status(400).json({
    error: {
      code: 'SCOPE_MISMATCH',
      message: `Candidate belongs to academic term '${candidate.optimizationRun.academicTermId}', not '${academicTermId}'.`,
    },
  });
}

const candidateDeptIds = Array.from(new Set(candidate.sessions.map((s) => s.section.departmentId)));
if (departmentId) {
  const dept = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!dept) {
    return res.status(404).json({
      error: { code: 'DEPARTMENT_NOT_FOUND', message: `Department '${departmentId}' was not found.` },
    });
  }
  if (!candidateDeptIds.includes(departmentId)) {
    return res.status(400).json({
      error: {
        code: 'SCOPE_MISMATCH',
        message: `Candidate sessions do not belong to department '${departmentId}'.`,
      },
    });
  }
}

if (programId) {
  const prog = await prisma.program.findUnique({ where: { id: programId } });
  if (!prog) {
    return res.status(404).json({
      error: { code: 'PROGRAM_NOT_FOUND', message: `Program '${programId}' was not found.` },
    });
  }
  const candidateProgIds = candidate.sessions
    .map((s) => s.section.programId)
    .filter((pid): pid is string => Boolean(pid));
  if (!candidateProgIds.includes(programId)) {
    return res.status(400).json({
      error: {
        code: 'SCOPE_MISMATCH',
        message: `Candidate sessions do not belong to program '${programId}'.`,
      },
    });
  }
}

const targetDepartmentId = departmentId ?? candidateDeptIds[0];

// Prevent duplicate publish of the same candidate
const existingForCandidate = await prisma.timetableVersion.findFirst({
  where: { optimizationCandidateId: candidate.id },
});
if (existingForCandidate) {
  return res.status(409).json({
    error: {
      code: 'CANDIDATE_ALREADY_PUBLISHED',
      message: `Candidate '${candidate.label}' has already been published as TimetableVersion v${existingForCandidate.versionNumber}.`,
      details: {
        timetableVersionId: existingForCandidate.id,
        versionNumber: existingForCandidate.versionNumber,
      },
    },
  });
}

const actorUserId = req.user!.userId;
const authenticatedActor = await prisma.user.findUnique({ where: { id: actorUserId }, select: { id: true } });
if (!authenticatedActor) {
  return res.status(401).json({
    error: { code: 'AUTHENTICATED_ACTOR_NOT_FOUND', message: 'Authenticated user is no longer available.' },
  });
}

const now = new Date();
const publishOnce = () => prisma.$transaction(async (tx) => {
  // Re-check inside transaction to guard against concurrent duplicate publish
  const raceCheck = await tx.timetableVersion.findFirst({
    where: { optimizationCandidateId: candidate.id },
  });
  if (raceCheck) {
    throw new SolverPayloadError(
      409,
      'CANDIDATE_ALREADY_PUBLISHED',
      `Candidate '${candidate.label}' was already published as TimetableVersion v${raceCheck.versionNumber}.`
    );
  }

  let timetable = await tx.timetable.findFirst({
    where: {
      academicTermId: candidate.optimizationRun.academicTermId,
      departmentId: targetDepartmentId,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
  });

  if (!timetable) {
    timetable = await tx.timetable.create({
      data: {
        academicTermId: candidate.optimizationRun.academicTermId,
        departmentId: targetDepartmentId,
        name: `${candidate.optimizationRun.academicTerm.academicYearLabel} ${candidate.optimizationRun.academicTerm.termLabel} Timetable`,
        scopeType: 'DEPARTMENT',
        status: 'ACTIVE',
        createdById: actorUserId,
      },
    });
  }

  // Preserve version history: never overwrite existing published versions
  const latestVersion = await tx.timetableVersion.findFirst({
    where: { timetableId: timetable.id },
    orderBy: { versionNumber: 'desc' },
  });
  const latestPublished = await tx.timetableVersion.findFirst({
    where: { timetableId: timetable.id, status: 'PUBLISHED' },
    orderBy: { versionNumber: 'desc' },
  });

  const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;
  const summaryText =
    publicationNote?.trim() ||
    `Published ${candidate.label} (${candidate.sessions.length} sessions) from OptimizationRun ${candidate.optimizationRunId}.`;

  const version = await tx.timetableVersion.create({
    data: {
      timetableId: timetable.id,
      versionNumber: nextVersionNumber,
      status: 'PUBLISHED',
      sourceType: 'OPTIMIZER',
      optimizationCandidateId: candidate.id,
      validationStatus: 'PASSED',
      hardViolationCount: candidate.hardViolationCount,
      softPenalty: candidate.softPenalty ?? null,
      createdById: actorUserId,
      approvedById: actorUserId,
      publishedById: actorUserId,
      approvedAt: now,
      publishedAt: now,
      supersedesVersionId: latestPublished?.id ?? null,
      changeSummary: summaryText,
    },
  });

  await tx.timetableSession.createMany({
    data: candidate.sessions.map((s) => ({
      timetableVersionId: version.id,
      subjectOfferingId: s.subjectOfferingId,
      facultyId: s.facultyId,
      roomId: s.roomId,
      sectionId: s.sectionId,
      batchId: s.batchId ?? null,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      durationPeriods: s.durationPeriods,
      sessionKind: s.sessionKind,
      groupKey: s.groupKey ?? null,
    })),
  });

  await tx.timetablePublication.create({
    data: {
      timetableVersionId: version.id,
      publishedById: actorUserId,
      publishedAt: now,
      publicationNote: publicationNote?.trim() || null,
    },
  });

  const auditLog = await tx.auditLog.create({
    data: {
      actorUserId,
      action: 'PUBLISH_OPTIMIZATION_CANDIDATE',
      resourceType: 'TIMETABLE_VERSION',
      resourceId: version.id,
      scope: JSON.stringify({
        academicTermId: candidate.optimizationRun.academicTermId,
        departmentId: targetDepartmentId,
        programId: programId ?? null,
        optimizationRunId: candidate.optimizationRunId,
        optimizationCandidateId: candidate.id,
      }),
      beforeState: latestPublished
        ? JSON.stringify({
          previousPublishedVersionId: latestPublished.id,
          previousVersionNumber: latestPublished.versionNumber,
        })
        : null,
      afterState: JSON.stringify({
        timetableId: timetable.id,
        timetableVersionId: version.id,
        versionNumber: version.versionNumber,
        sessionsPublished: candidate.sessions.length,
        supersedesVersionId: latestPublished?.id ?? null,
      }),
    },
  });

  return {
    timetable,
    version,
    auditLog,
    sessionsPublished: candidate.sessions.length,
    publicationNote: publicationNote?.trim() || null,
  };
}, { isolationLevel: 'Serializable' });

let published: Awaited<ReturnType<typeof publishOnce>> | undefined;
for (let attempt = 1; attempt <= PUBLISH_TRANSACTION_MAX_ATTEMPTS; attempt += 1) {
  try {
    published = await publishOnce();
    break;
  } catch (error) {
    if (!isRetryablePublishConflict(error)) {
      throw error;
    }

    // A failed transaction never writes partial timetable data. Re-checking on
    // the next attempt gives concurrent requests the already-published result
    // (same candidate) or the next version in the preserved version chain.
    if (attempt === PUBLISH_TRANSACTION_MAX_ATTEMPTS) {
      throw new SolverPayloadError(
        409,
        'PUBLISH_CONFLICT',
        'A concurrent timetable publication could not be resolved. Please retry the request.'
      );
    }
  }
}

if (!published) {
  throw new SolverPayloadError(500, 'PUBLISH_FAILED', 'Timetable publication did not complete.');
}

const responsePayload: PublishCandidateResponse = {
  timetableId: published.timetable.id,
  timetableVersionId: published.version.id,
  versionNumber: published.version.versionNumber,
  status: published.version.status,
  sourceType: published.version.sourceType,
  optimizationCandidateId: candidate.id,
  supersedesVersionId: published.version.supersedesVersionId ?? null,
  sessionsPublished: published.sessionsPublished,
  publishedAt: (published.version.publishedAt ?? now).toISOString(),
  publicationNote: published.publicationNote,
  auditLogId: published.auditLog.id,
};

return res.status(201).json({ data: responsePayload });
  } catch (err) {
  if (err instanceof SolverPayloadError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  return next(err);
}
});

