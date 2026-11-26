import { z } from 'zod';
import { SubjectTypeEnum } from './enums.js';

export const DepartmentSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
});
export type Department = z.infer<typeof DepartmentSchema>;

export const SectionSchema = z.object({
  id: z.string().uuid(),
  departmentId: z.string().uuid(),
  semesterNumber: z.number().int(),
  sectionCode: z.string(),
  displayName: z.string(),
  studentCount: z.number().int(),
});
export type Section = z.infer<typeof SectionSchema>;

export const SubjectSchema = z.object({
  id: z.string().uuid(),
  departmentId: z.string().uuid(),
  subjectCode: z.string(),
  name: z.string(),
  subjectType: SubjectTypeEnum,
  defaultDurationPeriods: z.number().int().default(1),
  requiresLab: z.boolean().default(false),
});
export type Subject = z.infer<typeof SubjectSchema>;

export const RoomSchema = z.object({
  id: z.string().uuid(),
  roomCode: z.string(),
  name: z.string(),
  roomType: z.string(),
  capacity: z.number().int(),
  locationLabel: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  status: z.enum(['IN_USE', 'FREE', 'NETWORK_CHECK']).default('FREE'),
  currentSession: z.string().optional(),
});
export type Room = z.infer<typeof RoomSchema>;

// Canonical /api/v1/nep-scheme/overview contract (TASK-301)
export const NepSchemeCourseSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  subjectType: z.string(),
  departmentName: z.string(),
  semesters: z.array(z.number().int()),
  offeringCount: z.number().int(),
  hoursPerWeek: z.number(),
  sessionDurationPeriods: z.number().int(),
  requiresLab: z.boolean(),
  isLabContiguous: z.boolean(),
  credits: z.number().nullable(),
  ltp: z.string().nullable(),
});
export type NepSchemeCourse = z.infer<typeof NepSchemeCourseSchema>;

export const NepSchemeCategorySchema = z.object({
  code: z.string(),
  title: z.string(),
  subjectCount: z.number().int(),
  offeringCount: z.number().int(),
  totalWeeklyHours: z.number(),
  courses: z.array(NepSchemeCourseSchema),
});
export type NepSchemeCategory = z.infer<typeof NepSchemeCategorySchema>;

export const NepSchemeOverviewSchema = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  schemeLabel: z.string(),
  department: z.string(),
  academicTermLabel: z.string(),
  programLabel: z.string(),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    programId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    programs: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    academicTerms: z.array(
      z.object({ id: z.string(), academicYearLabel: z.string(), termLabel: z.string() })
    ),
  }),
  schemaLimitations: z.array(z.string()),
  categories: z.array(NepSchemeCategorySchema),
  statistics: z.object({
    totalUniqueSubjects: z.number().int(),
    totalOfferings: z.number().int(),
    totalWeeklyContactHours: z.number(),
    theorySubjectCount: z.number().int(),
    labSubjectCount: z.number().int(),
    tutorialOtherCount: z.number().int(),
    labContactRatioPct: z.number(),
  }),
  staticReferenceRules: z.array(
    z.object({
      mandate: z.string(),
      rule: z.string(),
      enforcement: z.string(),
    })
  ),
});
export type NepSchemeOverview = z.infer<typeof NepSchemeOverviewSchema>;

