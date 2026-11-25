import { z } from 'zod';
import { RepairStrategyEnum } from './enums.js';

export const RepairStrategyOptionSchema = z.object({
  id: z.string(),
  strategyType: RepairStrategyEnum,
  title: z.string(),
  subtitle: z.string(),
  description: z.string(),
  disruptionImpactScore: z.number(), // out of 100
  impactCategory: z.enum(['MINIMAL_RIPPLE', 'OPTIMAL_REPAIR', 'CONTAINED_RESCHEDULED', 'DEFICIT_INCURRED']),
  targetSlot: z.string(),
  venue: z.string(),
  replacement: z.string(),
  facultyAvailableText: z.string(),
  cohortMovementText: z.string(),
  curriculumSyncText: z.string(),
  badgeText: z.string().optional(),
  isSelected: z.boolean().default(false),
});
export type RepairStrategyOption = z.infer<typeof RepairStrategyOptionSchema>;

export const DisruptionIncidentSchema = z.object({
  id: z.string().uuid(),
  incidentCode: z.string(),
  category: z.string(),
  title: z.string(),
  reportedBy: z.string(),
  impactedSlot: z.string(),
  assignedVenue: z.string(),
  cohortScope: z.string(),
  curricularStatus: z.string(),
  preWarningBuffer: z.string(),
  strategies: z.array(RepairStrategyOptionSchema),
  scheduleDiff: z.object({
    original: z.array(z.object({
      slotLabel: z.string(),
      period: z.string(),
      courseTitle: z.string(),
      facultyName: z.string(),
      venue: z.string(),
      isDisrupted: z.boolean().default(false),
    })),
    repaired: z.array(z.object({
      slotLabel: z.string(),
      period: z.string(),
      courseTitle: z.string(),
      facultyName: z.string(),
      venue: z.string(),
      isChanged: z.boolean().default(false),
      changeType: z.string().optional(),
    })),
  }),
  constraintVerification: z.array(z.object({
    name: z.string(),
    description: z.string(),
    passed: z.boolean().default(true),
  })),
  impactDeltas: z.object({
    studentsAffectedCount: z.number(),
    sessionsShiftedCount: z.number(),
    roomVariancePct: z.number(),
    curricularDeviationPct: z.number(),
  }),
});
export type DisruptionIncident = z.infer<typeof DisruptionIncidentSchema>;

// Canonical /api/v1/repairs/active contract (TASK-101A)
export const ActiveRepairConstraintSchema = z.object({
  name: z.string(),
  pass: z.boolean(),
  detail: z.string().optional(),
});
export type ActiveRepairConstraint = z.infer<typeof ActiveRepairConstraintSchema>;

export const ActiveRepairDiffRowSchema = z.object({
  slot: z.string(),
  before: z.string(),
  after: z.string(),
});
export type ActiveRepairDiffRow = z.infer<typeof ActiveRepairDiffRowSchema>;

export const ActiveRepairImpactDeltaSchema = z.object({
  metric: z.string(),
  before: z.string(),
  after: z.string(),
  direction: z.enum(['up', 'down', 'same']),
});
export type ActiveRepairImpactDelta = z.infer<typeof ActiveRepairImpactDeltaSchema>;

export const ActiveRepairStrategySchema = z.object({
  id: z.string(),
  label: z.string(),
  optionLabel: z.string().optional(),
  badgeText: z.string().optional(),
  description: z.string(),
  disruption: z.number(),
  feasibility: z.number(),
  isRecommended: z.boolean().optional(),
  constraints: z.array(ActiveRepairConstraintSchema).default([]),
  diff: z.array(ActiveRepairDiffRowSchema).default([]),
  impactDelta: z.array(ActiveRepairImpactDeltaSchema).default([]),
});
export type ActiveRepairStrategy = z.infer<typeof ActiveRepairStrategySchema>;

export const ActiveRepairIncidentSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  type: z.string(),
  affectedFaculty: z.string(),
  affectedSections: z.array(z.string()).default([]),
  affectedSlots: z.array(z.string()).default([]),
  reason: z.string().optional(),
  reportedAt: z.string().optional(),
  severity: z.string().default('MEDIUM'),
});
export type ActiveRepairIncident = z.infer<typeof ActiveRepairIncidentSchema>;

export const ActiveRepairDataSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  isDemoData: z.boolean().optional(),
  incident: ActiveRepairIncidentSchema.nullable(),
  strategies: z.array(ActiveRepairStrategySchema).default([]),
});
export type ActiveRepairData = z.infer<typeof ActiveRepairDataSchema>;

// Canonical POST /api/v1/repairs/authorize contract (TASK-103)
export const RepairAuthorizationTypeEnum = z.enum(['DATED_EXCEPTION', 'MASTER_UPDATE']);
export type RepairAuthorizationType = z.infer<typeof RepairAuthorizationTypeEnum>;

export const RepairAuthorizeRequestSchema = z.object({
  incidentId: z.string().min(1),
  strategyId: z.string().min(1),
  authorizationType: RepairAuthorizationTypeEnum.default('DATED_EXCEPTION'),
  note: z.string().max(500).optional(),
});
export type RepairAuthorizeRequest = z.infer<typeof RepairAuthorizeRequestSchema>;

export const RepairAuthorizeResponseSchema = z.object({
  authorized: z.boolean(),
  appliedToTimetable: z.boolean(),
  isDemoData: z.boolean(),
  status: z.enum(['AUDIT_RECORDED', 'ALREADY_RECORDED']),
  incidentId: z.string(),
  strategyId: z.string(),
  authorizationType: RepairAuthorizationTypeEnum,
  message: z.string(),
  auditLogId: z.string().nullable(),
  timestamp: z.string(),
});
export type RepairAuthorizeResponse = z.infer<typeof RepairAuthorizeResponseSchema>;

