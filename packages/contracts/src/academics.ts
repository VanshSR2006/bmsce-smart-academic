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

