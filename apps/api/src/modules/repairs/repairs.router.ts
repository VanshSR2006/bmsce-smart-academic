import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/prisma.js';

export const repairsRouter = Router();

const repairAuthorizeSchema = z.object({
  incidentId: z.string().optional(),
  strategyId: z.string().min(1),
  exceptionType: z.string().optional(),
  authorizationType: z.string().optional(),
  note: z.string().max(500).optional(),
});

repairsRouter.get('/active', async (req: Request, res: Response) => {
  const disruption = await prisma.disruption.findFirst({
    where: { status: 'PROPOSALS_READY' },
    include: {
      affectedFaculty: { include: { user: true } },
      proposals: true,
    },
  });

  return res.json({
    data: {
      title: 'Timetable Disruption & Repair Centre',
      subtitle: 'Constraint-aware algorithmic disruption handling and schedule exception generator — BMSCE Academic Autonomous Cluster',
      incident: {
        id: disruption?.id || 'dis-1',
        code: 'INCIDENT #DIS-2024-1014-001 • SYNTHETIC DEMO EVENT',
        category: 'Faculty Unavailability / Medical Leave',
        reportedAt: 'Logged 07:15 AM (Today) • Immediate Impact',
        title: 'Design & Analysis of Algorithms (Theory Core)',
        primaryInstructor: 'Dr. A. Ramanathan (Professor, Dept. CSE) reported sudden medical unavailability for Monday contact sessions.',
        impactedSlot: 'Mon • Period 1 (08:30 – 09:30)',
        assignedVenue: 'Lecture Hall PJ-302',
        cohortScope: '64 Enrolled (B1, B2, B3)',
        curricularStatus: 'Pending HOD Authorization',
        preWarningBuffer: '1.2 Hours (Urgent resolution mandated prior to 08:30 AM campus student arrival bell)',
      },
      strategies: [
        {
          id: 'strat-a',
          optionLabel: 'OPTION A • RECOMMENDED PROXY',
          badgeText: '0 Hard Conflicts',
          title: 'Substitute Faculty Peer Allocation',
          description: 'Prof. S. Malathi (Assoc. Prof, DAA Co-Instructor) assumes Period 1 contact duties in Room PJ-302.',
          disruptionImpactScore: 96.2,
          impactCategory: 'Minimal Ripple',
          targetTime: 'Mon 08:30 – 09:30 AM',
          venue: 'PJ-302 (Reserved)',
          replacement: 'Prof. S. Malathi',
          facultyAvailable: 'Assigned: 15h / 18h limit (Weekly cap 18h / 18h max)',
          cohortMovement: 'Zero relocation (Students seated in PJ-302)',
          curriculumSync: 'Module 3 Exam Trackers matched, sync in viva',
          isRecommended: true,
          isSelected: true,
        },
        {
          id: 'strat-b',
          optionLabel: 'OPTION B • SLOT RELOCATION',
          badgeText: 'Slot Position Shift',
          title: 'Mutual Slot Reschedule / Swap',
          description: 'Shift DAA Core lecture to Thursday Period 7 (03:45–04:45 PM); release Monday Period 1 as sports.',
          disruptionImpactScore: 84.6,
          impactCategory: 'Contained Rescheduled',
          targetTime: 'Thu 03:45 – 04:45 PM',
          venue: 'PJ-302 (Slot Open)',
          replacement: 'Dr. A. Ramanathan (Post-recovery)',
          facultyAvailable: 'Open calendar window on Thursday',
          cohortMovement: 'Contains fatigue alert: 3 consecutive hours in lab',
          curriculumSync: 'Zero collision detected in Central Matrix',
          isRecommended: false,
          isSelected: false,
        },
        {
          id: 'strat-c',
          optionLabel: 'OPTION C • REGULATED CANCELLATION',
          badgeText: 'Curricular Deficit',
          title: 'Supervised Digital Library Self-Study',
          description: 'Release Period 1 as supervised preparatory study in Digital Library (LIB-3) with biometric logging.',
          disruptionImpactScore: 68.0,
          impactCategory: 'Deficit Incurred',
          targetTime: 'Mon 08:30 – 09:30 AM',
          venue: 'Digital Library (LIB-3)',
          replacement: 'Asst. Librarian On-Duty',
          facultyAvailable: 'Zero faculty credit required',
          cohortMovement: 'Deficit: 1.0 h per sem. (Regulatory balance required: 39 / 40)',
          curriculumSync: 'Requires make-up hour before CIE-2',
          isRecommended: false,
          isSelected: false,
        },
      ],
      differentialSchedule: {
        original: [
          { time: '08:30-09:30', period: 'PERIOD 1', title: 'DAA Core (Theory)', faculty: 'Dr. A. Ramanathan', isDisrupted: true },
          { time: '09:30-10:30', period: 'PERIOD 2', title: 'DBMS Principles', faculty: 'Dr. P. Jayashree' },
          { time: '10:45-11:45', period: 'PERIOD 3', title: 'Computer Networks', faculty: 'Prof. M. K. Rao' },
          { time: '11:45-12:45', period: 'PERIOD 4', title: 'Theory of Computation', faculty: 'Dr. G. Anita' },
          { time: '12:45-01:45', period: 'RECESS', title: 'Campus Lunch', faculty: '-' },
          { time: '01:45-04:45', period: 'PERIOD 5-7', title: 'Algorithms & Networks Lab', faculty: 'Batch B1/B2/B3' },
        ],
        repaired: [
          { time: '08:30-09:30', period: 'PERIOD 1', title: 'DAA Core (Theory)', faculty: 'Prof. S. Malathi [PROXY]', isChanged: true },
          { time: '09:30-10:30', period: 'PERIOD 2', title: 'DBMS Principles', faculty: 'Dr. P. Jayashree' },
          { time: '10:45-11:45', period: 'PERIOD 3', title: 'Computer Networks', faculty: 'Prof. M. K. Rao' },
          { time: '11:45-12:45', period: 'PERIOD 4', title: 'Theory of Computation', faculty: 'Dr. G. Anita' },
          { time: '12:45-01:45', period: 'RECESS', title: 'Campus Lunch', faculty: '-' },
          { time: '01:45-04:45', period: 'PERIOD 5-7', title: 'Algorithms & Networks Lab', faculty: 'Batch B1/B2/B3' },
        ],
      },
      constraintVerifications: [
        { name: 'Faculty Concurrency & Collision Check', status: 'PASS', detail: '0 overlaps. Prof. S. Malathi has no concurrent teaching hours scheduled in Period 1.' },
        { name: 'Cohort Timetable Integrity', status: 'PASS', detail: '0 clashes for 5th Sem CSE-B. Students retain their scheduled physical presence in Room PJ-302.' },
        { name: 'Room & Venue Collision Integrity', status: 'PASS', detail: 'PJ-302 occupancy confirmed. No parallel room reservation exists in Master Allocation Matrix.' },
        { name: 'NEP 2022 Lab Continuity Compliance', status: 'PASS', detail: '100% preserved. Afternoon 3-hour integrated laboratory practical block (Periods 5–7) remains untouched.' },
        { name: 'AICTE Workload Regulatory Threshold', status: 'PASS', detail: 'Compliant. Prof. S. Malathi load advances from 15.0h to 16.0h/wk (well below 18.0h AICTE ceiling).' },
      ],
      comparativeImpactDeltas: {
        enrolledStudents: 64,
        sessionsShifted: 1,
        roomVariancePct: 0.0,
        curricularDeviationPct: 0.5,
        workloadBalance: {
          malathi: '+1.0 h (16.0h / 18.0h)',
          ramanathan: '-1.0 h (14.0h / 16.0h)',
        },
      },
    },
  });
});

// Authorize & Publish Exception (without mutating baseline)
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

  const { strategyId, exceptionType = 'DATED_EXCEPTION', note } = parseResult.data;

  // Create an audit log record
  const user = await prisma.user.findFirst();
  await prisma.auditLog.create({
    data: {
      actorUserId: user?.id,
      action: 'AUTHORIZE_TIMETABLE_REPAIR',
      resourceType: 'DISRUPTION',
      scope: JSON.stringify({ strategyId, exceptionType, note: note || 'Authorized substitute faculty allocation under Autonomous Academic Cluster 02.' }),
    },
  });

  return res.json({
    data: {
      authorized: true,
      status: 'PUBLISHED',
      message: 'Schedule exception published for 14-Oct-2024 only; base v4.2 master timetable remains authoritative.',
      exceptionId: `exc-${Date.now()}`,
      timestamp: new Date().toISOString(),
    },
  });
});

