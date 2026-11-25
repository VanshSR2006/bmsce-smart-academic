import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';
import { setJobStatus } from '../../config/redis.js';

const OPTIMIZER_URL = process.env.OPTIMIZER_URL || 'http://localhost:8000';

const solverRunSchema = z.object({
  engine: z.enum(['CONSTRAINT_CSP', 'HYBRID_MIP', 'SIMULATED_ANNEALING', 'GREEDY_BASELINE']).optional(),
  academicTermId: z.string().optional(),
  departmentId: z.string().optional(),
  sectionIds: z.array(z.string()).optional(),
  semesters: z.array(z.number().int().min(1).max(8)).optional(),
  timeLimit: z.number().int().min(5).max(300).optional(),
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
        ...(scope.departmentId ? { departmentId: scope.departmentId } : {}),
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

/** Call the Python optimizer service. Returns null if unavailable (fallback to mock). */
async function callOptimizer(payload: object): Promise<object | null> {
  try {
    const res = await fetch(`${OPTIMIZER_URL}/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60000), // 60s timeout
    });
    if (!res.ok) {
      console.warn(`[Solver] Optimizer returned ${res.status} — falling back to mock`);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[Solver] Optimizer unavailable (${err.message}) — using mock data`);
    return null;
  }
}

export const solverRouter = Router();

// Solver Studio metadata and constraints configuration
solverRouter.get('/studio-config', async (req: Request, res: Response) => {
  return res.json({
    data: {
      title: 'Timetable Solver Studio • Constraint Engine',
      scheme: 'Autonomous Scheme 2024–25 (Odd Semester)',
      department: 'Department of Computer Science & Engineering • B.M.S. College of Engineering',
      metrics: {
        searchSpaceSlots: '2.41 × 10⁴ slots',
        definedRulesCount: '19 Strict & Soft',
        targetCohortsCount: '16 Sections',
      },
      hardConstraints: [
        {
          code: 'C-HARD-01',
          name: 'Zero Faculty Overlaps',
          description: 'A faculty instructor cannot be committed to two overlapping cohorts, laboratories, or elective tracks across any department simultaneously.',
          status: 'Validated: 58 CSE Faculty Registry',
          isStrict: true,
        },
        {
          code: 'C-HARD-02',
          name: 'Zero Physical Room Collisions',
          description: 'Physical classrooms, smart amphitheaters, and workstations host strictly at most one session during any discrete 55-minute slot.',
          status: 'Verified: 21 Lecture Halls & 12 Specialized Computing Labs',
          isStrict: true,
        },
        {
          code: 'C-HARD-03',
          name: 'Continuous Laboratory Integrity (3-Period Slot)',
          description: 'Practical laboratory modules (e.g. Operating Systems, Computer Networks) must strictly allocate uninterrupted 3-hour contiguous periods without split breaks.',
          status: 'NEP 2022 Mandate (Clause 4.3 – Lab Block Formats)',
          isStrict: true,
        },
        {
          code: 'C-HARD-04',
          name: 'Maximum Daily Faculty Contact Cap',
          description: 'Institutional maximum workload policy: strict barrier of no more than 4 formal instruction hours per professor per working day.',
          status: 'AICTE Workload Regulatory Threshold',
          isStrict: true,
        },
        {
          code: 'C-HARD-05',
          name: 'Institutional Rest Recesses & Lunch Curfew',
          description: 'Tea interval (10:30–10:45 AM) and institutional lunch window (12:45–01:45 PM) are locked. Zero instructional assignments permitted college-wide.',
          status: 'Institutional Curfew Active',
          isStrict: true,
        },
      ],
      softTargets: [
        {
          key: 'IDLE_GAPS',
          name: 'Minimize Student Idle Gap Windows',
          description: 'Avoid scattered schedules where cohorts endure 1-hour voids between theoretical blocks.',
          weight: 95,
          priority: 'High Priority',
          targetFitness: 95,
        },
        {
          key: 'LECTURE_BARRIER',
          name: 'Continuous Faculty Lecture Barrier (Max 2h)',
          description: 'Penalize back-to-back theoretical lectures spanning beyond 110 minutes for any single instructor.',
          weight: 82,
          priority: 'High Priority',
          targetFitness: 90,
        },
        {
          key: 'ROOM_ANCHOR',
          name: 'Cohort Room Anchor (Home Base)',
          description: 'Retain designated lecture halls (e.g. 5th Sem Sec A anchored to PJ-302) to minimize inter-floor migration.',
          weight: 92,
          priority: 'High Priority',
          targetFitness: 92,
        },
        {
          key: 'SUBJECT_SPREAD',
          name: 'Equitable Weekly Subject Spread',
          description: 'Avoid delivering 2 distinct theoretical sessions of the identical course code on the same calendar day.',
          weight: 78,
          priority: 'Medium Priority',
          targetFitness: 85,
        },
      ],
      engineStrategies: [
        { id: 'GREEDY_BASELINE', label: 'Greedy Baseline', note: 'Fast ~4s • Quick visibility test' },
        { id: 'CONSTRAINT_CSP', label: 'Constraint CSP (OR-Tools)', note: 'Balanced ~12s • Recommended mode' },
        { id: 'DEEP_GENETIC', label: 'Deep Genetic', note: 'Exhaustive ~3m • Global optima search' },
      ],
      targetSemesters: [
        { sem: 1, label: 'Sem 1', checked: true },
        { sem: 3, label: 'Sem 3', checked: true },
        { sem: 5, label: 'Sem 5', checked: true },
        { sem: 7, label: 'Sem 7', checked: true },
      ],
      preExecutionAudit: {
        passed: true,
        summary: 'All 58 professors have non-negative hour capacities, room seating limits match section counts, and NEP laboratory contact blocks are balanced.',
      },
    },
  });
});

// Trigger solver execution
solverRouter.post('/run', async (req: Request, res: Response) => {
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

  const { engine = 'CONSTRAINT_CSP', academicTermId, departmentId, sectionIds, semesters, timeLimit = 30 } =
    parseResult.data;
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

  // Call the real Python optimizer service
  const optimizerResult: any = await callOptimizer(built.payload);
  const runtimeMs = Date.now() - startTime;

  if (!optimizerResult || !Array.isArray(optimizerResult.candidates) || optimizerResult.candidates.length === 0) {
    const failedRun = await prisma.optimizationRun.create({
      data: {
        academicTermId: built.term.id,
        requestedById: user.id,
        algorithmCode: engine,
        timeLimitSeconds: timeLimit,
        status: 'FAILED',
        solverStatus: 'UNAVAILABLE',
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

    return res.status(503).json({
      error: {
        code: 'OPTIMIZER_UNAVAILABLE',
        message: 'Optimizer service is unavailable or returned no candidates. No timetable candidate was persisted.',
        runId: failedRun.id,
      },
    });
  }

  const solverStatus = optimizerResult.feasible ? 'OPTIMAL' : 'FEASIBLE';
  const candidateCount = optimizerResult.candidates.length;

  // Persist run
  const run = await prisma.optimizationRun.create({
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
    await prisma.optimizationCandidate.create({
      data: {
        optimizationRunId: run.id,
        candidateNumber: i + 1,
        label: c.label || `Candidate ${String.fromCharCode(65 + i)} (${c.solver})`,
        solverStatus: c.solver_status || 'OPTIMAL',
        isFeasible: c.hard_violations === 0,
        hardViolationCount: c.hard_violations || 0,
        softPenalty: c.objective_score || 0,
        qualityScore: Math.max(0, 100 - (c.objective_score || 0)),
        metrics: JSON.stringify(c.metrics || {}),
        explanation: `Generated via ${c.solver} engine. ${c.slots?.length || 0} scheduled contact periods.`,
      },
    });
  }

  return res.json({
    data: {
      runId: run.id,
      status: 'COMPLETED',
      solverStatus,
      runtimeMs,
      candidatesGenerated: candidateCount,
      candidates: optimizerResult.candidates,
      source: 'OR_TOOLS_PYTHON_SERVICE',
    },
  });
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

