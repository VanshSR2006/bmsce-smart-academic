import { z } from 'zod';
import { ExamTypeEnum } from './enums.js';

export const ExaminationEventSchema = z.object({
  id: z.string().uuid(),
  courseCode: z.string(),
  courseTitle: z.string(),
  cohort: z.string(),
  enrolledStudentsCount: z.number(),
  examDate: z.string(), // "Mon 04 Nov 2024"
  timeWindow: z.string(), // "09:30 - 11:00 AM"
  durationMinutes: z.number().default(90),
  allocatedVenues: z.array(z.string()), // ["PJ-301", "PJ-302", "PJ-304"]
  chiefInvigilator: z.string(),
  invigilatorTeam: z.string(),
  instructions: z.string().optional(),
});
export type ExaminationEvent = z.infer<typeof ExaminationEventSchema>;

export const VenueCapacityStatusSchema = z.object({
  roomCode: z.string(),
  roomLocation: z.string(),
  allocatedDesks: z.number(),
  totalCapacity: z.number(),
  utilizationPct: z.number(),
  assignedCohorts: z.array(z.string()),
});
export type VenueCapacityStatus = z.infer<typeof VenueCapacityStatusSchema>;

export const ExaminationCycleOverviewSchema = z.object({
  id: z.string().uuid(),
  cycleType: ExamTypeEnum,
  academicTerm: z.string(),
  departmentName: z.string(),
  versionLabel: z.string(),
  status: z.string(),
  upcomingSessionsCount: z.number(),
  publishedSchedulesCount: z.number(),
  pendingApprovalsCount: z.number(),
  allocatedHallsCount: z.number(),
  singleDeskSlotsTotal: z.number(),
  netCapacityUsedPct: z.number(),
  hardConflictsCount: z.number(),
  softWarningsCount: z.number(),
  events: z.array(ExaminationEventSchema),
  venues: z.array(VenueCapacityStatusSchema),
});
export type ExaminationCycleOverview = z.infer<typeof ExaminationCycleOverviewSchema>;

