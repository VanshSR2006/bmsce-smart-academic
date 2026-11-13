import { z } from 'zod';

export const UserRoleCodeEnum = z.enum([
  'STUDENT',
  'FACULTY',
  'CR',
  'DEPT_HEAD',
  'CLUSTER_HEAD',
  'PLATFORM_ADMIN',
]);
export type UserRoleCode = z.infer<typeof UserRoleCodeEnum>;

export const SubjectTypeEnum = z.enum([
  'THEORY',
  'LAB',
  'TUTORIAL',
  'PROJECT',
  'OTHER',
]);
export type SubjectType = z.infer<typeof SubjectTypeEnum>;

export const FacultyAssignmentTypeEnum = z.enum([
  'PRIMARY',
  'CO_TEACHER',
  'SUBSTITUTE_ELIGIBLE',
]);
export type FacultyAssignmentType = z.infer<typeof FacultyAssignmentTypeEnum>;

export const RoomTypeEnum = z.enum([
  'CLASSROOM',
  'LAB',
  'AUDITORIUM',
  'SEMINAR_HALL',
  'OTHER',
]);
export type RoomType = z.infer<typeof RoomTypeEnum>;

export const TimetableVersionStatusEnum = z.enum([
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'SUPERSEDED',
  'REJECTED',
]);
export type TimetableVersionStatus = z.infer<typeof TimetableVersionStatusEnum>;

export const OptimizationStatusEnum = z.enum([
  'QUEUED',
  'VALIDATING_INPUT',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'TIMED_OUT',
]);
export type OptimizationStatus = z.infer<typeof OptimizationStatusEnum>;

export const SolverStatusEnum = z.enum([
  'OPTIMAL',
  'FEASIBLE',
  'INFEASIBLE',
  'UNKNOWN',
  'MODEL_INVALID',
]);
export type SolverStatus = z.infer<typeof SolverStatusEnum>;

export const DisruptionTypeEnum = z.enum([
  'FACULTY_UNAVAILABLE',
  'ROOM_UNAVAILABLE',
  'CALENDAR_CHANGE',
  'OTHER',
]);
export type DisruptionType = z.infer<typeof DisruptionTypeEnum>;

export const RepairStrategyEnum = z.enum([
  'SUBSTITUTE_FACULTY',
  'ALTERNATE_SLOT',
  'ALTERNATE_ROOM',
  'FREE_PERIOD',
  'OTHER',
]);
export type RepairStrategy = z.infer<typeof RepairStrategyEnum>;

export const ChatSpaceStatusEnum = z.enum(['UPCOMING', 'OPEN', 'CLOSED']);
export type ChatSpaceStatus = z.infer<typeof ChatSpaceStatusEnum>;

export const ChatMessageTypeEnum = z.enum(['TEXT', 'ANNOUNCEMENT', 'SYSTEM']);
export type ChatMessageType = z.infer<typeof ChatMessageTypeEnum>;

export const ExamTypeEnum = z.enum(['CIE', 'SEE']);
export type ExamType = z.infer<typeof ExamTypeEnum>;

export const ValidationSeverityEnum = z.enum(['HARD', 'SOFT', 'INFO']);
export type ValidationSeverity = z.infer<typeof ValidationSeverityEnum>;

