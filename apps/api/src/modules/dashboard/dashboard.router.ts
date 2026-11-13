import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';

export const dashboardRouter = Router();

dashboardRouter.get('/hod/dashboard-overview', async (req: Request, res: Response) => {
  const rooms = await prisma.room.findMany({
    orderBy: { roomCode: 'asc' },
  });

  const disruptions = await prisma.disruption.findMany({
    where: { status: 'PROPOSALS_READY' },
    include: {
      affectedFaculty: { include: { user: true } },
      proposals: true,
    },
  });

  return res.json({
    data: {
      department: 'Department Operations Control Centre • Demo Section CSE-B & Cluster',
      academicYear: 'Demo Academic Year 2024–25 • Synthetic Timetable v4.2 • 100% Derived from Standalone Synthetic Dataset',
      metrics: {
        facultyTotal: 48,
        roomsTotal: 21,
        timetableSolvedPct: 98.4,
        hardConflictsCount: 0,
        softHeuristicsBalanced: 4,
        facultyAvgHrsPerWeek: 18.2,
        activeFacultyRatio: '46/48 Active',
        labRoomLoadPct: 91.8,
        freeBufferRoomsCount: 4,
        pendingProposalsCount: 3,
        nepAuditPassPct: 100,
      },
      liveRoomMatrix: [
        { code: 'PJ-301', name: 'Sample Room PJ-301', status: 'IN_USE', currentCohort: 'DEMO-CS301 (DSA) • 3rd Sem CSE-B', faculty: 'Sample Faculty A', cap: '68/75' },
        { code: 'PJ-302', name: 'Sample Room PJ-302', status: 'IN_USE', currentCohort: 'DEMO-CS302 (DBMS) • 5th Sem CSE-A', faculty: 'Sample Faculty B', cap: '66/75' },
        { code: 'PJ-303', name: 'Sample Room PJ-303', status: 'FREE', currentCohort: 'No Scheduled Lecture • Available for buffer allocation', faculty: 'Free for 1h 45m', cap: 'Cap: 75' },
        { code: 'PJ-304', name: 'Sample Room PJ-304', status: 'IN_USE', currentCohort: 'DEMO-CS304 (AI) • 7th Sem Elective', faculty: 'Sample Faculty D', cap: '60/65' },
        { code: 'CS-L1', name: 'Systems Lab CS-L1', status: 'IN_USE', currentCohort: 'DEMO-CS302 Practicum • 3rd Sem Batch B1', faculty: 'Sample Faculty C', cap: '36/40' },
        { code: 'CS-L2', name: 'Software Lab CS-L2', status: 'IN_USE', currentCohort: 'DEMO-CS301 Remedial Cohort', faculty: 'Sample Faculty E', cap: '28/40' },
        { code: 'CS-L3', name: 'HPC Cluster Lab CS-L3', status: 'NETWORK_CHECK', currentCohort: 'Firmware Validation • Clear by 11:30 AM', faculty: 'Net Admin', cap: '18/40' },
        { code: 'CS-L4', name: 'Specialized Lab CS-L4', status: 'IN_USE', currentCohort: 'DEMO-CS305 Major Project • 7th Sem', faculty: 'Sample Faculty F', cap: '38/40' },
      ],
      activeDisruptions: [
        {
          id: 'dis-1',
          code: 'INCIDENT #DIS-2024-1014-001',
          title: 'Sample Faculty C Unavailable Tomorrow',
          subject: 'DEMO-CS303 Computer Networks (09:00 AM)',
          affectedCohort: 'Demo Section CSE-B (72 students in Sample Room PJ-302)',
          actionNote: 'Immediate substitute or timetable repair recommended.',
          pendingProposals: [
            {
              id: 'prop-1',
              label: 'Proposal #TR-204 (Recommended)',
              description: 'Assign Sample Faculty A as proxy for DEMO-CS303 or swap with Thursday Slot 5 (0 hard conflicts, 0 credit imbalance).',
              status: 'Awaiting 1-Click Approval',
            },
            {
              id: 'prop-2',
              label: 'Proposal #TR-202 (Venue Swap)',
              description: 'Relocate DEMO-CS302 Remedial to Sample Lab CS-L1 for additional workstation access.',
              status: 'Staged',
            },
          ],
        },
      ],
      recentAuditLogs: [
        {
          timestamp: '09:12 AM',
          targetEntity: 'CR-302 Classroom 302',
          eventDescription: 'Faculty Tutorial Slot Exchange: Dr. Umadevi swapped with Dr. Ashok Kumar (Tutorial adjustment)',
          authorizedBy: 'HOD Suresh (Manual Clearance)',
          validation: 'CLEARED',
        },
        {
          timestamp: '08:45 AM',
          targetEntity: 'CS-LAB 2 Software Lab II',
          eventDescription: 'Extra Remedial Lab Allocation: Allocated for 3rd Sem Data Structures Continuous Evaluation Catch-up',
          authorizedBy: 'Solver Engine (Auto-Validated 0 Conflicts)',
          validation: 'AUTO-LOCKED',
        },
        {
          timestamp: 'Yesterday',
          targetEntity: 'AUDI-1 Auditorium East',
          eventDescription: 'Industry Guest Lecture Series: Invited Tech Talk: Distributed Systems at Scale (AWS India) for 7th Sem',
          authorizedBy: 'Academic Dean (Cluster Delegated)',
          validation: 'COMPLETED',
        },
        {
          timestamp: '12 Oct',
          targetEntity: 'PJ-304 Classroom 304',
          eventDescription: 'Class Rep Elective Reschedule: Shifted from 09:30 to 14:15 due to Sports practice buffer',
          authorizedBy: 'HOD Suresh (Awaiting CR Confirmation)',
          validation: 'PENDING CR',
        },
      ],
    },
  });
});

