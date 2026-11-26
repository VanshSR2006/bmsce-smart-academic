import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { WorkloadFacultyItem, WorkloadOverview } from '@bmsce/contracts';
import { getApiUrl } from '../../lib/api';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import {
  AlertTriangle,
  Download,
  Filter,
  Search,
  ChevronRight,
  BookOpen,
  Calendar,
  Clock,
  Info,
} from 'lucide-react';

const workloadOverviewValidator: z.ZodType<WorkloadOverview> = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    academicTerms: z.array(
      z.object({ id: z.string(), academicYearLabel: z.string(), termLabel: z.string() })
    ),
  }),
  scopeLabel: z.object({
    department: z.string(),
    academicTerm: z.string(),
  }),
  metrics: z.object({
    totalFaculty: z.number().int(),
    activeFacultyCount: z.number().int(),
    configuredRulesCount: z.number().int(),
    avgAssignedHoursPerWeek: z.number().nullable(),
    avgScheduledHoursPerWeek: z.number().nullable(),
    totalAssignedHours: z.number(),
    totalScheduledHours: z.number(),
    balancedCount: z.number().int(),
    overloadCount: z.number().int(),
    underloadCount: z.number().int(),
    unconfiguredCount: z.number().int(),
    compliantPct: z.number().nullable(),
  }),
  faculty: z.array(
    z.object({
      facultyId: z.string(),
      name: z.string(),
      email: z.string().nullable(),
      employeeCode: z.string().nullable(),
      designation: z.string().nullable(),
      departmentId: z.string(),
      departmentName: z.string(),
      cabinLocation: z.string().nullable(),
      status: z.string(),
      hasWorkloadRule: z.boolean(),
      maxWeeklyHours: z.number().nullable(),
      maxDailyHours: z.number().nullable(),
      assignedWeeklyHours: z.number(),
      scheduledWeeklyHours: z.number(),
      remainingCapacityHours: z.number().nullable(),
      allocationDiscrepancyHours: z.number(),
      theoryHours: z.number(),
      labHours: z.number(),
      dailyHours: z.object({
        MON: z.number(),
        TUE: z.number(),
        WED: z.number(),
        THU: z.number(),
        FRI: z.number(),
      }),
      peakDailyHours: z.number(),
      utilizationPct: z.number().nullable(),
      workloadStatus: z.enum(['OPTIMAL', 'OVERLOAD', 'UNDERLOAD', 'STANDBY', 'UNCONFIGURED']),
      assignedCourses: z.array(
        z.object({
          subjectCode: z.string(),
          subjectName: z.string(),
          sectionCode: z.string(),
          requiredPeriodsPerWeek: z.number(),
        })
      ),
      availabilitySlots: z.array(
        z.object({
          id: z.string(),
          availabilityType: z.string(),
          dayOfWeek: z.number().int().nullable(),
          startTime: z.string().nullable(),
          endTime: z.string().nullable(),
          reason: z.string().nullable(),
        })
      ),
    })
  ),
  schemaLimitations: z.array(z.string()),
});

const DAY_NAMES: Record<number, string> = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat' };

export const FacultyWorkload: React.FC = () => {
  const [departmentId, setDepartmentId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedFaculty, setSelectedFaculty] = useState<WorkloadFacultyItem | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (academicTermId) params.set('academicTermId', academicTermId);
    const qs = params.toString();
    return qs ? `/api/v1/workload/overview?${qs}` : '/api/v1/workload/overview';
  }, [departmentId, academicTermId]);

  const { data, loading, error, refetch } = useApiQuery<unknown>(endpoint);

  const parsed = useMemo(() => {
    if (!data) return null;
    return workloadOverviewValidator.safeParse(data);
  }, [data]);

  const overview = parsed?.success ? parsed.data : null;

  useEffect(() => {
    if (overview?.faculty?.length) {
      setSelectedFaculty((prev) =>
        prev && overview.faculty.some((f) => f.facultyId === prev.facultyId)
          ? overview.faculty.find((f) => f.facultyId === prev.facultyId) ?? overview.faculty[0]
          : overview.faculty[0]
      );
    } else {
      setSelectedFaculty(null);
    }
  }, [overview]);

  if (loading) {
    return (
      <QueryStateCard
        mode="loading"
        message="Loading faculty workload distribution..."
        spinnerColorClass="border-indigo-600"
      />
    );
  }

  if (error) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load Faculty Workload"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!overview) {
    return (
      <QueryStateCard
        mode="error"
        title="Invalid Workload Payload"
        message="The server response did not match the expected faculty workload schema."
        onRetry={refetch}
      />
    );
  }

  const filteredFaculty = overview.faculty.filter((f) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      f.name.toLowerCase().includes(q) ||
      (f.employeeCode ?? '').toLowerCase().includes(q) ||
      (f.designation ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || f.workloadStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: WorkloadFacultyItem['workloadStatus']) => {
    switch (status) {
      case 'OVERLOAD':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
            Overload
          </span>
        );
      case 'UNDERLOAD':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            Underload
          </span>
        );
      case 'OPTIMAL':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            Optimal
          </span>
        );
      case 'STANDBY':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Standby
          </span>
        );
      case 'UNCONFIGURED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700 border border-purple-200">
            Unconfigured
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <span>{overview.scopeLabel.department}</span>
              <ChevronRight size={12} />
              <span>{overview.scopeLabel.academicTerm}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Faculty Workload & Availability
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Database-backed FacultyAssignment load vs. published TimetableSession allocations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
            >
              <option value="" className="text-slate-900">
                All Departments
              </option>
              {overview.availableFilters.departments.map((d) => (
                <option key={d.id} value={d.id} className="text-slate-900">
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
            <select
              value={academicTermId}
              onChange={(e) => setAcademicTermId(e.target.value)}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white"
            >
              <option value="" className="text-slate-900">
                All Academic Terms
              </option>
              {overview.availableFilters.academicTerms.map((t) => (
                <option key={t.id} value={t.id} className="text-slate-900">
                  {t.academicYearLabel} ({t.termLabel})
                </option>
              ))}
            </select>
            <button
              onClick={() => window.open(getApiUrl('/api/v1/reports/workload-pdf'), '_blank')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} />
              Export PDF
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Faculty Roster</div>
            <div className="text-xl font-bold text-white mt-1">{overview.metrics.totalFaculty}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overview.metrics.activeFacultyCount} Active
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Avg Assigned</div>
            <div className="text-xl font-bold text-indigo-300 mt-1">
              {overview.metrics.avgAssignedHoursPerWeek !== null
                ? `${overview.metrics.avgAssignedHoursPerWeek}h`
                : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overview.metrics.totalAssignedHours}h total assigned
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Avg Scheduled</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {overview.metrics.avgScheduledHoursPerWeek !== null
                ? `${overview.metrics.avgScheduledHoursPerWeek}h`
                : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overview.metrics.totalScheduledHours}h published
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Compliant Ratio</div>
            <div className="text-xl font-bold text-white mt-1">
              {overview.metrics.compliantPct !== null ? `${overview.metrics.compliantPct}%` : 'N/A'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {overview.metrics.configuredRulesCount} rules configured
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Overload Alerts</div>
            <div className="text-xl font-bold text-red-400 mt-1">
              {overview.metrics.overloadCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Exceeds configured cap</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Unconfigured</div>
            <div className="text-xl font-bold text-purple-300 mt-1">
              {overview.metrics.unconfiguredCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">No workload rule</div>
          </div>
        </div>
      </div>

      {!overview.hasData ? (
        <QueryStateCard
          mode="empty"
          title="No Faculty Records in Scope"
          message="No faculty records were found for the selected department and term filters."
          onRetry={refetch}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Faculty Table */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Search faculty by name, code, or designation..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    <Filter size={13} className="text-slate-400 mr-1" />
                    {['ALL', 'OPTIMAL', 'OVERLOAD', 'UNDERLOAD', 'STANDBY', 'UNCONFIGURED'].map(
                      (filter) => (
                        <button
                          key={filter}
                          onClick={() => setStatusFilter(filter)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            statusFilter === filter
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                          }`}
                        >
                          {filter}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[560px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                        <th className="py-2.5 px-3">Faculty Member</th>
                        <th className="py-2.5 px-2">Assigned / Cap</th>
                        <th className="py-2.5 px-2">Published (M–F)</th>
                        <th className="py-2.5 px-2">Discrepancy</th>
                        <th className="py-2.5 px-2">Utilization</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFaculty.map((f) => {
                        const isSelected = selectedFaculty?.facultyId === f.facultyId;
                        return (
                          <tr
                            key={f.facultyId}
                            onClick={() => setSelectedFaculty(f)}
                            className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                              isSelected ? 'bg-indigo-50/50' : ''
                            }`}
                          >
                            <td className="py-3 px-3">
                              <div className="font-semibold text-slate-900">{f.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {f.employeeCode || 'No Code'} • {f.designation || f.departmentName}
                              </div>
                            </td>

                            <td className="py-3 px-2">
                              <div className="font-bold text-slate-800">
                                {f.assignedWeeklyHours} /{' '}
                                {f.maxWeeklyHours !== null ? `${f.maxWeeklyHours}h` : 'Unconf.'}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                Sched: {f.scheduledWeeklyHours}h ({f.theoryHours}Th + {f.labHours}L)
                              </div>
                            </td>

                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
                                <span>{f.dailyHours.MON}</span>·<span>{f.dailyHours.TUE}</span>·
                                <span>{f.dailyHours.WED}</span>·<span>{f.dailyHours.THU}</span>·
                                <span>{f.dailyHours.FRI}</span>
                              </div>
                            </td>

                            <td className="py-3 px-2 font-mono text-xs">
                              {f.allocationDiscrepancyHours === 0 ? (
                                <span className="text-emerald-600">0h</span>
                              ) : (
                                <span className="text-amber-700 font-bold">
                                  {f.allocationDiscrepancyHours > 0 ? '+' : ''}
                                  {f.allocationDiscrepancyHours}h
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-2">
                              {f.utilizationPct !== null ? (
                                <div className="w-20">
                                  <div className="text-[10px] font-medium text-slate-700 mb-0.5">
                                    {f.utilizationPct}%
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        f.utilizationPct > 100
                                          ? 'bg-red-500'
                                          : f.utilizationPct >= 70
                                          ? 'bg-emerald-500'
                                          : 'bg-amber-400'
                                      }`}
                                      style={{ width: `${Math.min(100, f.utilizationPct)}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">N/A</span>
                              )}
                            </td>

                            <td className="py-3 px-3">{getStatusBadge(f.workloadStatus)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Individual Inspector */}
            <div className="space-y-4">
              {selectedFaculty ? (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-400 font-semibold">
                        {selectedFaculty.employeeCode || 'No Employee Code'}
                      </span>
                      {getStatusBadge(selectedFaculty.workloadStatus)}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      {selectedFaculty.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedFaculty.designation || 'Designation not set'} •{' '}
                      {selectedFaculty.departmentName}
                    </p>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Cabin: {selectedFaculty.cabinLocation || 'Not specified'}
                    </div>
                  </div>

                  {/* Assigned vs Cap */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700">Assigned vs. Limit</span>
                      <span className="font-bold text-indigo-600">
                        {selectedFaculty.assignedWeeklyHours}h /{' '}
                        {selectedFaculty.maxWeeklyHours !== null
                          ? `${selectedFaculty.maxWeeklyHours}h`
                          : 'Unconfigured'}
                      </span>
                    </div>
                    {selectedFaculty.utilizationPct !== null && (
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            selectedFaculty.utilizationPct > 100 ? 'bg-red-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${Math.min(100, selectedFaculty.utilizationPct)}%` }}
                        />
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                      <span>
                        Remaining:{' '}
                        {selectedFaculty.remainingCapacityHours !== null
                          ? `${selectedFaculty.remainingCapacityHours}h`
                          : 'N/A'}
                      </span>
                      <span>Published Sched: {selectedFaculty.scheduledWeeklyHours}h</span>
                    </div>
                  </div>

                  {/* Daily Allocation Matrix */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Calendar size={13} className="text-indigo-600" />
                      Published Daily Periods (Mon–Fri)
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 text-center">
                      {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map((day) => {
                        const hours = selectedFaculty.dailyHours[day];
                        const isExceeded =
                          selectedFaculty.maxDailyHours !== null &&
                          hours > selectedFaculty.maxDailyHours;
                        return (
                          <div
                            key={day}
                            className={`p-2 rounded-lg border text-xs ${
                              isExceeded
                                ? 'bg-red-50 border-red-200 text-red-700 font-bold'
                                : hours > 0
                                ? 'bg-white border-slate-200 text-slate-800 font-semibold'
                                : 'bg-slate-100/60 border-slate-200/40 text-slate-400'
                            }`}
                          >
                            <div className="text-[10px] text-slate-400 font-medium">{day}</div>
                            <div className="text-sm mt-0.5">{hours}h</div>
                          </div>
                        );
                      })}
                    </div>
                    {selectedFaculty.maxDailyHours !== null &&
                      selectedFaculty.peakDailyHours > selectedFaculty.maxDailyHours && (
                        <div className="flex items-center gap-1.5 text-[11px] text-red-600 mt-2 font-medium">
                          <AlertTriangle size={12} />
                          <span>
                            Peak day ({selectedFaculty.peakDailyHours}h) exceeds rule cap (
                            {selectedFaculty.maxDailyHours}h).
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Assigned Courses */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <BookOpen size={13} className="text-indigo-600" />
                      Faculty Assignments ({selectedFaculty.assignedCourses.length})
                    </div>
                    <div className="space-y-1.5">
                      {selectedFaculty.assignedCourses.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-center justify-between"
                        >
                          <span className="font-medium truncate">
                            {c.subjectCode} — {c.subjectName} ({c.sectionCode})
                          </span>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                            {c.requiredPeriodsPerWeek}p/wk
                          </span>
                        </div>
                      ))}
                      {selectedFaculty.assignedCourses.length === 0 && (
                        <div className="text-xs text-slate-400 italic p-2">
                          No active FacultyAssignment records in this scope.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Faculty Availability */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                      <Clock size={13} className="text-indigo-600" />
                      Configured Availability ({selectedFaculty.availabilitySlots.length})
                    </div>
                    <div className="space-y-1.5">
                      {selectedFaculty.availabilitySlots.map((av) => (
                        <div
                          key={av.id}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-700 flex items-center justify-between"
                        >
                          <span>
                            {av.dayOfWeek ? DAY_NAMES[av.dayOfWeek] || `Day ${av.dayOfWeek}` : 'Any'}{' '}
                            {av.startTime && av.endTime ? `${av.startTime}–${av.endTime}` : ''}
                            {av.reason ? ` (${av.reason})` : ''}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                              av.availabilityType === 'UNAVAILABLE'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {av.availabilityType}
                          </span>
                        </div>
                      ))}
                      {selectedFaculty.availabilitySlots.length === 0 && (
                        <div className="text-xs text-slate-400 italic p-2">
                          No FacultyAvailability constraints configured.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
                  Select a faculty member to inspect workload details.
                </div>
              )}
            </div>
          </div>

          {/* Schema Limitations */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <Info className="w-4 h-4 text-slate-500" />
              <span>Schema & Calculation Notes</span>
            </div>
            <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5">
              {overview.schemaLimitations.map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
