import { z } from 'zod';
import { ValidationSeverityEnum } from './enums.js';

export const ValidationIssueSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  severity: ValidationSeverityEnum,
  message: z.string(),
  incidentId: z.string().optional(),
  resourceEntity: z.string(),
  assignedSlot: z.string(),
  rootCause: z.string().optional(),
  simultaneousAllocations: z.array(z.object({
    sessionCode: z.string(),
    cohort: z.string(),
    title: z.string(),
    venue: z.string(),
  })).optional(),
  policyAnchor: z.string().optional(),
  recommendedResolutions: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    impactScoreDelta: z.string().optional(),
    isRecommended: z.boolean().default(false),
  })).optional(),
});
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;

export const ConflictAuditSummarySchema = z.object({
  totalHardViolations: z.number(),
  facultyClashes: z.number(),
  venueCollisions: z.number(),
  nepComplianceBreaches: z.number(),
  batchIntegrityCollisions: z.number(),
  softWarnings: z.number(),
  gatekeeperStatus: z.enum(['LOCKED', 'CLEARED']),
  hardRulesMet: z.number(),
  hardRulesTotal: z.number(),
  softFitnessOptimalityPct: z.number(),
  issues: z.array(ValidationIssueSchema),
});
export type ConflictAuditSummary = z.infer<typeof ConflictAuditSummarySchema>;

