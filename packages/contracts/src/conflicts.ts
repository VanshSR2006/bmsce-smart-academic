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

// Canonical /api/v1/conflicts/summary contract (TASK-101B)
export const ConflictInspectorIncidentSchema = z.object({
  id: z.string(),
  severity: z.enum(['HARD', 'SOFT', 'WARNING']),
  type: z.string().default('CONSTRAINT_VIOLATION'),
  description: z.string(),
  affectedEntities: z.array(z.string()).default([]),
  slot: z.string().optional(),
  constraintRef: z.string().optional(),
  resourceEntity: z.string().optional(),
  rootCause: z.string().optional(),
});
export type ConflictInspectorIncident = z.infer<typeof ConflictInspectorIncidentSchema>;

export const ConflictInspectorSummarySchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  academicCycle: z.string().optional(),
  activeStagingPlan: z.string().optional(),
  isDemoData: z.boolean().optional(),
  totalHardConflicts: z.number().default(0),
  totalSoftConflicts: z.number().default(0),
  facultyClashes: z.number().default(0),
  venueCollisions: z.number().default(0),
  windowViolations: z.number().default(0),
  incidents: z.array(ConflictInspectorIncidentSchema).default([]),
  recommendations: z.array(z.string()).default([]),
});
export type ConflictInspectorSummary = z.infer<typeof ConflictInspectorSummarySchema>;

