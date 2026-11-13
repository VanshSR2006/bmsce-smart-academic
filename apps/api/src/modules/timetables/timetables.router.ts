import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';

export const timetablesRouter = Router();

// Student personalized dashboard view matching design/student-dashboard.png
timetablesRouter.get('/students/me/dashboard', async (req: Request, res: Response) => {
  // Find active 5th sem section
  const section = await prisma.section.findFirst({
    where: { sectionCode: 'CSE-5B' },
    include: {
      academicTerm: true,
      batches: true,
    },
  });

  if (!section) {
    return res.status(404).json({ error: { code: 'SECTION_NOT_FOUND', message: 'Demo section not found' } });
  }

  // Get active published timetable version
  const timetableVersion = await prisma.timetableVersion.findFirst({
    where: { status: 'PUBLISHED' },
    include: {
      sessions: {
        include: {
          subjectOffering: { include: { subject: true } },
          faculty: { include: { user: true } },
          room: true,
        },
      },
    },
    orderBy: { versionNumber: 'desc' },
  });

  // Today's timeline slots (Monday = day 1 for demo purposes)
  const todaySlots = timetableVersion?.sessions
    .filter((s) => s.dayOfWeek === 1)
    .sort((a, b) => (a.startPeriodNumber || 0) - (b.startPeriodNumber || 0))
    .map((s) => ({
      id: s.id,
      courseCode: s.subjectOffering.subject.subjectCode,
      courseTitle: s.subjectOffering.subject.name,
      facultyName: s.faculty.user.displayName,
      roomCode: s.room.roomCode,
      startTime: s.startTime,
      endTime: s.endTime,
      durationPeriods: s.durationPeriods,
      isLab: s.sessionKind === 'LAB',
      status: s.startPeriodNumber === 1 ? 'Finished' : s.startPeriodNumber === 2 ? 'Finished' : s.startPeriodNumber === 3 ? 'Current Active' : 'Up Next',
    })) || [];

  return res.json({
    data: {
      student: {
        name: 'Arjun',
        usn: 'DEMO-USN-2024-015',
        department: 'Dept of Computer Science & Engineering',
        semesterLabel: '5th Sem CSE-B',
        academicYearLabel: 'Academic Year 2024–25 (Odd Semester)',
        timetableVersionLabel: 'Synthetic Timetable v4.2',
        campusBeacon: 'PJ-Block EDUROAM_BMSCE_5G',
      },
      summaryCards: {
        todaySchedule: {
          title: "Today's Schedule",
          mainText: '4 Lec + 1 Lab Block',
          subText: '7 Contact Hours Total',
          tag: 'Active Routine: Normal Day Schedule',
        },
        nextUp: {
          title: 'Next Up',
          mainText: 'DEMO-CS302 DBMS',
          subText: 'In 22 Mins • Sample Room PJ-302',
          slotInfo: 'Slot #4: 11:15 AM – 12:15 PM',
        },
        weeklyLoad: {
          title: 'Weekly Schedule Load',
          mainText: '28 Periods Total',
          subText: 'Demo Section CSE-B',
          detail: '20 Lec + 8 Practical (100% Allocated)',
        },
        nextMilestone: {
          title: 'Next Milestone',
          mainText: 'CIE-2 Examination',
          subText: 'Starts in 11 Days • Oct 28',
          tag: 'Internal Assessment Round 2',
        },
      },
      activeSessionHero: {
        badge: 'IN PROGRESS • 10:15 AM — 11:15 AM',
        category: 'Core Theory • Slot #3',
        courseCode: 'DEMO-CS301',
        courseTitle: 'Data Structures & Algorithms',
        roomLabel: 'Sample Room PJ-301 (Platinum Jubilee Block 3rd Floor)',
        facultyLabel: 'Sample Faculty A (Professor & Course Coordinator)',
        currentModule: 'Module 3: Non-Linear Structures (Binary Search Trees & Heap Operations)',
        timeRemainingText: 'Time Remaining: 22 mins',
        progressPct: 63,
      },
      todayTimeline: todaySlots,
      todaySchedule: todaySlots,
      announcements: [
        {
          id: 'ann-1',
          type: 'Rescheduling Alert',
          isUrgent: true,
          timestamp: 'Today • 08:30 AM',
          title: "Tomorrow's DEMO-CS303 Tutorial Shifted",
          body: 'Wednesday 08:00 AM Computer Networks tutorial has been moved to Thursday 03:15 PM in Sample Room PJ-302 due to venue setup.',
          author: 'By: Sample Faculty C (Course Coordinator) • Requires Student Ack',
        },
        {
          id: 'ann-2',
          type: 'Lab Submission Reminder',
          isUrgent: false,
          timestamp: 'Yesterday',
          title: 'DEMO-LAB301 Practicum Stubs & Lab Report 4 Due',
          body: 'Uploaded submission template for Relational Algebra query evaluation. Verify execution results with Sample Lab Instructor X prior to Friday viva.',
          attachment: 'DEMO_LAB_Assignment_04.pdf (1.8 MB)',
        },
        {
          id: 'ann-3',
          type: 'Class Representative Notice',
          isUrgent: false,
          timestamp: 'Oct 14',
          title: 'Technical Seminar Topic Approval Extended',
          body: 'Following discussions with faculty advisors, final topic approvals for all Batch B groups will remain open until Friday 05:00 PM.',
        },
      ],
      examMilestones: [
        { date: 'OCT 28', code: 'DEMO-CS301', title: 'Data Structures & Algorithms', time: '09:30 AM – 11:00 AM', room: 'Sample Room PJ-301', marks: 50 },
        { date: 'OCT 29', code: 'DEMO-CS302', title: 'Database Management Systems', time: '09:30 AM – 11:00 AM', room: 'Sample Room PJ-302', marks: 50 },
        { date: 'OCT 30', code: 'DEMO-CS303', title: 'Computer Networks', time: '09:30 AM – 11:00 AM', room: 'Sample Room PJ-302', marks: 50 },
        { date: 'NOV 02', code: 'DEMO-CS304', title: 'Operating Systems', time: '02:00 PM – 03:30 PM', room: 'Sample Room PJ-301', marks: 50 },
      ],
      calendarHighlights: {
        termProgress: 'Demo Term Week 7 of 16',
        lastWorkingDay: 'Dec 12, 2024',
        labExamWindow: 'Dec 16 – 21, 2024',
      },
      masterScheduleBadge: {
        label: 'CSE-B MASTER SCHEDULE V4.2',
        status: 'ACTIVE',
        signedBy: 'Signed by Dean Academics (Dr. P. Jayashree)',
      },
    },
  });
});

// Weekly Master Timetable Grid matching design/student-timetable.png
timetablesRouter.get('/sections/:sectionId/timetable', async (req: Request, res: Response) => {
  const section = await prisma.section.findFirst({
    where: { sectionCode: 'CSE-5B' },
    include: { department: true, academicTerm: true, batches: true },
  });

  const version = await prisma.timetableVersion.findFirst({
    where: { status: 'PUBLISHED' },
    include: {
      sessions: {
        include: {
          subjectOffering: { include: { subject: true } },
          faculty: { include: { user: true } },
          room: true,
          batch: true,
        },
      },
    },
    orderBy: { versionNumber: 'desc' },
  });

  const bellSchedule = await prisma.bellSchedule.findFirst({
    include: { periods: { orderBy: { periodNumber: 'asc' } } },
  });

  const slots = version?.sessions.map((s) => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    periodNumber: s.startPeriodNumber || 1,
    startTime: s.startTime,
    endTime: s.endTime,
    durationPeriods: s.durationPeriods,
    courseCode: s.subjectOffering.subject.subjectCode,
    courseTitle: s.subjectOffering.subject.name,
    subjectType: s.subjectOffering.subject.subjectType,
    facultyName: s.faculty.user.displayName,
    facultyId: s.facultyId,
    roomCode: s.room.roomCode,
    roomId: s.roomId,
    sectionCode: 'CSE-5B',
    sectionId: s.sectionId,
    batchCode: s.batch?.batchCode || null,
    isLab: s.sessionKind === 'LAB',
    isContiguous: s.durationPeriods > 1,
  })) || [];

  return res.json({
    data: {
      section: { sectionCode: section?.sectionCode || 'CSE-5B' },
      sessions: slots,
      academicTermLabel: 'Odd Semester 2024–25',
      sectionCode: 'Demo Section CSE-5B',
      departmentName: 'Department of Computer Science & Engineering',
      classInCharge: 'Dr. P. Jayashree',
      primaryRoom: 'PJ-302',
      versionLabel: 'v4.2-ACTIVE',
      scheduleNotice: 'Thursday 11:45 AM Computer Networks (CN) lecture relocated to Seminar Hall 2 for guest lecture by Dr. Ramanathan (IEEE). [Temporary Shift]',
      periods: bellSchedule?.periods || [],
      slots,
      batches: [
        { code: 'ALL', label: 'All Batches' },
        { code: 'B1', label: 'Batch B1 (01–25)' },
        { code: 'B2', label: 'Batch B2 (26–50)' },
        { code: 'B3', label: 'Batch B3 (51+)' },
      ],
      loadBreakdown: {
        coreTheoryHrs: 16,
        labPracticalHrs: 6,
        tutorialsHrs: 2,
        projectSeminarHrs: 2,
        totalHrs: 26,
        requiredAttendancePct: 75,
      },
      facultyDirectory: [
        { code: '22CSSPCDAA', title: 'DAA', faculty: 'Dr. A. Ramanathan', ext: 'Ext 3101' },
        { code: '22CSSPCDBMS', title: 'DBMS', faculty: 'Prof. Sneha K.', ext: 'Ext 3102' },
        { code: '22CSSPCCNT', title: 'CN', faculty: 'Dr. Rajeshwari V.', ext: 'Ext 3103' },
        { code: '22CSSPCOPS', title: 'OS', faculty: 'Prof. Vikram Sen', ext: 'Ext 3104' },
      ],
      governance: {
        status: 'DAAB Approved',
        hod: 'Dr. K. R. Suresh',
        principal: 'Dr. B. V. Ravishankar',
        docId: 'BMSCE/CSE/TT/24-25/5B-R4',
        effectiveDate: '14 Oct 2024',
      },
    },
  });
});

