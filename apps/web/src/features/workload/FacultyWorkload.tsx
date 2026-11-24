import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Download,
  Filter,
  Search,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  BookOpen,
  Calendar,
} from 'lucide-react';

interface FacultyItem {
  facultyId: string;
  name: string;
  email: string;
  employeeCode: string;
  designation: string;
  department: string;
  cabinLocation: string;
  maxWeeklyHours: number;
  maxDailyHours: number;
  weeklyHours: number;
  theoryHours: number;
  labHours: number;
  dailyHours: { MON: number; TUE: number; WED: number; THU: number; FRI: number };
  peakDailyHours: number;
  utilizationPct: number;
  status: 'OPTIMAL' | 'OVERLOAD' | 'UNDERLOAD' | 'STANDBY';
  assignedCourses: string[];
  isProxyEligible: boolean;
}

interface WorkloadData {
  academicTerm: string;
  department: string;
  metrics: {
    totalFaculty: number;
    avgLoadHoursPerWeek: number;
    totalInstructionalHours: number;
    balancedCount: number;
    overloadCount: number;
    underloadCount: number;
    compliantPct: number;
    regulatoryStandard: string;
  };
  faculty: FacultyItem[];
}

export const FacultyWorkload: React.FC = () => {
  const [data, setData] = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedFaculty, setSelectedFaculty] = useState<FacultyItem | null>(null);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/workload/overview'))
      .then((res) => res.json())
      .then((res) => {
        if (res.data) {
          setData(res.data);
          if (res.data.faculty?.length) setSelectedFaculty(res.data.faculty[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch faculty workload:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const filteredFaculty = data.faculty.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.designation.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: FacultyItem['status']) => {
    switch (status) {
      case 'OVERLOAD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">Overload</span>;
      case 'UNDERLOAD':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">Underload</span>;
      case 'OPTIMAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Optimal</span>;
      case 'STANDBY':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">Standby</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <span>BMSCE Autonomous System</span>
              <ChevronRight size={12} />
              <span>{data.department}</span>
              <ChevronRight size={12} />
              <span className="text-slate-300 font-semibold">Faculty Workload Distribution</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Faculty Workload & AICTE Load Thresholds
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Active Monitoring • Weekly & Daily Instructional Limits • {data.metrics.regulatoryStandard}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.open(getApiUrl('/api/v1/reports/workload-pdf'), '_blank')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} />
              Export Workload Summary
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Active Faculty</div>
            <div className="text-xl font-bold text-white mt-1">{data.metrics.totalFaculty}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">CSE Department Roster</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Avg Load / Prof</div>
            <div className="text-xl font-bold text-indigo-300 mt-1">{data.metrics.avgLoadHoursPerWeek} hrs</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Target: 16.0h - 18.0h</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Compliant Ratio</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{data.metrics.compliantPct}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Within Workload Bounds</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Optimal Workload</div>
            <div className="text-xl font-bold text-white mt-1">{data.metrics.balancedCount}</div>
            <div className="text-[10px] text-emerald-400 mt-0.5">12h - 18h Standard</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Overload Alerts</div>
            <div className="text-xl font-bold text-red-400 mt-1">{data.metrics.overloadCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">&gt; 18h / week or &gt; 4h/day</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Underload / Standby</div>
            <div className="text-xl font-bold text-amber-300 mt-1">{data.metrics.underloadCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Available for Substitute</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Faculty Table & Detailed Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Faculty Table (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
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
                {['ALL', 'OPTIMAL', 'OVERLOAD', 'UNDERLOAD', 'STANDBY'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      statusFilter === filter
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Faculty Member</th>
                    <th className="py-2.5 px-2">Load (Hrs/Wk)</th>
                    <th className="py-2.5 px-2">Daily (M-F)</th>
                    <th className="py-2.5 px-2">Peak Day</th>
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
                            {f.employeeCode} • {f.designation}
                          </div>
                        </td>

                        <td className="py-3 px-2">
                          <div className="font-bold text-slate-800">
                            {f.weeklyHours} / {f.maxWeeklyHours}h
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {f.theoryHours}h Th + {f.labHours}h Lab
                          </div>
                        </td>

                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600">
                            <span className="w-4 text-center">{f.dailyHours.MON}</span>
                            <span className="text-slate-300">·</span>
                            <span className="w-4 text-center">{f.dailyHours.TUE}</span>
                            <span className="text-slate-300">·</span>
                            <span className="w-4 text-center">{f.dailyHours.WED}</span>
                            <span className="text-slate-300">·</span>
                            <span className="w-4 text-center">{f.dailyHours.THU}</span>
                            <span className="text-slate-300">·</span>
                            <span className="w-4 text-center">{f.dailyHours.FRI}</span>
                          </div>
                        </td>

                        <td className="py-3 px-2">
                          <div className={`font-semibold ${f.peakDailyHours > 4 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                            {f.peakDailyHours} hrs
                          </div>
                          <div className="text-[10px] text-slate-400">Cap: 4.0h/day</div>
                        </td>

                        <td className="py-3 px-2">
                          <div className="w-20">
                            <div className="flex justify-between text-[10px] mb-0.5">
                              <span className="font-medium text-slate-700">{f.utilizationPct}%</span>
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
                        </td>

                        <td className="py-3 px-3">
                          {getStatusBadge(f.status)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Individual Inspector (1 col) */}
        <div className="space-y-4">
          {selectedFaculty ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">{selectedFaculty.employeeCode}</span>
                  {getStatusBadge(selectedFaculty.status)}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">{selectedFaculty.name}</h3>
                <p className="text-xs text-slate-500">{selectedFaculty.designation}</p>
                <div className="text-xs text-slate-400 mt-0.5">Cabin: {selectedFaculty.cabinLocation}</div>
              </div>

              {/* Weekly Balance Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Total Assigned Load</span>
                  <span className="font-bold text-indigo-600">
                    {selectedFaculty.weeklyHours} / {selectedFaculty.maxWeeklyHours} Hours ({selectedFaculty.utilizationPct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedFaculty.utilizationPct > 100 ? 'bg-red-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, selectedFaculty.utilizationPct)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0h (Min)</span>
                  <span>12h (Baseline)</span>
                  <span>{selectedFaculty.maxWeeklyHours}h (AICTE Max)</span>
                </div>
              </div>

              {/* Daily Allocation Matrix */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <Calendar size={13} className="text-indigo-600" />
                  Daily Contact Periods (Mon – Fri)
                </div>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {(['MON', 'TUE', 'WED', 'THU', 'FRI'] as const).map((day) => {
                    const hours = selectedFaculty.dailyHours[day];
                    const isExceeded = hours > selectedFaculty.maxDailyHours;
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
                {selectedFaculty.peakDailyHours > 4 && (
                  <div className="flex items-center gap-1.5 text-[11px] text-red-600 mt-2 font-medium">
                    <AlertTriangle size={12} />
                    <span>Exceeds daily cognitive cap of 4.0 instruction hours.</span>
                  </div>
                )}
              </div>

              {/* Assigned Subjects */}
              <div>
                <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-indigo-600" />
                  Curricular Allocations
                </div>
                <div className="space-y-1.5">
                  {selectedFaculty.assignedCourses.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700 flex items-center justify-between"
                    >
                      <span className="font-medium truncate">{c}</span>
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                  ))}
                  {selectedFaculty.assignedCourses.length === 0 && (
                    <div className="text-xs text-slate-400 italic p-2">No primary teaching courses assigned this semester.</div>
                  )}
                </div>
              </div>

              {/* Proxy Eligibility Tag */}
              {selectedFaculty.isProxyEligible && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-start gap-2.5">
                  <UserCheck size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-emerald-800">Verified Substitute / Proxy Eligible</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5 leading-snug">
                      Authorized by DAAB to assume contact duties in Algorithms, Software Engineering, and Computer Networks without timetable restructuring.
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
              Select a faculty member to inspect daily load metrics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
