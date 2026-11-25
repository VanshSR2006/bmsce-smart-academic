import { Router, Request, Response } from 'express';
import { z } from 'zod';
import type {
  ActiveRepairData,
  RepairAuthorizeResponse,
} from '@bmsce/contracts';
import { prisma } from '../../config/prisma.js';

export const repairsRouter = Router();

const repairAuthorizeSchema = z.object({
  incidentId: z.string().min(1, 'incidentId is required'),
  strategyId: z.string().min(1, 'strategyId is required'),
  authorizationType: z.enum(['DATED_EXCEPTION', 'MASTER_UPDATE']).default('DATED_EXCEPTION'),
  note: z.string().max(500).optional(),
});

async function buildActiveRepairData(): Promise<ActiveRepairData> {
  const disruption = await prisma.disruption.findFirst({
    where: { status: 'PROPOSALS_READY' },
    include: {
      affectedFaculty: { include: { user: true } },
      proposals: true,
    },
  });

  return {
    title: 'Timetable Disruption & Repair Centre',
    subtitle: 'Hardcoded demonstration repair proposals — BMSCE Academic Autonomous Cluster',
    isDemoData: true,
    incident: {
      id: disruption?.id || 'dis-1',
      code: 'INCIDENT #DIS-2024-1014-001 • SYNTHETIC DEMO EVENT',
      type: 'FACULTY_UNAVAILABILITY',
      affectedFaculty: disruption?.affectedFaculty?.user?.displayName || 'Dr. A. Ramanathan',
      affectedSections: ['CSE-B'],
      affectedSlots: ['MON 08:30–09:30 (Period 1)'],
      reason: 'Medical unavailability logged at 07:15 AM for Monday contact sessions (PJ-302, 64 enrolled).',
      reportedAt: '07:15 AM (Today)',
      severity: 'HIGH',
    },
    strategies: [
      {
        id: 'OPT-A',
        label: 'Option A — Substitute Faculty Peer Allocation',
        optionLabel: 'OPTION A • RECOMMENDED PROXY',
        badgeText: '0 Hard Conflicts',
        description:
          'Prof. S. Malathi (Assoc. Prof, DAA Co-Instructor) assumes Period 1 contact duties in Room PJ-302. Minimal ripple — no section rescheduling.',
        disruption: 4,
        feasibility: 96,
        isRecommended: true,
        constraints: [
          {
            name: 'Faculty Concurrency & Collision Check',
            pass: true,
            detail: '0 overlaps. Prof. S. Malathi has no concurrent teaching hours scheduled in Period 1.',
          },
          {
            name: 'Cohort Timetable Integrity',
            pass: true,
            detail: '0 clashes for 5th Sem CSE-B. Students remain in Room PJ-302.',
          },
          {
            name: 'Room & Venue Collision Integrity',
            pass: true,
            detail: 'PJ-302 occupancy confirmed with no parallel reservation.',
          },
          {
            name: 'NEP 2022 Lab Continuity Compliance',
            pass: true,
            detail: 'Afternoon 3-hour integrated laboratory block (Periods 5–7) remains untouched.',
          },
          {
            name: 'AICTE Workload Regulatory Threshold',
            pass: true,
            detail: 'Prof. S. Malathi load advances from 15.0h to 16.0h/wk (below 18.0h ceiling).',
          },
        ],
        diff: [
          {
            slot: 'MON 08:30–09:30 (P1)',
            before: 'Dr. A. Ramanathan / DAA Core / PJ-302',
            after: 'Prof. S. Malathi [PROXY] / DAA Core / PJ-302',
          },
        ],
        impactDelta: [
          { metric: 'Sessions Shifted', before: '0', after: '0 (Proxy Only)', direction: 'same' },
          { metric: 'Faculty Load Δ (S. Malathi)', before: '15.0h', after: '16.0h / 18.0h', direction: 'up' },
          { metric: 'Room Variance', before: '0%', after: '0% (PJ-302)', direction: 'same' },
          { metric: 'Curricular Deviation', before: '0%', after: '0.5%', direction: 'same' },
        ],
      },
      {
        id: 'OPT-B',
        label: 'Option B — Mutual Slot Reschedule / Swap',
        optionLabel: 'OPTION B • SLOT RELOCATION',
        badgeText: 'Slot Position Shift',
        description:
          'Shift DAA Core lecture to Thursday Period 7 (03:45–04:45 PM); release Monday Period 1.',
        disruption: 16,
        feasibility: 85,
        isRecommended: false,
        constraints: [
          { name: 'Faculty Concurrency & Collision Check', pass: true },
          { name: 'Cohort Timetable Integrity', pass: true },
          { name: 'Room & Venue Collision Integrity', pass: true },
          { name: 'Student Fatigue Check (3h consecutive)', pass: false },
          { name: 'AICTE Workload Regulatory Threshold', pass: true },
        ],
        diff: [
          {
            slot: 'MON 08:30–09:30 (P1)',
            before: 'Dr. A. Ramanathan / DAA Core / PJ-302',
            after: 'RELEASED — moved to THU P7',
          },
          {
            slot: 'THU 15:45–16:45 (P7)',
            before: 'Free Slot',
            after: 'Dr. A. Ramanathan / DAA Core / PJ-302',
          },
        ],
        impactDelta: [
          { metric: 'Sessions Shifted', before: '0', after: '1', direction: 'up' },
          { metric: 'Faculty Load Δ', before: 'Unchanged', after: 'Unchanged', direction: 'same' },
          { metric: 'Rooms Affected', before: '0', after: 'PJ-302 (Slot Open)', direction: 'same' },
          { metric: 'Student Disruption', before: '—', after: 'Contained', direction: 'up' },
        ],
      },
      {
        id: 'OPT-C',
        label: 'Option C — Supervised Digital Library Self-Study',
        optionLabel: 'OPTION C • REGULATED CANCELLATION',
        badgeText: 'Curricular Deficit',
        description:
          'Release Period 1 as supervised preparatory study in Digital Library (LIB-3) with biometric logging. Requires make-up hour before CIE-2.',
        disruption: 32,
        feasibility: 68,
        isRecommended: false,
        constraints: [
          { name: 'Faculty Concurrency & Collision Check', pass: true },
          { name: 'Cohort Timetable Integrity', pass: true },
          { name: 'Room & Venue Collision Integrity', pass: true },
          { name: 'Curricular Balance (39/40h)', pass: false },
          { name: 'AICTE Workload Regulatory Threshold', pass: true },
        ],
        diff: [
          {
            slot: 'MON 08:30–09:30 (P1)',
            before: 'Dr. A. Ramanathan / DAA Core / PJ-302',
            after: 'SELF-STUDY / Digital Library (LIB-3)',
          },
        ],
        impactDelta: [
          { metric: 'Sessions Cancelled', before: '0', after: '1', direction: 'up' },
          { metric: 'Faculty Load Δ', before: '15.0h', after: '14.0h', direction: 'down' },
          { metric: 'Curricular Balance', before: '40/40h', after: '39/40h (Make-up req.)', direction: 'down' },
          { metric: 'Student Disruption', before: '—', after: 'High (Self-study)', direction: 'up' },
        ],
      },
    ],
  };
}

repairsRouter.get('/active', async (req: Request, res: Response) => {
  const data = await buildActiveRepairData();
  return res.json({ data });
});

// Record demo repair authorization in audit log (does not mutate published timetables)
repairsRouter.post('/authorize', async (req: Request, res: Response) => {
  // Authorization check: Only HOD, DEPT_HEAD, DEAN, or ADMIN may authorize schedule repairs
  if (req.user && !['HOD', 'DEPT_HEAD', 'ADMIN', 'DEAN'].includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Only HOD, Dean, or Academic Administrator may authorize timetable exceptions and faculty substitutions.',
      },
    });
  }

  const parseResult = repairAuthorizeSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid repair authorization payload',
        details: parseResult.error.format(),
      },
    });
  }

  const { incidentId, strategyId, authorizationType, note } = parseResult.data;
  const activeData = await buildActiveRepairData();

  if (!activeData.incident || activeData.incident.id !== incidentId) {
    return res.status(404).json({
      error: {
        code: 'INCIDENT_NOT_FOUND',
        message: `Incident "${incidentId}" does not match any active disruption incident.`,
      },
    });
  }

  const matchingStrategy = activeData.strategies.find((s) => s.id === strategyId);
  if (!matchingStrategy) {
    return res.status(400).json({
      error: {
        code: 'INVALID_STRATEGY',
        message: `Strategy "${strategyId}" is not valid for active incident "${incidentId}".`,
      },
    });
  }

  const scopePayload = JSON.stringify({
    incidentId,
    strategyId,
    strategyLabel: matchingStrategy.label,
    authorizationType,
    isDemoData: true,
    appliedToTimetable: false,
    note: note || 'Demo repair authorization recorded (published timetable unchanged).',
  });

  // Prevent duplicate audit records for identical demo incident + strategy + type
  const existingLog = await prisma.auditLog.findFirst({
    where: {
      action: 'AUTHORIZE_TIMETABLE_REPAIR',
      resourceType: 'DISRUPTION',
      resourceId: incidentId,
      scope: scopePayload,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (existingLog) {
    const responseData: RepairAuthorizeResponse = {
      authorized: true,
      appliedToTimetable: false,
      isDemoData: true,
      status: 'ALREADY_RECORDED',
      incidentId,
      strategyId,
      authorizationType,
      message:
        'Demo authorization was already recorded in the audit log for this strategy. No timetable records were modified.',
      auditLogId: existingLog.id,
      timestamp: existingLog.createdAt.toISOString(),
    };
    return res.json({ data: responseData });
  }

  const fallbackUser = req.user?.userId ? null : await prisma.user.findFirst();
  const createdLog = await prisma.auditLog.create({
    data: {
      actorUserId: req.user?.userId || fallbackUser?.id,
      action: 'AUTHORIZE_TIMETABLE_REPAIR',
      resourceType: 'DISRUPTION',
      resourceId: incidentId,
      scope: scopePayload,
    },
  });

  const responseData: RepairAuthorizeResponse = {
    authorized: true,
    appliedToTimetable: false,
    isDemoData: true,
    status: 'AUDIT_RECORDED',
    incidentId,
    strategyId,
    authorizationType,
    message:
      'Demo authorization recorded in audit log. No published timetable records were modified.',
    auditLogId: createdLog.id,
    timestamp: createdLog.createdAt.toISOString(),
  };

  return res.json({ data: responseData });
});
