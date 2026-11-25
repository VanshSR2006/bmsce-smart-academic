import { Router, Request, Response } from 'express';
import type { ConflictInspectorSummary } from '@bmsce/contracts';

export const conflictsRouter = Router();

conflictsRouter.get('/summary', async (req: Request, res: Response) => {
  const data: ConflictInspectorSummary = {
    title: 'Conflict Inspector',
    subtitle: 'Synthetic constraint violation analysis — Draft Master v1.2.REV (AY 2024–25 Odd Sem)',
    academicCycle: 'AY 2024–25 (Odd Sem)',
    activeStagingPlan: 'Draft Master v1.2.REV',
    isDemoData: true,
    totalHardConflicts: 3,
    totalSoftConflicts: 2,
    facultyClashes: 1,
    venueCollisions: 1,
    windowViolations: 1,
    incidents: [
      {
        id: 'ICONT-1041',
        severity: 'HARD',
        type: 'FACULTY_CLASH',
        resourceEntity: 'Dr. A. Ramanathan',
        description: 'Direct Double-Booking: 22CSSPCDAA (5th Sem CSE-B) vs 22CS7PECS (7th Sem CSE-A).',
        affectedEntities: [
          '5th Sem CSE-B • 22CSSPCDAA (Design & Analysis of Algo) • Room PJ-302',
          '7th Sem CSE-A • 22CS7PECS (Cloud Security & Audit) • Seminar Hall 2',
        ],
        slot: 'Mon Period 2 (09:30–10:30 AM)',
        constraintRef: 'HC-01: Zero Faculty Concurrency Violation',
        rootCause:
          '7th Semester elective cohort merged during Section A finalization without releasing the core assignment in 5th Semester CSE-B.',
      },
      {
        id: 'ICONT-1042',
        severity: 'HARD',
        type: 'VENUE_COLLISION',
        resourceEntity: 'Systems Lab 1 (CS-L1)',
        description: 'Room Dual Allocation: 22CSSL01 (5 B1) vs 22CS3L02 (3 B2).',
        affectedEntities: [
          '5th Sem Batch B1 • 22CSSL01 • Systems Lab 1 (CS-L1)',
          '3rd Sem Batch B2 • 22CS3L02 • Systems Lab 1 (CS-L1)',
        ],
        slot: 'Wed P6–P7 (02:45–04:45 PM)',
        constraintRef: 'HC-02: Room Single-Occupancy',
        rootCause: 'Concurrent allocation of 40-seat Systems Lab 1 to two distinct practical batches.',
      },
      {
        id: 'ICONT-1043',
        severity: 'HARD',
        type: 'LAB_SPLIT',
        resourceEntity: '5th Sem CSE-B (Batch B2)',
        description: '2-Hour Practical Block: 22CSSL01 Networks Lab requires 3h contiguous.',
        affectedEntities: ['5th Sem CSE-B Batch B2 • 22CSSL01 Networks Lab'],
        slot: 'Fri Periods 5 & 6 (01:45–03:45 PM)',
        constraintRef: 'HC-06 / NEP 2022 Clause 4.3: Lab Contiguity',
        rootCause: 'Practical laboratory allocated only 2 discrete periods instead of mandatory 3-hour NEP block.',
      },
      {
        id: 'ICONT-1044',
        severity: 'SOFT',
        type: 'WINDOW_VIOLATION',
        resourceEntity: '5th Sem CSE-B',
        description: '4 Consecutive Theory Slots: Exceeds recommended 2h continuous lecture cap.',
        affectedEntities: ['5th Sem CSE-B • Thu Periods 1–4'],
        slot: 'Thu Periods 1–4 (08:30–12:45 PM)',
        constraintRef: 'SC-02: Cognitive Load Cap',
      },
      {
        id: 'ICONT-1045',
        severity: 'SOFT',
        type: 'WINDOW_VIOLATION',
        resourceEntity: 'Dr. P. Jayashree',
        description: 'Workload Cap +1.5h: 17.5 hrs/wk (AICTE standard 16.0 hrs/wk).',
        affectedEntities: ['Dr. P. Jayashree — Cumulative Weekly Total (17.5h)'],
        slot: 'Cumulative Weekly Total',
        constraintRef: 'SC-04: Faculty Load Balancing',
      },
    ],
    recommendations: [
      'Demo suggestion: Proxy-assign Mon Period 2 (22CSSPCDAA) to Prof. S. Malathi (0 concurrent lectures, 16.0h / 18.0h weekly load).',
      'Demo suggestion: Relocate 3rd Sem Batch B2 practical (22CS3L02) from CS-L1 to Software Lab 2 (CS-L2) on Wed P6–P7.',
      'Demo suggestion: Extend Fri Networks Lab (22CSSL01) to 3 contiguous periods (P5–P7) for NEP 2022 compliance.',
    ],
  };

  return res.json({ data });
});
