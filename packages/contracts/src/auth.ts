import { z } from 'zod';
import { UserRoleCodeEnum } from './enums.js';

export const DemoLoginRequestSchema = z.object({
  role: UserRoleCodeEnum,
  identifier: z.string().optional(),
});
export type DemoLoginRequest = z.infer<typeof DemoLoginRequestSchema>;

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  institutionalEmail: z.string().email().nullable(),
  role: UserRoleCodeEnum,
  departmentId: z.string().uuid().nullable().optional(),
  departmentCode: z.string().nullable().optional(),
  sectionId: z.string().uuid().nullable().optional(),
  sectionCode: z.string().nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
  batchCode: z.string().nullable().optional(),
  facultyId: z.string().uuid().nullable().optional(),
  avatarUrl: z.string().optional(),
  designation: z.string().optional(),
  usn: z.string().optional(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: AuthUserSchema,
});
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

