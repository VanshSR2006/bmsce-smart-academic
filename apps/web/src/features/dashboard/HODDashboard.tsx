import React, { useMemo, useState } from 'react';
import { z } from 'zod';
import type { HodDashboardOverview } from '@bmsce/contracts';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import { NavLink } from 'react-router-dom';
import {
  Rocket,
  Wrench,
  Calendar,
  Users,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Info,
  Building2,
  BookOpen,
} from 'lucide-react';

const hodDashboardOverviewValidator: z.ZodType<HodDashboardOverview> = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  scopeLabel: z.object({
    department: z.string(),
    departmentCode: z.string().nullable(),
    program: z.string(),
    academicTerm: z.string(),
  }),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    programId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    programs: z.array(
      z.object({
        id: z.string(),
        departmentId: z.string(),
        code: z.string(),
        name: z.string(),
      })
    ),
    academicTerms: z.array(
      z.object({
        id: z.string(),
        academicYearLabel: z.string(),
        termLabel: z.string(),
        status: z.string(),
      })
    ),
  }),
  academicOverview: z.object({
    departmentsCount: z.number().int(),
    programsCount: z.number().int(),
    sectionsCount: z.number().int(),
    batchesCount: z.number().int(),
    activeAcademicTermsCount: z.number().int(),
    subjectsCount: z.number().int(),
    subjectOfferingsCount: z.number().int(),
    enrolledStudentsCount: z.number().int(),
    configuredSectionSeats: z.number().int(),
  }),
  facultyOverview: z.object({
    facultyTotal: z.number().int(),
    activeFacultyCount: z.number().int(),
    facultyAssignmentsCount: z.number().int(),
    facultyAvailabilityEntriesCount: z.number().int(),
    unavailableSlotsCount: z.number().int(),
    workloadRulesCount: z.number().int(),
    avgAssignedPeriodsPerWeek: z.number().nullable(),
    avgMaxPeriodsPerWeek: z.number().nullable(),
  }),
  timetableOverview: z.object({
    timetablesCount: z.number().int(),
    publishedVersionsCount: z.number().int(),
    draftVersionsCount: z.number().int(),
    scheduledSessionsCount: z.number().int(),
    coveredSectionsCount: z.number().int(),
    unscheduledSectionsCount: z.number().int(),
    timetableCoveragePct: z.number().nullable(),
    latestPublishedVersion: z
      .object({
        id: z.string(),
        timetableName: z.string(),
        versionNumber: z.number().int(),
        publishedAt: z.string().nullable(),
        hardViolationCount: z.number().int(),
        softPenalty: z.number().nullable(),
      })
      .nullable(),
    sectionCoverage: z.array(
      z.object({
        sectionId: z.string(),
        sectionCode: z.string(),
        displayName: z.string(),
        semesterNumber: z.number().int(),
        studentCount: z.number().int(),
        batchCount: z.number().int(),
        requiredOfferingsCount: z.number().int(),
        scheduledSessionsCount: z.number().int(),
        hasPublishedTimetable: z.boolean(),
      })
    ),
  }),
  roomOverview: z.object({
    roomsTotal: z.number().int(),
    classroomCount: z.number().int(),
    labCount: z.number().int(),
    otherRoomsCount: z.number().int(),
    roomsWithSessionsCount: z.number().int(),
    freeRoomsCount: z.number().int(),
    roomUtilizationPct: z.number().nullable(),
    roomMatrix: z.array(
      z.object({
        id: z.string(),
        roomCode: z.string(),
        name: z.string(),
        roomType: z.string(),
        capacity: z.number().int(),
        locationLabel: z.string().nullable(),
        scheduledSessionsCount: z.number().int(),
        scheduledPeriodsPerWeek: z.number().int(),
        status: z.enum(['IN_USE', 'FREE']),
      })
    ),
  }),
  academicAlerts: z.object({
    upcomingCalendarEvents: z.array(
      z.object({
        id: z.string(),
        eventDate: z.string(),
        eventType: z.string(),
        title: z.string(),
        description: z.string().nullable(),
        isInstructional: z.boolean(),
        academicTermLabel: z.string(),
      })
    ),
    scheduleExceptions: z.array(
      z.object({
        id: z.string(),
        exceptionDate: z.string(),
        exceptionType: z.string(),
        status: z.string(),
        reason: z.string(),
        timetableName: z.string(),
        versionNumber: z.number().int(),
        replacementFacultyName: z.string().nullable(),
        replacementRoomCode: z.string().nullable(),
      })
    ),
    activeDisruptions: z.array(
      z.object({
        id: z.string(),
        disruptionType: z.string(),
        status: z.string(),
        affectedDate: z.string(),
        startTime: z.string().nullable(),
        endTime: z.string().nullable(),
        reason: z.string(),
        affectedFacultyName: z.string().nullable(),
        affectedRoomCode: z.string().nullable(),
        proposalsCount: z.number().int(),
        proposals: z.array(
          z.object({
            id: z.string(),
            strategyCode: z.string(),
            status: z.string(),
            reviewComment: z.string().nullable(),
          })
        ),
      })
    ),
    recentAuditLogs: z.array(
      z.object({
        id: z.string(),
        createdAt: z.string(),
        action: z.string(),
        resourceType: z.string(),
        resourceId: z.string().nullable(),
        actorName: z.string().nullable(),
      })
    ),
    warnings: z.array(z.string()),
  }),
  schemaLimitations: z.array(z.string()),
});

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export const HODDashboard: React.FC = () => {
  const [departmentId, setDepartmentId] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  const [academicTermId, setAcademicTermId] = useState<string>('');
  const [roomFilter, setRoomFilter] = useState<'ALL' | 'CLASSROOM' | 'LAB'>('ALL');

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (programId) params.set('programId', programId);
    if (academicTermId) params.set('academicTermId', academicTermId);
    const qs = params.toString();
    return qs ? `/api/v1/hod/dashboard-overview?${qs}` : '/api/v1/hod/dashboard-overview';
  }, [departmentId, programId, academicTermId]);

  const { data, loading, error, refetch } = useApiQuery<unknown>(endpoint);

  if (loading) {
    return <QueryStateCard mode="loading" message="Loading HOD operations dashboard..." />;
  }

  if (error) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load HOD Dashboard"
        message={error}
        onRetry={refetch}
      />
    );
  }

  const parsedResult = hodDashboardOverviewValidator.safeParse(data);
  if (!parsedResult.success) {
    return (
      <QueryStateCard
        mode="error"
        title="Invalid Dashboard Payload"
        message="The server response did not match the expected HOD dashboard schema."
        onRetry={refetch}
      />
    );
  }

  const overview = parsedResult.data;
  const {
    scopeLabel,
    availableFilters,
    academicOverview,
    facultyOverview,
    timetableOverview,
    roomOverview,
    academicAlerts,
    schemaLimitations,
  } = overview;

  const filteredPrograms = departmentId
    ? availableFilters.programs.filter((p) => p.departmentId === departmentId)
    : availableFilters.programs;

  const filteredRooms = roomOverview.roomMatrix.filter((rm) => {
    if (roomFilter === 'CLASSROOM') return rm.roomType === 'CLASSROOM';
    if (roomFilter === 'LAB') return rm.roomType === 'LAB';
    return true;
  });

  const handleDepartmentChange = (nextDeptId: string) => {
    setDepartmentId(nextDeptId);
    if (programId && nextDeptId) {
      const stillValid = availableFilters.programs.some(
        (p) => p.id === programId && p.departmentId === nextDeptId
      );
      if (!stillValid) setProgramId('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header, Scope Filters & Actions Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                {overview.isDemoData ? 'Database-Backed (Synthetic Seed)' : 'Database-Backed Live'}
              </span>
              {scopeLabel.departmentCode && (
                <span className="text-[11px] font-bold text-slate-500">
                  Dept Code: {scopeLabel.departmentCode}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {scopeLabel.department}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {scopeLabel.program} • {scopeLabel.academicTerm}
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <NavLink
              to="/solver-studio"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Rocket className="w-3.5 h-3.5 text-blue-400" />
              <span>Launch Timetable Solver</span>
            </NavLink>
            <NavLink
              to="/disruption-repair"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5 text-slate-600" />
              <span>Disruption Repair</span>
            </NavLink>
            <NavLink
              to="/examinations"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600" />
              <span>CIE Schedules</span>
            </NavLink>
            <NavLink
              to="/workload"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Workload Balancing</span>
            </NavLink>
          </div>
        </div>

        {/* Scope Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Department Scope
            </label>
            <select
              value={departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All Departments</option>
              {availableFilters.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Program Scope
            </label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All Programs</option>
              {filteredPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Academic Term
            </label>
            <select
              value={academicTermId}
              onChange={(e) => setAcademicTermId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All Academic Terms</option>
              {availableFilters.academicTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.academicYearLabel} • {t.termLabel}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setDepartmentId('');
                setProgramId('');
                setAcademicTermId('');
              }}
              disabled={!departmentId && !programId && !academicTermId}
              className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 px-3 py-2 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Reset Scope Filters
            </button>
          </div>
        </div>

        {/* 5 Top Key Metric Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>TIMETABLE COVERAGE</span>
              <span className="text-emerald-600">
                {timetableOverview.latestPublishedVersion
                  ? `v${timetableOverview.latestPublishedVersion.versionNumber}`
                  : 'No Pub'}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {timetableOverview.timetableCoveragePct !== null
                ? `${timetableOverview.timetableCoveragePct}%`
                : 'Not available'}
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              {timetableOverview.coveredSectionsCount}/{academicOverview.sectionsCount} sections •{' '}
              {timetableOverview.scheduledSessionsCount} sessions
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>FACULTY WORKLOAD</span>
              <span className="text-blue-600">
                {facultyOverview.activeFacultyCount}/{facultyOverview.facultyTotal} Active
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {facultyOverview.avgAssignedPeriodsPerWeek !== null
                ? `${facultyOverview.avgAssignedPeriodsPerWeek} hrs/wk`
                : 'Not available'}
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              {facultyOverview.facultyAssignmentsCount} assignments •{' '}
              {facultyOverview.unavailableSlotsCount} unavail.
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>ROOMS & LABS</span>
              <span className="text-purple-600">
                {roomOverview.classroomCount} CR / {roomOverview.labCount} Lab
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {roomOverview.roomUtilizationPct !== null
                ? `${roomOverview.roomUtilizationPct}% Used`
                : 'Not available'}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              {roomOverview.freeRoomsCount} free of {roomOverview.roomsTotal} rooms
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>ACADEMIC STRUCTURE</span>
              <span className="text-slate-600">{academicOverview.batchesCount} Batches</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {academicOverview.subjectsCount} Subjects
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              {academicOverview.subjectOfferingsCount} offerings • {academicOverview.programsCount}{' '}
              programs
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>ALERTS & DISRUPTIONS</span>
              <span
                className={
                  academicAlerts.activeDisruptions.length > 0 ? 'text-rose-600' : 'text-emerald-600'
                }
              >
                {academicAlerts.activeDisruptions.length > 0 ? 'Attention' : 'Clear'}
              </span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {academicAlerts.activeDisruptions.length} Active
            </div>
            <div className="text-[11px] font-semibold text-slate-600 mt-0.5">
              {academicAlerts.scheduleExceptions.length} exceptions •{' '}
              {academicAlerts.upcomingCalendarEvents.length} events
            </div>
          </div>
        </div>
      </div>

      {!overview.hasData ? (
        <QueryStateCard
          mode="empty"
          title="No Academic Records in Selected Scope"
          message="No sections, subjects, faculty, rooms, or timetables matched the current filter scope."
          onRetry={refetch}
        />
      ) : (
        <>
          {/* Data-Backed Warnings */}
          {academicAlerts.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
              <div className="flex items-center space-x-2 text-xs font-black text-amber-900 uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Scope Warnings</span>
              </div>
              <ul className="list-disc list-inside text-xs text-amber-800 space-y-0.5">
                {academicAlerts.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Main Grid: Room Matrix + Section Coverage + Audit Logs (Left 2 cols) & Alerts (Right 1 col) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Room & Laboratory Matrix */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-900">
                      Room & Laboratory Allocation Matrix
                    </h2>
                    <div className="text-xs text-slate-500 font-medium">
                      Derived from published TimetableSession assignments in the selected scope
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto text-xs font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setRoomFilter('ALL')}
                      className={`px-2.5 py-1 rounded cursor-pointer ${
                        roomFilter === 'ALL'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      All ({roomOverview.roomsTotal})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomFilter('CLASSROOM')}
                      className={`px-2.5 py-1 rounded cursor-pointer ${
                        roomFilter === 'CLASSROOM'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Classrooms ({roomOverview.classroomCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoomFilter('LAB')}
                      className={`px-2.5 py-1 rounded cursor-pointer ${
                        roomFilter === 'LAB'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      Labs ({roomOverview.labCount})
                    </button>
                  </div>
                </div>

                {filteredRooms.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No active rooms found for this filter.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                    {filteredRooms.map((rm) => (
                      <div
                        key={rm.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          rm.status === 'IN_USE'
                            ? 'bg-slate-50/70 border-slate-200'
                            : 'bg-emerald-50/40 border-emerald-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-bold text-xs text-slate-900">
                            {rm.roomCode}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              rm.status === 'IN_USE'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {rm.status === 'IN_USE' ? 'IN USE' : 'FREE'}
                          </span>
                        </div>
                        <div className="font-bold text-xs text-slate-800 leading-tight">
                          {rm.name} ({rm.roomType})
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-2.5 pt-2 border-t border-slate-200/60">
                          <span>
                            {rm.scheduledSessionsCount} sessions ({rm.scheduledPeriodsPerWeek}{' '}
                            periods/wk)
                          </span>
                          <span className="font-mono text-slate-600">Cap: {rm.capacity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Building2 className="w-3.5 h-3.5 text-blue-500" />
                      <span>{roomOverview.roomsWithSessionsCount} With Sessions</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>{roomOverview.freeRoomsCount} Unallocated</span>
                    </span>
                  </div>
                  <NavLink
                    to="/rooms"
                    className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Room Management</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </NavLink>
                </div>
              </div>

              {/* Section-Wise Timetable Coverage */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Section-Wise Timetable Coverage
                    </h3>
                    <div className="text-xs text-slate-500">
                      Enrolled student rows: {academicOverview.enrolledStudentsCount} • Configured
                      section seats: {academicOverview.configuredSectionSeats}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                    {timetableOverview.publishedVersionsCount} Published /{' '}
                    {timetableOverview.draftVersionsCount} Draft
                  </span>
                </div>

                {timetableOverview.sectionCoverage.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No sections configured in this scope.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[520px]">
                      <thead>
                        <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Section</th>
                          <th className="py-2.5 px-3">Sem</th>
                          <th className="py-2.5 px-3">Offerings</th>
                          <th className="py-2.5 px-3">Published Sessions</th>
                          <th className="py-2.5 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {timetableOverview.sectionCoverage.map((sec) => (
                          <tr key={sec.sectionId} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {sec.sectionCode} — {sec.displayName}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{sec.semesterNumber}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {sec.requiredOfferingsCount}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {sec.scheduledSessionsCount}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  sec.hasPublishedTimetable
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {sec.hasPublishedTimetable ? 'PUBLISHED' : 'UNSCHEDULED'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Recent Audit Logs */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Recent Audit Logs</h3>
                    <div className="text-xs text-slate-500">
                      Latest recorded system transactions from AuditLog
                    </div>
                  </div>
                </div>

                {academicAlerts.recentAuditLogs.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No audit log entries recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[540px]">
                      <thead>
                        <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Action</th>
                          <th className="py-2.5 px-3">Resource</th>
                          <th className="py-2.5 px-3">Actor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {academicAlerts.recentAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                              {formatShortDate(log.createdAt)}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{log.action}</td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {log.resourceType}
                              {log.resourceId ? ` (${log.resourceId.slice(0, 8)}...)` : ''}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">
                              {log.actorName || 'System'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Right 1 Col: Disruptions, Exceptions & Calendar Events */}
            <div className="space-y-6">
              {/* Active Disruptions */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Active Disruptions</span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                    {academicAlerts.activeDisruptions.length}
                  </span>
                </div>

                {academicAlerts.activeDisruptions.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">
                    No unresolved disruptions in this scope.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {academicAlerts.activeDisruptions.map((dis) => (
                      <div
                        key={dis.id}
                        className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                          <span>{dis.disruptionType}</span>
                          <span className="text-[10px] text-amber-800">{dis.status}</span>
                        </div>
                        <div className="text-xs text-slate-700">{dis.reason}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatShortDate(dis.affectedDate)}
                          {dis.affectedFacultyName ? ` • ${dis.affectedFacultyName}` : ''}
                          {dis.affectedRoomCode ? ` • ${dis.affectedRoomCode}` : ''} •{' '}
                          {dis.proposalsCount} proposal(s)
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <NavLink
                  to="/disruption-repair"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
                >
                  <Wrench className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Repair Center</span>
                </NavLink>
              </div>

              {/* Schedule Exceptions */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Schedule Exceptions</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {academicAlerts.scheduleExceptions.length}
                  </span>
                </div>

                {academicAlerts.scheduleExceptions.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">
                    No schedule exceptions recorded in this scope.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {academicAlerts.scheduleExceptions.map((ex) => (
                      <div key={ex.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{ex.exceptionType}</span>
                          <span className="text-[10px] text-slate-500">
                            {formatShortDate(ex.exceptionDate)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 mt-0.5">{ex.reason}</div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {ex.timetableName} v{ex.versionNumber} • {ex.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Academic Calendar Events */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Academic Calendar</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    {academicAlerts.upcomingCalendarEvents.length}
                  </span>
                </div>

                {academicAlerts.upcomingCalendarEvents.length === 0 ? (
                  <div className="text-xs text-slate-500 py-2">
                    No academic calendar events recorded in this scope.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {academicAlerts.upcomingCalendarEvents.map((ev) => (
                      <div key={ev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between text-xs font-bold text-slate-800">
                          <span>{ev.title}</span>
                          <span className="text-[10px] text-indigo-700">{ev.eventType}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatShortDate(ev.eventDate)} • {ev.academicTermLabel}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Schema Limitations Notice */}
          {schemaLimitations.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
                <Info className="w-4 h-4 text-slate-500" />
                <span>Schema & Telemetry Scope Notes</span>
              </div>
              <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
                {schemaLimitations.map((note, idx) => (
                  <li key={idx}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
