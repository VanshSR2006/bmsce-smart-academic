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

// Canonical /api/v1/workload/overview contract (TASK-303)
export const WorkloadCourseAllocationSchema = z.object({
  subjectCode: z.string(),
  subjectName: z.string(),
  sectionCode: z.string(),
  requiredPeriodsPerWeek: z.number(),
});

export const WorkloadAvailabilitySlotSchema = z.object({
  id: z.string(),
  availabilityType: z.string(),
  dayOfWeek: z.number().int().nullable(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  reason: z.string().nullable(),
});

export const WorkloadFacultyItemSchema = z.object({
  facultyId: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  employeeCode: z.string().nullable(),
  designation: z.string().nullable(),
  departmentId: z.string(),
  departmentName: z.string(),
  cabinLocation: z.string().nullable(),
  status: z.string(),
  hasWorkloadRule: z.boolean(),
  maxWeeklyHours: z.number().nullable(),
  maxDailyHours: z.number().nullable(),
  assignedWeeklyHours: z.number(),
  scheduledWeeklyHours: z.number(),
  remainingCapacityHours: z.number().nullable(),
  allocationDiscrepancyHours: z.number(),
  theoryHours: z.number(),
  labHours: z.number(),
  dailyHours: z.object({
    MON: z.number(),
    TUE: z.number(),
    WED: z.number(),
    THU: z.number(),
    FRI: z.number(),
  }),
  peakDailyHours: z.number(),
  utilizationPct: z.number().nullable(),
  workloadStatus: z.enum(['OPTIMAL', 'OVERLOAD', 'UNDERLOAD', 'STANDBY', 'UNCONFIGURED']),
  assignedCourses: z.array(WorkloadCourseAllocationSchema),
  availabilitySlots: z.array(WorkloadAvailabilitySlotSchema),
});
export type WorkloadFacultyItem = z.infer<typeof WorkloadFacultyItemSchema>;

export const WorkloadOverviewSchema = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    academicTerms: z.array(
      z.object({ id: z.string(), academicYearLabel: z.string(), termLabel: z.string() })
    ),
  }),
  scopeLabel: z.object({
    department: z.string(),
    academicTerm: z.string(),
  }),
  metrics: z.object({
    totalFaculty: z.number().int(),
    activeFacultyCount: z.number().int(),
    configuredRulesCount: z.number().int(),
    avgAssignedHoursPerWeek: z.number().nullable(),
    avgScheduledHoursPerWeek: z.number().nullable(),
    totalAssignedHours: z.number(),
    totalScheduledHours: z.number(),
    balancedCount: z.number().int(),
    overloadCount: z.number().int(),
    underloadCount: z.number().int(),
    unconfiguredCount: z.number().int(),
    compliantPct: z.number().nullable(),
  }),
  faculty: z.array(WorkloadFacultyItemSchema),
  schemaLimitations: z.array(z.string()),
});
export type WorkloadOverview = z.infer<typeof WorkloadOverviewSchema>;

// Canonical /api/v1/rooms/overview contract (TASK-303)
export const RoomAvailabilityEntrySchema = z.object({
  id: z.string(),
  availabilityType: z.string(),
  dayOfWeek: z.number().int().nullable(),
  startTime: z.string(),
  endTime: z.string(),
  reason: z.string().nullable(),
});

export const RoomCapacityMismatchSchema = z.object({
  sectionCode: z.string(),
  expectedStudentCount: z.number().int(),
  roomCapacity: z.number().int(),
});

export const RoomInventoryItemSchema = z.object({
  roomId: z.string(),
  roomCode: z.string(),
  name: z.string(),
  roomType: z.string(),
  capacity: z.number().int(),
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  location: z.string().nullable(),
  isActive: z.boolean(),
  isLab: z.boolean(),
  facilities: z.array(z.string()),
  availabilityEntries: z.array(RoomAvailabilityEntrySchema),
  allocatedSessionsCount: z.number().int(),
  allocatedWeeklyHours: z.number().int(),
  freeWeeklyPeriods: z.number().int().nullable(),
  utilizationPct: z.number().nullable(),
  daySchedule: z.object({
    MON: z.number().int(),
    TUE: z.number().int(),
    WED: z.number().int(),
    THU: z.number().int(),
    FRI: z.number().int(),
  }),
  currentStatus: z.enum(['IN_USE', 'AVAILABLE', 'UNAVAILABLE']),
  collisionCount: z.number().int(),
  capacityMismatches: z.array(RoomCapacityMismatchSchema),
  collisionStatus: z.enum(['CLEAN', 'COLLISION_ALERT']),
});
export type RoomInventoryItem = z.infer<typeof RoomInventoryItemSchema>;

export const RoomsOverviewSchema = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    academicTerms: z.array(
      z.object({ id: z.string(), academicYearLabel: z.string(), termLabel: z.string() })
    ),
  }),
  scopeLabel: z.object({
    department: z.string(),
    academicTerm: z.string(),
  }),
  weeklyAvailablePeriods: z.number().int().nullable(),
  metrics: z.object({
    totalRooms: z.number().int(),
    activeRoomsCount: z.number().int(),
    classroomCount: z.number().int(),
    labCount: z.number().int(),
    otherRoomsCount: z.number().int(),
    avgUtilizationPct: z.number().nullable(),
    roomsWithSessionsCount: z.number().int(),
    unallocatedRoomsCount: z.number().int(),
    collisionCount: z.number().int(),
    capacityMismatchCount: z.number().int(),
  }),
  rooms: z.array(RoomInventoryItemSchema),
  schemaLimitations: z.array(z.string()),
});
export type RoomsOverview = z.infer<typeof RoomsOverviewSchema>;

