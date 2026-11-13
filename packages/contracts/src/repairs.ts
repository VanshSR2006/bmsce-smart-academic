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

