import { z } from 'zod';
import { ChatMessageTypeEnum, ChatSpaceStatusEnum } from './enums.js';

export const ScheduledSessionChamberSchema = z.object({
  id: z.string().uuid(),
  courseCode: z.string(),
  courseTitle: z.string(),
  courseType: z.string(),
  period: z.string(),
  timeWindow: z.string(),
  roomCode: z.string(),
  facultyName: z.string(),
  facultyRole: z.string(),
  status: ChatSpaceStatusEnum,
  isLive: z.boolean().default(false),
  chamberStatusText: z.string(), // "OPEN (Live Period)"
  closeInMinutes: z.number().optional(),
  classRepName: z.string(),
  cohort: z.string(),
  activeDirectivesCount: z.number().default(0),
});
export type ScheduledSessionChamber = z.infer<typeof ScheduledSessionChamberSchema>;

export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  chatSpaceId: z.string().uuid(),
  senderId: z.string().uuid(),
  senderName: z.string(),
  senderRole: z.string(),
  senderRoleBadge: z.string(),
  messageType: ChatMessageTypeEnum,
  body: z.string(),
  isImportant: z.boolean().default(false),
  createdAt: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const PinnedDirectiveSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  authorName: z.string(),
  authorRole: z.string(),
  timestampText: z.string(),
  body: z.string(),
  priority: z.enum(['URGENT', 'LAB', 'VENUE', 'NORMAL']),
});
export type PinnedDirective = z.infer<typeof PinnedDirectiveSchema>;

