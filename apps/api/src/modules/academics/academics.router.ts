import { Router, Request, Response, NextFunction } from 'express';
import type {
  NepSchemeCategory,
  NepSchemeCourse,
  NepSchemeOverview,
  RoomsOverview,
  WorkloadOverview,
} from '@bmsce/contracts';
import { prisma } from '../../config/prisma.js';

export const academicsRouter = Router();

function parseQueryId(val: unknown): string | null {
  return typeof val === 'string' && val.trim() ? val.trim() : null;
}

// ============================================================================
// 1. Faculty Workload Overview (/api/v1/workload/overview)
// ============================================================================
academicsRouter.get(
  '/workload/overview',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departmentId = parseQueryId(req.query.departmentId);
      const academicTermId = parseQueryId(req.query.academicTermId);

      const [departments, academicTerms] = await Promise.all([
        prisma.department.findMany({ orderBy: { code: 'asc' } }),
        prisma.academicTerm.findMany({ orderBy: { createdAt: 'desc' } }),
      ]);

      const selectedDept = departmentId
        ? departments.find((d) => d.id === departmentId) ?? null
        : null;
      if (departmentId && !selectedDept) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Department '${departmentId}' was not found.` },
        });
      }

      const selectedTerm = academicTermId
        ? academicTerms.find((t) => t.id === academicTermId) ?? null
        : null;
      if (academicTermId && !selectedTerm) {
        return res.status(404).json({
          error: { code: 'NOT_FOUND', message: `Academic term '${academicTermId}' was not found.` },
        });
      }

      const facultyList = await prisma.faculty.findMany({
        where: {
          ...(departmentId ? { departmentId } : {}),
        },
        include: {
          user: { select: { displayName: true, institutionalEmail: true } },
          department: { select: { id: true, code: true, name: true } },
          workloadRules: {
            where: { ...(academicTermId ? { academicTermId } : {}) },
          },
          availability: {
            where: { ...(academicTermId ? { academicTermId } : {}) },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
          assignments: {
            where: {
              status: 'ACTIVE',
              ...(academicTermId ? { subjectOffering: { academicTermId } } : {}),
            },
            include: {
              subjectOffering: {
                include: {
                  subject: { select: { subjectCode: true, name: true } },
                  section: { select: { sectionCode: true } },
                },
              },
            },
          },
          sessions: {
            where: {
              timetableVersion: {
                status: 'PUBLISHED',
                ...(academicTermId ? { timetable: { academicTermId } } : {}),
              },
            },
            include: {
              subjectOffering: { select: { requiresLab: true } },
            },
          },
        },
        orderBy: [{ user: { displayName: 'asc' } }],
      });

      const dayNumberMap: Record<number, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'> = {
        1: 'MON',
        2: 'TUE',
        3: 'WED',
        4: 'THU',
        5: 'FRI',
      };

      const facultyWorkloads = facultyList.map((f) => {
        const rule = f.workloadRules[0] ?? null;
        const hasWorkloadRule = rule !== null;
        const maxWeeklyHours = rule?.maxPeriodsPerWeek ?? null;
        const maxDailyHours = rule?.maxPeriodsPerDay ?? null;

        const assignedCourses = f.assignments.map((a) => ({
          subjectCode: a.subjectOffering.subject.subjectCode,
          subjectName: a.subjectOffering.subject.name,
          sectionCode: a.subjectOffering.section.sectionCode,
          requiredPeriodsPerWeek: a.subjectOffering.requiredPeriodsPerWeek,
        }));

        const assignedWeeklyHours =
          Math.round(
            assignedCourses.reduce((sum, c) => sum + c.requiredPeriodsPerWeek, 0) * 10
          ) / 10;

        const dailyHours = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0 };
        let theoryHours = 0;
        let labHours = 0;

        for (const s of f.sessions) {
          const dayName = dayNumberMap[s.dayOfWeek];
          const hours = s.durationPeriods || 1;
          if (dayName) {
            dailyHours[dayName] += hours;
          }
          if (s.sessionKind === 'LAB' || s.subjectOffering?.requiresLab) {
            labHours += hours;
          } else {
            theoryHours += hours;
          }
        }

        const scheduledWeeklyHours = theoryHours + labHours;
        const peakDailyHours = Math.max(...Object.values(dailyHours));
        const remainingCapacityHours =
          maxWeeklyHours !== null
            ? Math.round((maxWeeklyHours - assignedWeeklyHours) * 10) / 10
            : null;
        const allocationDiscrepancyHours =
          Math.round((scheduledWeeklyHours - assignedWeeklyHours) * 10) / 10;
        const utilizationPct =
          maxWeeklyHours !== null && maxWeeklyHours > 0
            ? Math.round((assignedWeeklyHours / maxWeeklyHours) * 100)
            : null;

        let workloadStatus: 'OPTIMAL' | 'OVERLOAD' | 'UNDERLOAD' | 'STANDBY' | 'UNCONFIGURED' =
          'UNCONFIGURED';
        if (!hasWorkloadRule || maxWeeklyHours === null) {
          workloadStatus = 'UNCONFIGURED';
        } else {
          const isWeeklyOverload = assignedWeeklyHours > maxWeeklyHours;
          const isDailyOverload = maxDailyHours !== null && peakDailyHours > maxDailyHours;
          if (isWeeklyOverload || isDailyOverload) {
            workloadStatus = 'OVERLOAD';
          } else if (assignedWeeklyHours === 0) {
            workloadStatus = 'STANDBY';
          } else if (assignedWeeklyHours < Math.max(1, Math.round(maxWeeklyHours * 0.6))) {
            workloadStatus = 'UNDERLOAD';
          } else {
            workloadStatus = 'OPTIMAL';
          }
        }

        return {
          facultyId: f.id,
          name: f.user.displayName,
          email: f.user.institutionalEmail,
          employeeCode: f.employeeCode,
          designation: f.designation,
          departmentId: f.department.id,
          departmentName: f.department.name,
          cabinLocation: f.cabinLocation,
          status: f.status,
          hasWorkloadRule,
          maxWeeklyHours,
          maxDailyHours,
          assignedWeeklyHours,
          scheduledWeeklyHours,
          remainingCapacityHours,
          allocationDiscrepancyHours,
          theoryHours,
          labHours,
          dailyHours,
          peakDailyHours,
          utilizationPct,
          workloadStatus,
          assignedCourses,
          availabilitySlots: f.availability.map((av) => ({
            id: av.id,
            availabilityType: av.availabilityType,
            dayOfWeek: av.dayOfWeek,
            startTime: av.startTime,
            endTime: av.endTime,
            reason: av.reason,
          })),
        };
      });

      const totalFaculty = facultyWorkloads.length;
      const activeFacultyCount = facultyWorkloads.filter((f) => f.status === 'ACTIVE').length;
      const configuredRulesCount = facultyWorkloads.filter((f) => f.hasWorkloadRule).length;
      const totalAssignedHours =
        Math.round(facultyWorkloads.reduce((acc, f) => acc + f.assignedWeeklyHours, 0) * 10) / 10;
      const totalScheduledHours =
        Math.round(facultyWorkloads.reduce((acc, f) => acc + f.scheduledWeeklyHours, 0) * 10) / 10;

      const avgAssignedHoursPerWeek =
        totalFaculty > 0 ? Math.round((totalAssignedHours / totalFaculty) * 10) / 10 : null;
      const avgScheduledHoursPerWeek =
        totalFaculty > 0 ? Math.round((totalScheduledHours / totalFaculty) * 10) / 10 : null;

      const balancedCount = facultyWorkloads.filter((f) => f.workloadStatus === 'OPTIMAL').length;
      const overloadCount = facultyWorkloads.filter((f) => f.workloadStatus === 'OVERLOAD').length;
      const underloadCount = facultyWorkloads.filter(
        (f) => f.workloadStatus === 'UNDERLOAD' || f.workloadStatus === 'STANDBY'
      ).length;
      const unconfiguredCount = facultyWorkloads.filter(
        (f) => f.workloadStatus === 'UNCONFIGURED'
      ).length;
      const compliantPct =
        configuredRulesCount > 0
          ? Math.round((balancedCount / configuredRulesCount) * 100)
          : null;

      const payload: WorkloadOverview = {
        hasData: totalFaculty > 0,
        isDemoData:
          departments.some((d) => d.isDemo) || academicTerms.some((t) => t.isDemo),
        appliedFilters: { departmentId, academicTermId },
        availableFilters: {
          departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
          academicTerms: academicTerms.map((t) => ({
            id: t.id,
            academicYearLabel: t.academicYearLabel,
            termLabel: t.termLabel,
          })),
        },
        scopeLabel: {
          department: selectedDept ? `${selectedDept.code} — ${selectedDept.name}` : 'All Departments',
          academicTerm: selectedTerm
            ? `${selectedTerm.academicYearLabel} (${selectedTerm.termLabel})`
            : 'All Academic Terms',
        },
        metrics: {
          totalFaculty,
          activeFacultyCount,
          configuredRulesCount,
          avgAssignedHoursPerWeek,
          avgScheduledHoursPerWeek,
          totalAssignedHours,
          totalScheduledHours,
          balancedCount,
          overloadCount,
          underloadCount,
          unconfiguredCount,
          compliantPct,
        },
        faculty: facultyWorkloads,
        schemaLimitations: [
          'Actual classroom attendance is not stored in the schema; scheduled hours reflect published TimetableSession records while assigned hours reflect FacultyAssignment and SubjectOffering.',
          'Faculty without a matching FacultyWorkloadRule are marked UNCONFIGURED rather than assuming default limits.',
        ],
      };

      return res.json({ data: payload });
    } catch (err) {
      return next(err);
    }
  }
);

// ============================================================================
// 2. Room & Smart Lab Management (/api/v1/rooms/overview)
// ============================================================================
academicsRouter.get('/rooms/overview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const departmentId = parseQueryId(req.query.departmentId);
    const academicTermId = parseQueryId(req.query.academicTermId);

    const [departments, academicTerms] = await Promise.all([
      prisma.department.findMany({ orderBy: { code: 'asc' } }),
      prisma.academicTerm.findMany({ orderBy: { createdAt: 'desc' } }),
    ]);

    const selectedDept = departmentId
      ? departments.find((d) => d.id === departmentId) ?? null
      : null;
    if (departmentId && !selectedDept) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Department '${departmentId}' was not found.` },
      });
    }

    const selectedTerm = academicTermId
      ? academicTerms.find((t) => t.id === academicTermId) ?? null
      : null;
    if (academicTermId && !selectedTerm) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Academic term '${academicTermId}' was not found.` },
      });
    }

    const [rooms, bellSchedules] = await Promise.all([
      prisma.room.findMany({
        where: { ...(departmentId ? { departmentId } : {}) },
        include: {
          department: { select: { id: true, name: true } },
          roomFeatures: { include: { feature: true } },
          availability: {
            where: { ...(academicTermId ? { academicTermId } : {}) },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
          sessions: {
            where: {
              timetableVersion: {
                status: 'PUBLISHED',
                ...(academicTermId ? { timetable: { academicTermId } } : {}),
              },
            },
            include: {
              section: { select: { sectionCode: true, studentCount: true } },
              subjectOffering: { select: { expectedStudentCount: true } },
            },
          },
        },
        orderBy: { roomCode: 'asc' },
      }),
      prisma.bellSchedule.findMany({
        where: { ...(academicTermId ? { academicTermId } : {}) },
        include: {
          periods: { where: { periodType: 'CLASS' } },
        },
        orderBy: [{ isDefault: 'desc' }, { effectiveFrom: 'desc' }],
        take: 1,
      }),
    ]);

    const classPeriodsCount = bellSchedules[0]?.periods.length ?? 0;
    const weeklyAvailablePeriods = classPeriodsCount > 0 ? classPeriodsCount * 5 : null;

    const dayMap: Record<number, 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI'> = {
      1: 'MON',
      2: 'TUE',
      3: 'WED',
      4: 'THU',
      5: 'FRI',
    };

    const roomInventory = rooms.map((r) => {
      const allocatedSessionsCount = r.sessions.length;
      const allocatedWeeklyHours = r.sessions.reduce(
        (acc, s) => acc + (s.durationPeriods || 1),
        0
      );
      const utilizationPct =
        weeklyAvailablePeriods !== null && weeklyAvailablePeriods > 0
          ? Math.min(100, Math.round((allocatedWeeklyHours / weeklyAvailablePeriods) * 100))
          : null;
      const freeWeeklyPeriods =
        weeklyAvailablePeriods !== null
          ? Math.max(0, weeklyAvailablePeriods - allocatedWeeklyHours)
          : null;

      const daySchedule = { MON: 0, TUE: 0, WED: 0, THU: 0, FRI: 0 };
      const byDay = new Map<number, Array<{ startTime: string; endTime: string }>>();
      const capacityMismatches: Array<{
        sectionCode: string;
        expectedStudentCount: number;
        roomCapacity: number;
      }> = [];
      const seenMismatchSections = new Set<string>();

      for (const s of r.sessions) {
        const dayName = dayMap[s.dayOfWeek];
        if (dayName) {
          daySchedule[dayName] += s.durationPeriods || 1;
        }
        const dayList = byDay.get(s.dayOfWeek) ?? [];
        dayList.push({ startTime: s.startTime, endTime: s.endTime });
        byDay.set(s.dayOfWeek, dayList);

        const expected = s.subjectOffering?.expectedStudentCount ?? s.section.studentCount;
        if (expected > r.capacity && !seenMismatchSections.has(s.section.sectionCode)) {
          seenMismatchSections.add(s.section.sectionCode);
          capacityMismatches.push({
            sectionCode: s.section.sectionCode,
            expectedStudentCount: expected,
            roomCapacity: r.capacity,
          });
        }
      }

      let collisionCount = 0;
      for (const list of byDay.values()) {
        const sorted = [...list].sort((a, b) => a.startTime.localeCompare(b.startTime));
        for (let i = 1; i < sorted.length; i += 1) {
          if (sorted[i].startTime < sorted[i - 1].endTime) {
            collisionCount += 1;
          }
        }
      }

      const hasUnavailableSlot = r.availability.some(
        (a) => a.availabilityType === 'UNAVAILABLE'
      );
      let currentStatus: 'IN_USE' | 'AVAILABLE' | 'UNAVAILABLE' = 'AVAILABLE';
      if (!r.isActive || hasUnavailableSlot) {
        currentStatus = 'UNAVAILABLE';
      } else if (allocatedSessionsCount > 0) {
        currentStatus = 'IN_USE';
      }

      return {
        roomId: r.id,
        roomCode: r.roomCode,
        name: r.name,
        roomType: r.roomType,
        capacity: r.capacity,
        departmentId: r.department?.id ?? null,
        departmentName: r.department?.name ?? null,
        location: r.locationLabel,
        isActive: r.isActive,
        isLab: r.roomType === 'LAB',
        facilities: r.roomFeatures.map((rf) => rf.feature.name),
        availabilityEntries: r.availability.map((av) => ({
          id: av.id,
          availabilityType: av.availabilityType,
          dayOfWeek: av.dayOfWeek,
          startTime: av.startTime,
          endTime: av.endTime,
          reason: av.reason,
        })),
        allocatedSessionsCount,
        allocatedWeeklyHours,
        freeWeeklyPeriods,
        utilizationPct,
        daySchedule,
        currentStatus,
        collisionCount,
        capacityMismatches,
        collisionStatus: collisionCount > 0 ? ('COLLISION_ALERT' as const) : ('CLEAN' as const),
      };
    });

    const totalRooms = roomInventory.length;
    const activeRoomsCount = roomInventory.filter((r) => r.isActive).length;
    const labCount = roomInventory.filter((r) => r.isLab).length;
    const classroomCount = roomInventory.filter((r) => r.roomType === 'CLASSROOM').length;
    const otherRoomsCount = totalRooms - labCount - classroomCount;
    const roomsWithSessionsCount = roomInventory.filter(
      (r) => r.allocatedSessionsCount > 0
    ).length;
    const unallocatedRoomsCount = totalRooms - roomsWithSessionsCount;
    const collisionCount = roomInventory.reduce((acc, r) => acc + r.collisionCount, 0);
    const capacityMismatchCount = roomInventory.reduce(
      (acc, r) => acc + r.capacityMismatches.length,
      0
    );

    const utilValues = roomInventory
      .map((r) => r.utilizationPct)
      .filter((v): v is number => v !== null);
    const avgUtilizationPct =
      utilValues.length > 0
        ? Math.round(utilValues.reduce((a, b) => a + b, 0) / utilValues.length)
        : null;

    const payload: RoomsOverview = {
      hasData: totalRooms > 0,
      isDemoData:
        rooms.some((r) => r.isDemo) || academicTerms.some((t) => t.isDemo),
      appliedFilters: { departmentId, academicTermId },
      availableFilters: {
        departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
        academicTerms: academicTerms.map((t) => ({
          id: t.id,
          academicYearLabel: t.academicYearLabel,
          termLabel: t.termLabel,
        })),
      },
      scopeLabel: {
        department: selectedDept ? `${selectedDept.code} — ${selectedDept.name}` : 'All Departments',
        academicTerm: selectedTerm
          ? `${selectedTerm.academicYearLabel} (${selectedTerm.termLabel})`
          : 'All Academic Terms',
      },
      weeklyAvailablePeriods,
      metrics: {
        totalRooms,
        activeRoomsCount,
        classroomCount,
        labCount,
        otherRoomsCount,
        avgUtilizationPct,
        roomsWithSessionsCount,
        unallocatedRoomsCount,
        collisionCount,
        capacityMismatchCount,
      },
      rooms: roomInventory,
      schemaLimitations: [
        'Room utilization percentages require a configured BellSchedule with CLASS TimePeriod rows; when absent, utilizationPct and freeWeeklyPeriods are null.',
        'Equipment features reflect RoomFeature records only; rooms without linked features return an empty list.',
      ],
    };

    return res.json({ data: payload });
  } catch (err) {
    return next(err);
  }
});

// ============================================================================
// 3. NEP 2022 Curriculum Scheme Overview (/api/v1/nep-scheme/overview)
// ============================================================================
const SUBJECT_TYPE_LABELS: Record<string, string> = {
  THEORY: 'Theory Courses',
  LAB: 'Laboratory / Practical Courses',
  TUTORIAL: 'Tutorial Courses',
};

academicsRouter.get('/nep-scheme/overview', async (req: Request, res: Response) => {
  const departmentId =
    typeof req.query.departmentId === 'string' && req.query.departmentId.trim()
      ? req.query.departmentId.trim()
      : null;
  const programId =
    typeof req.query.programId === 'string' && req.query.programId.trim()
      ? req.query.programId.trim()
      : null;
  const academicTermId =
    typeof req.query.academicTermId === 'string' && req.query.academicTermId.trim()
      ? req.query.academicTermId.trim()
      : null;

  const [departments, programs, academicTerms, offerings] = await Promise.all([
    prisma.department.findMany({ orderBy: { code: 'asc' } }),
    prisma.program.findMany({ orderBy: { code: 'asc' } }),
    prisma.academicTerm.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.subjectOffering.findMany({
      where: {
        ...(academicTermId ? { academicTermId } : {}),
        ...(departmentId || programId
          ? {
              section: {
                ...(departmentId ? { departmentId } : {}),
                ...(programId ? { programId } : {}),
              },
            }
          : {}),
      },
      include: {
        subject: { include: { department: true } },
        section: true,
        academicTerm: true,
      },
      orderBy: { subject: { subjectCode: 'asc' } },
    }),
  ]);

  // Deduplicate subjects across multiple offerings
  const subjectMap = new Map<
    string,
    {
      course: NepSchemeCourse;
      semesters: Set<number>;
      totalOfferingHours: number;
      labOfferingHours: number;
    }
  >();

  let totalOfferings = 0;
  let totalOfferingWeeklyHours = 0;
  let totalLabOfferingHours = 0;

  for (const off of offerings) {
    totalOfferings += 1;
    const offHrs = Number(off.requiredPeriodsPerWeek) || 0;
    totalOfferingWeeklyHours += offHrs;
    const isLab = off.requiresLab || off.subject.subjectType === 'LAB';
    if (isLab) {
      totalLabOfferingHours += offHrs;
    }

    const existing = subjectMap.get(off.subjectId);
    if (!existing) {
      subjectMap.set(off.subjectId, {
        course: {
          id: off.subject.id,
          code: off.subject.subjectCode,
          name: off.subject.name,
          subjectType: off.subject.subjectType || 'UNSPECIFIED',
          departmentName: off.subject.department?.name || 'Department',
          semesters: [off.section.semesterNumber],
          offeringCount: 1,
          hoursPerWeek: offHrs,
          sessionDurationPeriods: off.sessionDurationPeriods || off.subject.defaultDurationPeriods || 1,
          requiresLab: isLab,
          isLabContiguous: Boolean(off.requiresContiguousSlots),
          credits: null, // Not represented in current Prisma schema
          ltp: null, // Not represented in current Prisma schema
        },
        semesters: new Set([off.section.semesterNumber]),
        totalOfferingHours: offHrs,
        labOfferingHours: isLab ? offHrs : 0,
      });
    } else {
      existing.course.offeringCount += 1;
      existing.semesters.add(off.section.semesterNumber);
      existing.course.semesters = Array.from(existing.semesters).sort((a, b) => a - b);
      existing.course.isLabContiguous = existing.course.isLabContiguous || Boolean(off.requiresContiguousSlots);
      existing.totalOfferingHours += offHrs;
      if (isLab) existing.labOfferingHours += offHrs;
    }
  }

  // Group deduplicated subjects by actual Subject.subjectType (no invented NEP verticals)
  const categoryMap = new Map<string, NepSchemeCategory>();
  let theorySubjectCount = 0;
  let labSubjectCount = 0;
  let tutorialOtherCount = 0;
  let totalUniqueWeeklyHours = 0;

  for (const entry of subjectMap.values()) {
    const c = entry.course;
    totalUniqueWeeklyHours += c.hoursPerWeek;
    if (c.subjectType === 'THEORY') theorySubjectCount += 1;
    else if (c.subjectType === 'LAB') labSubjectCount += 1;
    else tutorialOtherCount += 1;

    const cat = categoryMap.get(c.subjectType) || {
      code: c.subjectType,
      title: SUBJECT_TYPE_LABELS[c.subjectType] || `${c.subjectType} Courses`,
      subjectCount: 0,
      offeringCount: 0,
      totalWeeklyHours: 0,
      courses: [],
    };
    cat.subjectCount += 1;
    cat.offeringCount += c.offeringCount;
    cat.totalWeeklyHours += c.hoursPerWeek;
    cat.courses.push(c);
    categoryMap.set(c.subjectType, cat);
  }

  const selectedDept = departmentId ? departments.find((d) => d.id === departmentId) : null;
  const selectedProg = programId ? programs.find((p) => p.id === programId) : null;
  const selectedTerm = academicTermId ? academicTerms.find((t) => t.id === academicTermId) : null;

  const labContactRatioPct =
    totalOfferingWeeklyHours > 0
      ? Math.round((totalLabOfferingHours / totalOfferingWeeklyHours) * 1000) / 10
      : 0;

  const data: NepSchemeOverview = {
    hasData: subjectMap.size > 0,
    isDemoData: departments.some((d) => d.isDemo) || academicTerms.some((t) => t.isDemo),
    schemeLabel: 'Curriculum & Subject Offerings Overview',
    department: selectedDept ? selectedDept.name : 'All Departments',
    academicTermLabel: selectedTerm
      ? `${selectedTerm.academicYearLabel} • ${selectedTerm.termLabel}`
      : 'All Academic Terms',
    programLabel: selectedProg ? `${selectedProg.code} — ${selectedProg.name}` : 'All Programs',
    appliedFilters: {
      departmentId,
      programId,
      academicTermId,
    },
    availableFilters: {
      departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
      programs: programs.map((p) => ({ id: p.id, code: p.code, name: p.name })),
      academicTerms: academicTerms.map((t) => ({
        id: t.id,
        academicYearLabel: t.academicYearLabel,
        termLabel: t.termLabel,
      })),
    },
    schemaLimitations: [
      'Subject credits, L:T:P ratios, and NEP vertical codes (PCC/PEC/OEC/ESC/AEC) are not stored in the current Subject or SubjectOffering Prisma models.',
    ],
    categories: Array.from(categoryMap.values()),
    statistics: {
      totalUniqueSubjects: subjectMap.size,
      totalOfferings,
      totalWeeklyContactHours: totalUniqueWeeklyHours,
      theorySubjectCount,
      labSubjectCount,
      tutorialOtherCount,
      labContactRatioPct,
    },
    staticReferenceRules: [
      {
        mandate: 'Contiguous Laboratory Periods (Reference)',
        rule: 'Practical offerings with requiresContiguousSlots=true require uninterrupted multi-period blocks.',
        enforcement: 'CP-SAT Hard Constraint (HC-6)',
      },
      {
        mandate: 'Weekly Contact Hour Coverage (Reference)',
        rule: 'Each section offering must be assigned its exact requiredPeriodsPerWeek.',
        enforcement: 'CP-SAT Hard Constraint (HC-4)',
      },
    ],
  };

  return res.json({ data });
});

