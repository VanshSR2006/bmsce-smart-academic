import { z } from 'zod';

export const DashboardFilterOptionDepartmentSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});

export const DashboardFilterOptionProgramSchema = z.object({
  id: z.string(),
  departmentId: z.string(),
  code: z.string(),
  name: z.string(),
});

export const DashboardFilterOptionTermSchema = z.object({
  id: z.string(),
  academicYearLabel: z.string(),
  termLabel: z.string(),
  status: z.string(),
});

export const DashboardSectionCoverageSchema = z.object({
  sectionId: z.string(),
  sectionCode: z.string(),
  displayName: z.string(),
  semesterNumber: z.number().int(),
  studentCount: z.number().int(),
  batchCount: z.number().int(),
  requiredOfferingsCount: z.number().int(),
  scheduledSessionsCount: z.number().int(),
  hasPublishedTimetable: z.boolean(),
});

export const DashboardRoomMatrixItemSchema = z.object({
  id: z.string(),
  roomCode: z.string(),
  name: z.string(),
  roomType: z.string(),
  capacity: z.number().int(),
  locationLabel: z.string().nullable(),
  scheduledSessionsCount: z.number().int(),
  scheduledPeriodsPerWeek: z.number().int(),
  status: z.enum(['IN_USE', 'FREE']),
});

export const DashboardCalendarEventSchema = z.object({
  id: z.string(),
  eventDate: z.string(),
  eventType: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  isInstructional: z.boolean(),
  academicTermLabel: z.string(),
});

export const DashboardScheduleExceptionSchema = z.object({
  id: z.string(),
  exceptionDate: z.string(),
  exceptionType: z.string(),
  status: z.string(),
  reason: z.string(),
  timetableName: z.string(),
  versionNumber: z.number().int(),
  replacementFacultyName: z.string().nullable(),
  replacementRoomCode: z.string().nullable(),
});

export const DashboardDisruptionItemSchema = z.object({
  id: z.string(),
  disruptionType: z.string(),
  status: z.string(),
  affectedDate: z.string(),
  startTime: z.string().nullable(),
  endTime: z.string().nullable(),
  reason: z.string(),
  affectedFacultyName: z.string().nullable(),
  affectedRoomCode: z.string().nullable(),
  proposalsCount: z.number().int(),
  proposals: z.array(
    z.object({
      id: z.string(),
      strategyCode: z.string(),
      status: z.string(),
      reviewComment: z.string().nullable(),
    })
  ),
});

export const DashboardAuditLogItemSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string().nullable(),
  actorName: z.string().nullable(),
});

export const HodDashboardOverviewSchema = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  scopeLabel: z.object({
    department: z.string(),
    departmentCode: z.string().nullable(),
    program: z.string(),
    academicTerm: z.string(),
  }),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    programId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(DashboardFilterOptionDepartmentSchema),
    programs: z.array(DashboardFilterOptionProgramSchema),
    academicTerms: z.array(DashboardFilterOptionTermSchema),
  }),
  academicOverview: z.object({
    departmentsCount: z.number().int(),
    programsCount: z.number().int(),
    sectionsCount: z.number().int(),
    batchesCount: z.number().int(),
    activeAcademicTermsCount: z.number().int(),
    subjectsCount: z.number().int(),
    subjectOfferingsCount: z.number().int(),
    enrolledStudentsCount: z.number().int(),
    configuredSectionSeats: z.number().int(),
  }),
  facultyOverview: z.object({
    facultyTotal: z.number().int(),
    activeFacultyCount: z.number().int(),
    facultyAssignmentsCount: z.number().int(),
    facultyAvailabilityEntriesCount: z.number().int(),
    unavailableSlotsCount: z.number().int(),
    workloadRulesCount: z.number().int(),
    avgAssignedPeriodsPerWeek: z.number().nullable(),
    avgMaxPeriodsPerWeek: z.number().nullable(),
  }),
  timetableOverview: z.object({
    timetablesCount: z.number().int(),
    publishedVersionsCount: z.number().int(),
    draftVersionsCount: z.number().int(),
    scheduledSessionsCount: z.number().int(),
    coveredSectionsCount: z.number().int(),
    unscheduledSectionsCount: z.number().int(),
    timetableCoveragePct: z.number().nullable(),
    latestPublishedVersion: z
      .object({
        id: z.string(),
        timetableName: z.string(),
        versionNumber: z.number().int(),
        publishedAt: z.string().nullable(),
        hardViolationCount: z.number().int(),
        softPenalty: z.number().nullable(),
      })
      .nullable(),
    sectionCoverage: z.array(DashboardSectionCoverageSchema),
  }),
  roomOverview: z.object({
    roomsTotal: z.number().int(),
    classroomCount: z.number().int(),
    labCount: z.number().int(),
    otherRoomsCount: z.number().int(),
    roomsWithSessionsCount: z.number().int(),
    freeRoomsCount: z.number().int(),
    roomUtilizationPct: z.number().nullable(),
    roomMatrix: z.array(DashboardRoomMatrixItemSchema),
  }),
  academicAlerts: z.object({
    upcomingCalendarEvents: z.array(DashboardCalendarEventSchema),
    scheduleExceptions: z.array(DashboardScheduleExceptionSchema),
    activeDisruptions: z.array(DashboardDisruptionItemSchema),
    recentAuditLogs: z.array(DashboardAuditLogItemSchema),
    warnings: z.array(z.string()),
  }),
  schemaLimitations: z.array(z.string()),
});

export type HodDashboardOverview = z.infer<typeof HodDashboardOverviewSchema>;
