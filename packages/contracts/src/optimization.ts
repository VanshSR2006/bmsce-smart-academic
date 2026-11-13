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

