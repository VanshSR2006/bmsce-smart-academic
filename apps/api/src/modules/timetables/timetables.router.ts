import { Router, Request, Response } from 'express';
import { prisma } from '../../config/prisma.js';

export const timetablesRouter = Router();

/**
 * Resolve a Section by database UUID, exact sectionCode, or 'demo' alias
 * (first active section ordered by sectionCode). Never hardcodes 'CSE-5B'.
 */
async function resolveRequestedSection(sectionParam: string) {
  const include = {
    department: true,
    academicTerm: true,
    batches: { orderBy: { batchCode: 'asc' as const } },
  };

  if (sectionParam.toLowerCase() === 'demo') {
    return prisma.section.findFirst({
      where: { status: 'ACTIVE' },
      include,
      orderBy: { sectionCode: 'asc' },
    });
  }

  return prisma.section.findFirst({
    where: {
      OR: [{ id: sectionParam }, { sectionCode: sectionParam }],
    },
    include,
  });
}

// Student personalized dashboard view
timetablesRouter.get('/students/me/dashboard', async (req: Request, res: Response) => {
  const section = req.user?.sectionId
    ? await prisma.section.findUnique({
        where: { id: req.user.sectionId },
        include: { academicTerm: true, batches: true, department: true },
      })
    : await prisma.section.findFirst({
        where: { status: 'ACTIVE' },
        include: { academicTerm: true, batches: true, department: true },
        orderBy: { sectionCode: 'asc' },
      });

  if (!section) {
    return res.status(404).json({
      error: { code: 'SECTION_NOT_FOUND', message: 'No active section found for dashboard' },
    });
  }

  const timetableVersion = await prisma.timetableVersion.findFirst({
    where: {
      status: 'PUBLISHED',
      timetable: {
        academicTermId: section.academicTermId,
        departmentId: section.departmentId,
      },
    },
    include: {
      sessions: {
        where: { sectionId: section.id },
        include: {
          subjectOffering: { include: { subject: true } },
          faculty: { include: { user: true } },
          room: true,
        },
      },
    },
    orderBy: { versionNumber: 'desc' },
  });

  const todaySlots =
    timetableVersion?.sessions
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
        status:
          s.startPeriodNumber === 1 || s.startPeriodNumber === 2
            ? 'Finished'
            : s.startPeriodNumber === 3
              ? 'Current Active'
              : 'Up Next',
      })) || [];

  const totalWeeklyPeriods =
    timetableVersion?.sessions.reduce((acc, s) => acc + (s.durationPeriods || 1), 0) ?? 0;

  return res.json({
    data: {
      isDemoMetadata: true,
      student: {
        name: req.user?.displayName || 'Demo Student',
        usn: 'DEMO-USN-00015',
        department: section.department?.name || 'Department',
        semesterLabel: `${section.semesterNumber}th Sem ${section.sectionCode}`,
        academicYearLabel: section.academicTerm
          ? `${section.academicTerm.academicYearLabel} (${section.academicTerm.termLabel})`
          : 'Academic Term',
        timetableVersionLabel: timetableVersion
          ? `Timetable v${timetableVersion.versionNumber}`
          : 'No Published Timetable',
        campusBeacon: 'PJ-Block EDUROAM_BMSCE_5G',
      },
      summaryCards: {
        todaySchedule: {
          title: "Today's Schedule",
          mainText: `${todaySlots.length} Session(s)`,
          subText: `${todaySlots.reduce((a, s) => a + (s.durationPeriods || 1), 0)} Contact Hours`,
          tag: 'Active Routine: Normal Day Schedule',
        },
        nextUp: {
          title: 'Next Up',
          mainText: todaySlots[0]?.courseCode || 'No Scheduled Session',
          subText: todaySlots[0]?.roomCode || '—',
          slotInfo: todaySlots[0]
            ? `${todaySlots[0].startTime} – ${todaySlots[0].endTime}`
            : 'No sessions today',
        },
        weeklyLoad: {
          title: 'Weekly Schedule Load',
          mainText: `${totalWeeklyPeriods} Periods Total`,
          subText: section.displayName || section.sectionCode,
          detail: timetableVersion ? 'From published timetable' : 'No published timetable',
        },
        nextMilestone: {
          title: 'Next Milestone',
          mainText: 'CIE-2 Examination (Demo)',
          subText: 'Demo Academic Calendar Placeholder',
          tag: 'Synthetic Preview',
        },
      },
      activeSessionHero: {
        badge: todaySlots[0]
          ? `NEXT • ${todaySlots[0].startTime} — ${todaySlots[0].endTime}`
          : 'NO ACTIVE SESSION',
        category: todaySlots[0]?.isLab ? 'Lab Practical' : 'Core Theory',
        courseCode: todaySlots[0]?.courseCode || '—',
        courseTitle: todaySlots[0]?.courseTitle || 'No session scheduled',
        roomLabel: todaySlots[0]?.roomCode || '—',
        facultyLabel: todaySlots[0]?.facultyName || '—',
        currentModule: 'Demo placeholder — module tracking not yet wired',
        timeRemainingText: '—',
        progressPct: 0,
      },
      todayTimeline: todaySlots,
      todaySchedule: todaySlots,
      announcements: [],
      examMilestones: [],
      calendarHighlights: {
        termProgress: section.academicTerm?.termLabel || 'Active Term',
        lastWorkingDay: section.academicTerm?.endDate
          ? section.academicTerm.endDate.toISOString().slice(0, 10)
          : '—',
        labExamWindow: '—',
      },
      masterScheduleBadge: {
        label: `${section.sectionCode} SCHEDULE`,
        status: timetableVersion ? timetableVersion.status : 'NONE',
        signedBy: '—',
      },
    },
  });
});

// Section-scoped Weekly Master Timetable Grid
timetablesRouter.get('/sections/:sectionId/timetable', async (req: Request, res: Response) => {
  const { sectionId } = req.params;
  const section = await resolveRequestedSection(sectionId);

  if (!section) {
    return res.status(404).json({
      error: {
        code: 'SECTION_NOT_FOUND',
        message: `Section "${sectionId}" was not found.`,
      },
    });
  }

  const version = await prisma.timetableVersion.findFirst({
    where: {
      status: 'PUBLISHED',
      timetable: {
        academicTermId: section.academicTermId,
        departmentId: section.departmentId,
      },
    },
    include: {
      approvedBy: true,
      sessions: {
        where: { sectionId: section.id },
        include: {
          subjectOffering: { include: { subject: true } },
          faculty: { include: { user: true } },
          room: true,
          batch: true,
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startPeriodNumber: 'asc' }],
      },
    },
    orderBy: { versionNumber: 'desc' },
  });

  const bellSchedule = await prisma.bellSchedule.findFirst({
    where: { academicTermId: section.academicTermId },
    include: { periods: { orderBy: { periodNumber: 'asc' } } },
  });

  const slots =
    version?.sessions.map((s) => ({
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
      sectionCode: section.sectionCode,
      sectionId: section.id,
      batchCode: s.batch?.batchCode || null,
      isLab: s.sessionKind === 'LAB',
      isContiguous: s.durationPeriods > 1,
    })) || [];

  // Compute load breakdown from actual section slots
  let coreTheoryHrs = 0;
  let labPracticalHrs = 0;
  let tutorialsHrs = 0;
  let projectSeminarHrs = 0;
  const roomCounts = new Map<string, number>();

  for (const sl of slots) {
    const dur = sl.durationPeriods || 1;
    roomCounts.set(sl.roomCode, (roomCounts.get(sl.roomCode) || 0) + dur);
    if (sl.isLab || sl.subjectType === 'LAB') {
      labPracticalHrs += dur;
    } else if (sl.subjectType === 'TUTORIAL') {
      tutorialsHrs += dur;
    } else if (sl.subjectType === 'PROJECT') {
      projectSeminarHrs += dur;
    } else {
      coreTheoryHrs += dur;
    }
  }

  let primaryRoom = 'Unassigned';
  let maxRoomCount = 0;
  for (const [rm, cnt] of roomCounts.entries()) {
    if (cnt > maxRoomCount) {
      maxRoomCount = cnt;
      primaryRoom = rm;
    }
  }

  // Derive faculty directory from section's assigned offerings (or active slots)
  const directoryMap = new Map<string, { code: string; title: string; faculty: string; ext: string }>();
  if (slots.length > 0 && version) {
    for (const s of version.sessions) {
      const key = `${s.subjectOffering.subject.subjectCode}:${s.facultyId}`;
      if (!directoryMap.has(key)) {
        directoryMap.set(key, {
          code: s.subjectOffering.subject.subjectCode,
          title: s.subjectOffering.subject.name,
          faculty: s.faculty.user.displayName,
          ext: s.faculty.cabinLocation || '—',
        });
      }
    }
  } else {
    const offerings = await prisma.subjectOffering.findMany({
      where: { sectionId: section.id, academicTermId: section.academicTermId },
      include: {
        subject: true,
        facultyAssignments: { include: { faculty: { include: { user: true } } } },
      },
    });
    for (const off of offerings) {
      for (const fa of off.facultyAssignments) {
        const key = `${off.subject.subjectCode}:${fa.facultyId}`;
        if (!directoryMap.has(key)) {
          directoryMap.set(key, {
            code: off.subject.subjectCode,
            title: off.subject.name,
            faculty: fa.faculty.user.displayName,
            ext: fa.faculty.cabinLocation || '—',
          });
        }
      }
    }
  }

  const batches = [
    { code: 'ALL', label: 'All Batches' },
    ...section.batches.map((b) => ({ code: b.batchCode, label: b.displayName })),
  ];

  return res.json({
    data: {
      hasTimetable: Boolean(version && slots.length > 0),
      isDemoData: Boolean(section.department?.isDemo || section.academicTerm?.isDemo),
      section: {
        id: section.id,
        sectionCode: section.sectionCode,
        displayName: section.displayName,
        semesterNumber: section.semesterNumber,
        studentCount: section.studentCount,
      },
      sessions: slots,
      academicTermLabel: section.academicTerm
        ? `${section.academicTerm.termLabel} ${section.academicTerm.academicYearLabel}`
        : 'Unassigned Term',
      sectionCode: section.sectionCode,
      departmentName: section.department?.name || 'Department',
      classInCharge: 'Not assigned in schema',
      primaryRoom,
      versionLabel: version ? `v${version.versionNumber}-${version.status}` : 'NO_TIMETABLE',
      scheduleNotice: version?.changeSummary || 'No active schedule notices for this section.',
      periods: bellSchedule?.periods || [],
      slots,
      batches,
      loadBreakdown: {
        coreTheoryHrs,
        labPracticalHrs,
        tutorialsHrs,
        projectSeminarHrs,
        totalHrs: coreTheoryHrs + labPracticalHrs + tutorialsHrs + projectSeminarHrs,
        requiredAttendancePct: 75,
      },
      facultyDirectory: Array.from(directoryMap.values()),
      governance: {
        status: version ? version.status : 'NO_TIMETABLE',
        hod: version?.approvedBy?.displayName || 'Not assigned',
        principal: 'Not tracked in schema',
        docId: version ? `V${version.versionNumber}-${section.sectionCode}` : '—',
        effectiveDate: version?.publishedAt ? version.publishedAt.toISOString().slice(0, 10) : '—',
      },
    },
  });
});
