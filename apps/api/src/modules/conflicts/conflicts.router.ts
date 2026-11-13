import { Router, Request, Response } from 'express';

export const conflictsRouter = Router();

conflictsRouter.get('/summary', async (req: Request, res: Response) => {
  return res.json({
    data: {
      title: 'Timetable Conflict Inspector',
      subtitle: 'Identify, analyze, and resolve institutional scheduling constraint violations for the BMSCE Academic Autonomous Cluster before DAAB ratification.',
      academicCycle: 'AY 2024–25 (Odd Sem)',
      scope: 'CSE (4 Sems, 16 Sections)',
      activeStagingPlan: 'Draft Master v1.2.REV',
      auditTimestamp: 'Today, 09:42 AM',
      gatekeeperStatus: {
        hardBlockers: 3,
        softWarnings: 5,
        status: 'PUBLICATION_BLOCKED',
      },
      stats: {
        totalHard: 3,
        facultyClashes: 1,
        venueCollisions: 1,
        nepCompliance: 1,
        batchIntegrity: 0,
        softHeuristics: 5,
      },
      incidents: [
        {
          id: 'ICONT-1041',
          resourceEntity: 'Dr. A. Ramanathan',
          role: 'Professor • Dept CSE',
          natureOfConflict: 'Direct Double-Booking (22CSSPCDAA (5-B) vs 22CS7PECS (7-A))',
          assignedSlot: 'Mon Period 2 (09:30–10:30 AM)',
          severity: 'HARD',
          rootCause: 'Dr. A. Ramanathan has been scheduled into two distinct venues simultaneously on Monday Period 2 (09:30–10:30 AM). This occurs because the 7th Semester elective cohort merged manually during Section A finalization without releasing the core assignment in 5th Semester CSE-B.',
          simultaneousAllocations: [
            { session: 'SESSION A (CORE)', cohort: '5th Sem CSE-B', code: '22CSSPCDAA', title: 'Design & Analysis of Algo', room: 'Room PJ-302' },
            { session: 'SESSION B (ELECTIVE)', cohort: '7th Sem CSE-A', code: '22CS7PECS', title: 'Cloud Security & Audit', room: 'Seminar Hall 2' },
          ],
          policyAnchor: 'BMSCE Autonomous Clause 4.1 & VTU Section 15.2 (Zero Faculty Concurrency Violation).',
          recommendedResolutions: [
            {
              id: 'res-1',
              title: 'Proxy Assign to Prof. S. Malathi',
              description: 'Reassign Monday Period 2 22CSSPCDAA to Prof. S. Malathi. She has 0 concurrent lectures and her weekly workload remains compliant at 16.0h / 18.0h.',
              impactText: 'Diff impact: 1 slot modified',
              isRecommended: true,
            },
            {
              id: 'res-2',
              title: 'Relocate 22CS7PECS to Tuesday',
              description: 'Shift Cloud Security to Tuesday Period 4 (11:45–12:45 PM). Seminar Hall 2 is free. Note: Dr. Ramanathan will have 2 consecutive hours on Tuesday.',
              impactText: '+1 Soft Warning (Fatigue)',
              isRecommended: false,
            },
          ],
        },
        {
          id: 'ICONT-1042',
          resourceEntity: 'Systems Lab 1 (CS-L1)',
          role: 'Cadence Server Cluster • 40 Seats',
          natureOfConflict: 'Room Dual Allocation: 22CSSL01 (5 B1) vs 22CS3L02 (3 B2)',
          assignedSlot: 'Wed P6–P7 (02:45–04:45 PM)',
          severity: 'HARD',
          rootCause: 'Concurrent allocation of 40-seat Systems Lab 1 to two distinct practical batches simultaneously.',
        },
        {
          id: 'ICONT-1043',
          resourceEntity: 'NEP Contiguity Breach',
          role: '5th Sem CSE-B (Batch B2)',
          natureOfConflict: '2-Hour Practical Block: 22CSSL01 Networks Lab requires 3h contiguous',
          assignedSlot: 'Fri Periods 5 & 6 (01:45–03:45 PM)',
          severity: 'HARD',
          rootCause: 'Practical laboratory allocated only 2 discrete periods instead of mandatory 3-hour NEP block.',
        },
        {
          id: 'ICONT-1044',
          resourceEntity: '5th Sem CSE-B',
          role: 'Student Cognitive Load',
          natureOfConflict: '4 Consecutive Theory Slots: Exceeds recommended 2h continuous lecture cap',
          assignedSlot: 'Thu Periods 1–4 (08:30–12:45 PM)',
          severity: 'SOFT',
        },
        {
          id: 'ICONT-1045',
          resourceEntity: 'Dr. P. Jayashree',
          role: 'Associate Professor',
          natureOfConflict: 'Workload Cap +1.5h: 17.5 hrs/wk (AICTE standard 16.0 hrs/wk)',
          assignedSlot: 'Cumulative Weekly Total',
          severity: 'SOFT',
        },
      ],
      conflictMatrix: {
        cohort: '5th Semester – Section B',
        days: [
          {
            day: 'MON',
            p1: { code: '22CSSPCDAA', status: 'OK' },
            p2: { code: '22CSSPCDBMS', conflict: 'FACULTY CLASH: 22CSSPCDAA', status: 'HARD_CLASH' },
            p3: { code: '22MASPCTFL', status: 'OK' },
            p4: { code: 'Library/TUT', status: 'OK' },
            p5to7: { code: '22CSSL02 Networks Lab', status: 'OK' },
          },
          {
            day: 'TUE',
            p1: { code: '22CSSPCOPS', status: 'OK' },
            p2: { code: '22CSSPCDAA', status: 'OK' },
            p3: { code: '22CSSPCOPS', status: 'OK' },
            p4: { code: '22CSSPCDBMS', status: 'OK' },
            p5to7: { code: 'AEC Activity', status: 'OK' },
          },
          {
            day: 'WED',
            p1: { code: '22MASPCTFL', status: 'OK' },
            p2: { code: '22CSSPCSE', status: 'OK' },
            p3: { code: '22CSSPCDBMS', status: 'OK' },
            p4: { code: 'Open Elec', status: 'OK' },
            p5to7: { code: 'VENUE CLASH: CS-Lab 1', status: 'VENUE_CLASH' },
          },
        ],
      },
      constraintHealth: {
        passed: 17,
        total: 20,
        pct: 85.0,
        status: 'BLOCKED',
        weeklyAuditedHours: 384,
        softOptimalityMargin: 92.4,
      },
    },
  });
});

