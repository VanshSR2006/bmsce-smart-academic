import { z } from 'zod';
import { SubjectTypeEnum } from './enums.js';

export const TimetableSlotSchema = z.object({
  id: z.string().uuid(),
  dayOfWeek: z.number().int().min(1).max(7),
  periodNumber: z.number().int().min(1).max(10),
  startTime: z.string(), // "08:30"
  endTime: z.string(),   // "09:30"
  courseCode: z.string(),
  courseTitle: z.string(),
  subjectType: SubjectTypeEnum,
  facultyName: z.string(),
  facultyId: z.string().uuid(),
  roomCode: z.string(),
  roomId: z.string().uuid(),
  sectionCode: z.string(),
  sectionId: z.string().uuid(),
  batchCode: z.string().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  durationPeriods: z.number().int().default(1),
  isLab: z.boolean().default(false),
  tag: z.string().optional(),
  notes: z.string().optional(),
});
export type TimetableSlot = z.infer<typeof TimetableSlotSchema>;

export const WeeklyTimetableGridSchema = z.object({
  academicTermLabel: z.string(),
  sectionCode: z.string(),
  departmentName: z.string(),
  classInCharge: z.string(),
  primaryRoom: z.string(),
  versionNumber: z.number(),
  status: z.string(),
  periods: z.array(z.object({
    periodNumber: z.number(),
    label: z.string(),
    startTime: z.string(),
    endTime: z.string(),
    type: z.enum(['CLASS', 'BREAK', 'LUNCH', 'OTHER']),
  })),
  slots: z.array(TimetableSlotSchema),
  loadBreakdown: z.object({
    coreTheoryHrs: z.number(),
    labPracticalHrs: z.number(),
    tutorialsHrs: z.number(),
    projectSeminarHrs: z.number(),
    totalWeeklyHrs: z.number(),
    requiredAttendancePct: z.number().default(75),
  }),
});
export type WeeklyTimetableGrid = z.infer<typeof WeeklyTimetableGridSchema>;

