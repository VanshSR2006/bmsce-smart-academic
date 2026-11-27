import { z } from 'zod';
import { OptimizationStatusEnum, SolverStatusEnum } from './enums.js';

export const HardConstraintCodeEnum = z.enum([
  'ZERO_FACULTY_OVERLAP',
  'ZERO_ROOM_COLLISION',
  'LAB_CONTINUITY_3PERIOD',
  'MAX_DAILY_FACULTY_CAP',
  'REST_RECESS_AND_LUNCH',
  'SECTION_NON_OVERLAP',
]);

export const SoftObjectiveTargetSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string(),
  weight: z.number().min(0).max(100),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  targetFitnessPct: z.number().default(95),
  enabled: z.boolean().default(true),
});
export type SoftObjectiveTarget = z.infer<typeof SoftObjectiveTargetSchema>;

export const SolverExecutionSetupSchema = z.object({
  engineModel: z.enum(['GREEDY_BASELINE', 'CONSTRAINT_CSP', 'DEEP_GENETIC']),
  targetSemesters: z.array(z.number()),
  timeLimitSeconds: z.number().default(30),
  randomSeed: z.number().optional(),
  allowRelaxation: z.boolean().default(false),
  softTargets: z.array(SoftObjectiveTargetSchema).optional(),
});
export type SolverExecutionSetup = z.infer<typeof SolverExecutionSetupSchema>;

export const OptimizationCandidateSchema = z.object({
  id: z.string().uuid(),
  candidateNumber: z.number(),
  label: z.string(),
  algorithmCode: z.string(),
  solverStatus: SolverStatusEnum,
  isFeasible: z.boolean(),
  hardViolationCount: z.number(),
  softPenalty: z.number(),
  qualityScore: z.number(), // 0 to 100
  runtimeMs: z.number(),
  unscheduledSessionCount: z.number(),
  metrics: z.record(z.any()),
  explanation: z.record(z.any()).optional(),
});
export type OptimizationCandidate = z.infer<typeof OptimizationCandidateSchema>;

// Canonical /api/v1/solver/studio-config contract (TASK-501)
export const SolverStudioConfigSchema = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  scopeLabel: z.object({
    department: z.string(),
    program: z.string(),
    academicTerm: z.string(),
  }),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    programId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    programs: z.array(
      z.object({
        id: z.string(),
        departmentId: z.string(),
        code: z.string(),
        name: z.string(),
      })
    ),
    academicTerms: z.array(
      z.object({
        id: z.string(),
        academicYearLabel: z.string(),
        termLabel: z.string(),
        status: z.string(),
      })
    ),
    semesters: z.array(z.number().int()),
  }),
  scopeSummary: z.object({
    sectionsCount: z.number().int(),
    subjectOfferingsCount: z.number().int(),
    facultyCount: z.number().int(),
    roomsCount: z.number().int(),
    classPeriodsPerDay: z.number().int().nullable(),
    missingFacultyAssignmentsCount: z.number().int(),
  }),
  hardConstraints: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      description: z.string(),
      status: z.string(),
      isStrict: z.boolean(),
    })
  ),
  softTargets: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
      weight: z.number(),
      priority: z.string(),
    })
  ),
  engineStrategies: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      note: z.string(),
    })
  ),
  preExecutionAudit: z.object({
    passed: z.boolean(),
    summary: z.string(),
    issues: z.array(z.string()),
  }),
});
export type SolverStudioConfig = z.infer<typeof SolverStudioConfigSchema>;

export const SolverRunResultSchema = z.object({
  runId: z.string(),
  status: z.string(),
  solverStatus: z.string(),
  runtimeMs: z.number(),
  candidatesGenerated: z.number().int(),
  isDemoSimulated: z.boolean(),
  canPublish: z.boolean(),
  warning: z.string().optional(),
  source: z.string(),
});
export type SolverRunResult = z.infer<typeof SolverRunResultSchema>;

