import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/prisma.js';
import type { HodDashboardOverview } from '@bmsce/contracts';

export const dashboardRouter = Router();

function parseOptionalQueryString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

dashboardRouter.get(
  '/hod/dashboard-overview',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const departmentId = parseOptionalQueryString(req.query.departmentId);
      const programId = parseOptionalQueryString(req.query.programId);
      const academicTermId = parseOptionalQueryString(req.query.academicTermId);

      const [departments, programs, academicTerms] = await Promise.all([
        prisma.department.findMany({ orderBy: { code: 'asc' } }),
        prisma.program.findMany({ orderBy: { code: 'asc' } }),
        prisma.academicTerm.findMany({ orderBy: { createdAt: 'desc' } }),
      ]);

      const selectedDepartment = departmentId
        ? departments.find((d) => d.id === departmentId) ?? null
        : null;
      if (departmentId && !selectedDepartment) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Department '${departmentId}' was not found.`,
          },
        });
      }

      const selectedProgram = programId
        ? programs.find((p) => p.id === programId) ?? null
        : null;
      if (
        programId &&
        (!selectedProgram || (departmentId && selectedProgram.departmentId !== departmentId))
      ) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Program '${programId}' was not found within the selected scope.`,
          },
        });
      }

      const selectedTerm = academicTermId
        ? academicTerms.find((t) => t.id === academicTermId) ?? null
        : null;
      if (academicTermId && !selectedTerm) {
        return res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Academic term '${academicTermId}' was not found.`,
          },
        });
      }

      const effectiveDeptId = departmentId ?? selectedProgram?.departmentId ?? null;

      const sectionWhere = {
        ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
        ...(programId ? { programId } : {}),
        ...(academicTermId ? { academicTermId } : {}),
      };

      const offeringWhere = {
        ...(academicTermId ? { academicTermId } : {}),
        ...(effectiveDeptId || programId
          ? {
            section: {
              ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
              ...(programId ? { programId } : {}),
            },
          }
          : {}),
      };

      const facultyWhere = {
        ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
      };

      const roomWhere = {
        isActive: true,
        ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
      };

      const timetableWhere = {
        ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
        ...(academicTermId ? { academicTermId } : {}),
      };

      const publishedSessionWhere = {
        timetableVersion: {
          status: 'PUBLISHED',
          timetable: timetableWhere,
        },
        ...(programId ? { section: { programId } } : {}),
      };

      const [
        sections,
        enrolledStudentsCount,
        subjectsCount,
        subjectOfferingsCount,
        facultyList,
        facultyAssignments,
        facultyAvailability,
        workloadRules,
      ] = await Promise.all([
        prisma.section.findMany({
          where: sectionWhere,
          include: {
            _count: {
              select: { batches: true, subjectOfferings: true },
            },
          },
          orderBy: [{ semesterNumber: 'asc' }, { sectionCode: 'asc' }],
        }),
        prisma.student.count({ where: { section: sectionWhere } }),
        prisma.subject.count({
          where: {
            isActive: true,
            ...(effectiveDeptId ? { departmentId: effectiveDeptId } : {}),
          },
        }),
        prisma.subjectOffering.count({ where: offeringWhere }),
        prisma.faculty.findMany({
          where: facultyWhere,
          select: { id: true, status: true },
        }),
        prisma.facultyAssignment.findMany({
          where: {
            status: 'ACTIVE',
            ...(effectiveDeptId ? { faculty: { departmentId: effectiveDeptId } } : {}),
            subjectOffering: offeringWhere,
          },
          select: {
            facultyId: true,
            subjectOffering: { select: { requiredPeriodsPerWeek: true } },
          },
        }),
        prisma.facultyAvailability.findMany({
          where: {
            ...(effectiveDeptId ? { faculty: { departmentId: effectiveDeptId } } : {}),
            ...(academicTermId ? { academicTermId } : {}),
          },
          select: { availabilityType: true },
        }),
        prisma.facultyWorkloadRule.findMany({
          where: {
            ...(effectiveDeptId ? { faculty: { departmentId: effectiveDeptId } } : {}),
            ...(academicTermId ? { academicTermId } : {}),
          },
          select: { maxPeriodsPerWeek: true },
        }),
      ]);

      const [
        timetables,
        publishedSessions,
        rooms,
        calendarEvents,
        scheduleExceptions,
        disruptions,
        auditLogs,
      ] = await Promise.all([
        prisma.timetable.findMany({
          where: timetableWhere,
          include: {
            versions: {
              orderBy: [{ versionNumber: 'desc' }],
            },
          },
        }),
        prisma.timetableSession.findMany({
          where: publishedSessionWhere,
          select: {
            id: true,
            sectionId: true,
            roomId: true,
            durationPeriods: true,
          },
        }),
        prisma.room.findMany({
          where: roomWhere,
          orderBy: { roomCode: 'asc' },
        }),
        prisma.academicCalendarEvent.findMany({
          where: { ...(academicTermId ? { academicTermId } : {}) },
          include: {
            academicTerm: { select: { academicYearLabel: true, termLabel: true } },
          },
          orderBy: { eventDate: 'asc' },
          take: 10,
        }),
        prisma.scheduleException.findMany({
          where: {
            timetableVersion: { timetable: timetableWhere },
          },
          include: {
            timetableVersion: {
              select: {
                versionNumber: true,
                timetable: { select: { name: true } },
              },
            },
            replacementFaculty: {
              select: { user: { select: { displayName: true } } },
            },
            replacementRoom: {
              select: { roomCode: true },
            },
          },
          orderBy: { exceptionDate: 'desc' },
          take: 10,
        }),
        prisma.disruption.findMany({
          where: {
            status: { not: 'RESOLVED' },
            ...(academicTermId ? { academicTermId } : {}),
            ...(effectiveDeptId
              ? {
                OR: [
                  { affectedFaculty: { departmentId: effectiveDeptId } },
                  { affectedRoom: { departmentId: effectiveDeptId } },
                  { affectedFacultyId: null, affectedRoomId: null },
                ],
              }
              : {}),
          },
          include: {
            affectedFaculty: { select: { user: { select: { displayName: true } } } },
            affectedRoom: { select: { roomCode: true } },
            proposals: {
              select: {
                id: true,
                strategyCode: true,
                status: true,
                reviewComment: true,
              },
            },
          },
          orderBy: { affectedDate: 'desc' },
          take: 10,
        }),
        prisma.auditLog.findMany({
          include: { actorUser: { select: { displayName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      // Academic overview aggregations
      const scopedDepartmentsCount = effectiveDeptId ? 1 : departments.length;
      const scopedPrograms = programs.filter((p) => {
        if (programId && p.id !== programId) return false;
        if (effectiveDeptId && p.departmentId !== effectiveDeptId) return false;
        return true;
      });
      const scopedTerms = academicTerms.filter((t) =>
        academicTermId ? t.id === academicTermId : true
      );
      const activeAcademicTermsCount = scopedTerms.filter((t) => t.status === 'ACTIVE').length;
      const batchesCount = sections.reduce((sum, s) => sum + s._count.batches, 0);
      const configuredSectionSeats = sections.reduce((sum, s) => sum + s.studentCount, 0);

      // Faculty overview aggregations
      const facultyTotal = facultyList.length;
      const activeFacultyCount = facultyList.filter((f) => f.status === 'ACTIVE').length;
      const facultyLoadById = new Map<string, number>();
      for (const assignment of facultyAssignments) {
        const current = facultyLoadById.get(assignment.facultyId) ?? 0;
        facultyLoadById.set(
          assignment.facultyId,
          current + assignment.subjectOffering.requiredPeriodsPerWeek
        );
      }
      const avgAssignedPeriodsPerWeek =
        facultyAssignments.length > 0 && facultyLoadById.size > 0
          ? Math.round(
            (Array.from(facultyLoadById.values()).reduce((a, b) => a + b, 0) /
              facultyLoadById.size) *
            10
          ) / 10
          : null;

      const maxWeekValues = workloadRules
        .map((r) => r.maxPeriodsPerWeek)
        .filter((v): v is number => v !== null && v !== undefined);
      const avgMaxPeriodsPerWeek =
        maxWeekValues.length > 0
          ? Math.round((maxWeekValues.reduce((a, b) => a + b, 0) / maxWeekValues.length) * 10) / 10
          : null;

      const unavailableSlotsCount = facultyAvailability.filter(
        (a) => a.availabilityType === 'UNAVAILABLE'
      ).length;

      // Timetable overview aggregations
      let publishedVersionsCount = 0;
      let draftVersionsCount = 0;
      let latestPublished: {
        id: string;
        timetableName: string;
        versionNumber: number;
        publishedAt: Date | null;
        hardViolationCount: number;
        softPenalty: number | null;
      } | null = null;

      for (const tt of timetables) {
        for (const v of tt.versions) {
          if (v.status === 'PUBLISHED') {
            publishedVersionsCount += 1;
            if (
              !latestPublished ||
              (v.publishedAt ?? v.createdAt).getTime() >
              (latestPublished.publishedAt ?? new Date(0)).getTime()
            ) {
              latestPublished = {
                id: v.id,
                timetableName: tt.name,
                versionNumber: v.versionNumber,
                publishedAt: v.publishedAt ?? v.createdAt,
                hardViolationCount: v.hardViolationCount,
                softPenalty: v.softPenalty,
              };
            }
          } else {
            draftVersionsCount += 1;
          }
        }
      }

      const sessionsBySection = new Map<string, number>();
      const sessionsByRoom = new Map<string, { count: number; periods: number }>();
      for (const sess of publishedSessions) {
        sessionsBySection.set(sess.sectionId, (sessionsBySection.get(sess.sectionId) ?? 0) + 1);
        const roomAgg = sessionsByRoom.get(sess.roomId) ?? { count: 0, periods: 0 };
        roomAgg.count += 1;
        roomAgg.periods += sess.durationPeriods || 1;
        sessionsByRoom.set(sess.roomId, roomAgg);
      }

      const sectionCoverage = sections.map((s) => {
        const scheduledCount = sessionsBySection.get(s.id) ?? 0;
        return {
          sectionId: s.id,
          sectionCode: s.sectionCode,
          displayName: s.displayName,
          semesterNumber: s.semesterNumber,
          studentCount: s.studentCount,
          batchCount: s._count.batches,
          requiredOfferingsCount: s._count.subjectOfferings,
          scheduledSessionsCount: scheduledCount,
          hasPublishedTimetable: scheduledCount > 0,
        };
      });

      const coveredSectionsCount = sectionCoverage.filter((s) => s.hasPublishedTimetable).length;
      const unscheduledSectionsCount = sections.length - coveredSectionsCount;
      const timetableCoveragePct =
        sections.length > 0
          ? Math.round((coveredSectionsCount / sections.length) * 1000) / 10
          : null;

      // Room overview & matrix
      const classroomCount = rooms.filter((r) => r.roomType === 'CLASSROOM').length;
      const labCount = rooms.filter((r) => r.roomType === 'LAB').length;
      const otherRoomsCount = rooms.length - classroomCount - labCount;
      const roomMatrix = rooms.map((r) => {
        const agg = sessionsByRoom.get(r.id) ?? { count: 0, periods: 0 };
        return {
          id: r.id,
          roomCode: r.roomCode,
          name: r.name,
          roomType: r.roomType,
          capacity: r.capacity,
          locationLabel: r.locationLabel,
          scheduledSessionsCount: agg.count,
          scheduledPeriodsPerWeek: agg.periods,
          status: agg.count > 0 ? ('IN_USE' as const) : ('FREE' as const),
        };
      });

      const roomsWithSessionsCount = roomMatrix.filter((r) => r.scheduledSessionsCount > 0).length;
      const freeRoomsCount = rooms.length - roomsWithSessionsCount;
      const roomUtilizationPct =
        rooms.length > 0
          ? Math.round((roomsWithSessionsCount / rooms.length) * 1000) / 10
          : null;

      // Warnings derived strictly from DB counts
      const warnings: string[] = [];
      if (sections.length > 0 && unscheduledSectionsCount > 0) {
        warnings.push(
          `${unscheduledSectionsCount} of ${sections.length} section(s) have no published timetable sessions.`
        );
      }
      if (disruptions.length > 0) {
        warnings.push(`${disruptions.length} unresolved disruption(s) in the selected scope.`);
      }
      if (facultyTotal > 0 && workloadRules.length === 0) {
        warnings.push('No faculty workload rules configured for the selected scope.');
      }

      const hasData =
        sections.length > 0 ||
        subjectsCount > 0 ||
        facultyTotal > 0 ||
        rooms.length > 0 ||
        timetables.length > 0;

      const isDemoData =
        departments.some((d) => d.isDemo) || academicTerms.some((t) => t.isDemo);

      const payload: HodDashboardOverview = {
        hasData,
        isDemoData,
        scopeLabel: {
          department: selectedDepartment
            ? selectedDepartment.name
            : selectedProgram
              ? departments.find((d) => d.id === selectedProgram.departmentId)?.name ??
              'Selected Program Department'
              : 'All Departments',
          departmentCode: selectedDepartment
            ? selectedDepartment.code
            : selectedProgram
              ? departments.find((d) => d.id === selectedProgram.departmentId)?.code ?? null
              : null,
          program: selectedProgram ? `${selectedProgram.code} — ${selectedProgram.name}` : 'All Programs',
          academicTerm: selectedTerm
            ? `${selectedTerm.academicYearLabel} • ${selectedTerm.termLabel}`
            : 'All Academic Terms',
        },
        appliedFilters: {
          departmentId,
          programId,
          academicTermId,
        },
        availableFilters: {
          departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
          programs: programs.map((p) => ({
            id: p.id,
            departmentId: p.departmentId,
            code: p.code,
            name: p.name,
          })),
          academicTerms: academicTerms.map((t) => ({
            id: t.id,
            academicYearLabel: t.academicYearLabel,
            termLabel: t.termLabel,
            status: t.status,
          })),
        },
        academicOverview: {
          departmentsCount: scopedDepartmentsCount,
          programsCount: scopedPrograms.length,
          sectionsCount: sections.length,
          batchesCount,
          activeAcademicTermsCount,
          subjectsCount,
          subjectOfferingsCount,
          enrolledStudentsCount,
          configuredSectionSeats,
        },
        facultyOverview: {
          facultyTotal,
          activeFacultyCount,
          facultyAssignmentsCount: facultyAssignments.length,
          facultyAvailabilityEntriesCount: facultyAvailability.length,
          unavailableSlotsCount,
          workloadRulesCount: workloadRules.length,
          avgAssignedPeriodsPerWeek,
          avgMaxPeriodsPerWeek,
        },
        timetableOverview: {
          timetablesCount: timetables.length,
          publishedVersionsCount,
          draftVersionsCount,
          scheduledSessionsCount: publishedSessions.length,
          coveredSectionsCount,
          unscheduledSectionsCount,
          timetableCoveragePct,
          latestPublishedVersion: latestPublished
            ? {
              id: latestPublished.id,
              timetableName: latestPublished.timetableName,
              versionNumber: latestPublished.versionNumber,
              publishedAt: latestPublished.publishedAt
                ? latestPublished.publishedAt.toISOString()
                : null,
              hardViolationCount: latestPublished.hardViolationCount,
              softPenalty: latestPublished.softPenalty,
            }
            : null,
          sectionCoverage,
        },
        roomOverview: {
          roomsTotal: rooms.length,
          classroomCount,
          labCount,
          otherRoomsCount,
          roomsWithSessionsCount,
          freeRoomsCount,
          roomUtilizationPct,
          roomMatrix,
        },
        academicAlerts: {
          upcomingCalendarEvents: calendarEvents.map((e) => ({
            id: e.id,
            eventDate: e.eventDate.toISOString(),
            eventType: e.eventType,
            title: e.title,
            description: e.description,
            isInstructional: e.isInstructional,
            academicTermLabel: `${e.academicTerm.academicYearLabel} (${e.academicTerm.termLabel})`,
          })),
          scheduleExceptions: scheduleExceptions.map((ex) => ({
            id: ex.id,
            exceptionDate: ex.exceptionDate.toISOString(),
            exceptionType: ex.exceptionType,
            status: ex.status,
            reason: ex.reason,
            timetableName: ex.timetableVersion.timetable.name,
            versionNumber: ex.timetableVersion.versionNumber,
            replacementFacultyName: ex.replacementFaculty?.user.displayName ?? null,
            replacementRoomCode: ex.replacementRoom?.roomCode ?? null,
          })),
          activeDisruptions: disruptions.map((d) => ({
            id: d.id,
            disruptionType: d.disruptionType,
            status: d.status,
            affectedDate: d.affectedDate.toISOString(),
            startTime: d.startTime,
            endTime: d.endTime,
            reason: d.reason,
            affectedFacultyName: d.affectedFaculty?.user.displayName ?? null,
            affectedRoomCode: d.affectedRoom?.roomCode ?? null,
            proposalsCount: d.proposals.length,
            proposals: d.proposals.map((p) => ({
              id: p.id,
              strategyCode: p.strategyCode,
              status: p.status,
              reviewComment: p.reviewComment,
            })),
          })),
          recentAuditLogs: auditLogs.map((l) => ({
            id: l.id,
            createdAt: l.createdAt.toISOString(),
            action: l.action,
            resourceType: l.resourceType,
            resourceId: l.resourceId,
            actorName: l.actorUser?.displayName ?? null,
          })),
          warnings,
        },
        schemaLimitations: [
          'NEP audit percentages and real-time room maintenance telemetry are not stored in the current Prisma schema.',
          'Room status (IN_USE vs FREE) reflects whether each active room has scheduled sessions in published timetable versions within the selected scope.',
          'Enrolled student counts reflect Student table rows; configured seats reflect Section.studentCount.',
        ],
      };

      return res.json({ data: payload });
    } catch (err) {
      return next(err);
    }
  }
);
