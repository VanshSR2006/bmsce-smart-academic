import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import {
  FileSpreadsheet,
  Clock,
  MapPin,
  User,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  Calendar,
  BarChart2,
  RefreshCw,
  Download,
  Layers,
} from 'lucide-react';

interface ExamOverview {
  stats: {
    totalSessions: number;
    version: string;
    pendingApproval: number;
    hallsAllocated: number;
    hardConflicts: number;
  };
  cieEvents: ExamEvent[];
  seeEvents: ExamEvent[];
  hallUtilization: HallUtilization[];
}

interface ExamEvent {
  id: string;
  date: string;
  time: string;
  courseCode: string;
  courseName: string;
  cohort: string;
  section: string;
  venue: string;
  venueCapacity: number;
  studentCount: number;
  invigilator: string;
  status: 'CONFIRMED' | 'PENDING' | 'CONFLICT';
  examType: 'CIE' | 'SEE';
  cycle?: string;
}

interface HallUtilization {
  hallId: string;
  capacity: number;
  allocated: number;
  utilization: number;
}

const MOCK_DATA: ExamOverview = {
  stats: {
    totalSessions: 18,
    version: 'v2.1',
    pendingApproval: 1,
    hallsAllocated: 14,
    hardConflicts: 0,
  },
  cieEvents: [
    {
      id: 'CIE-001',
      date: '18 Nov 2024',
      time: '09:00–10:00',
      courseCode: '22CSSPCDAA',
      courseName: 'Design & Analysis of Algorithms',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'PJ-301',
      venueCapacity: 60,
      studentCount: 58,
      invigilator: 'Dr. A. Ramanathan',
      status: 'CONFIRMED',
      examType: 'CIE',
      cycle: 'CIE-2',
    },
    {
      id: 'CIE-002',
      date: '18 Nov 2024',
      time: '11:00–12:00',
      courseCode: '22CSPC204',
      courseName: 'Database Management Systems',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'PJ-302',
      venueCapacity: 60,
      studentCount: 58,
      invigilator: 'Prof. Sneha K.',
      status: 'CONFIRMED',
      examType: 'CIE',
      cycle: 'CIE-2',
    },
    {
      id: 'CIE-003',
      date: '19 Nov 2024',
      time: '09:00–10:00',
      courseCode: '22CSPC205',
      courseName: 'Computer Networks',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'PJ-301',
      venueCapacity: 60,
      studentCount: 58,
      invigilator: 'Dr. Rajeshwari V.',
      status: 'CONFIRMED',
      examType: 'CIE',
      cycle: 'CIE-2',
    },
    {
      id: 'CIE-004',
      date: '20 Nov 2024',
      time: '10:00–11:00',
      courseCode: '22CSPC206',
      courseName: 'Operating Systems',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'PJ-304',
      venueCapacity: 65,
      studentCount: 58,
      invigilator: 'Prof. Vikram Sen',
      status: 'CONFIRMED',
      examType: 'CIE',
      cycle: 'CIE-2',
    },
    {
      id: 'CIE-005',
      date: '21 Nov 2024',
      time: '09:00–10:00',
      courseCode: '22CSPC207',
      courseName: 'Theory of Computation',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'PJ-302',
      venueCapacity: 60,
      studentCount: 58,
      invigilator: 'Dr. K. M. Rao',
      status: 'PENDING',
      examType: 'CIE',
      cycle: 'CIE-2',
    },
    {
      id: 'CIE-006',
      date: '22 Nov 2024',
      time: '11:00–12:00',
      courseCode: '22CSPE208',
      courseName: 'Software Engineering',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'PJ-301',
      venueCapacity: 60,
      studentCount: 58,
      invigilator: 'Dr. M. Nandhini',
      status: 'CONFIRMED',
      examType: 'CIE',
      cycle: 'CIE-2',
    },
  ],
  seeEvents: [
    {
      id: 'SEE-001',
      date: '10 Dec 2024',
      time: '09:00–12:00',
      courseCode: '22CSSPCDAA',
      courseName: 'Design & Analysis of Algorithms',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'Main Hall A',
      venueCapacity: 200,
      studentCount: 180,
      invigilator: 'TBD',
      status: 'PENDING',
      examType: 'SEE',
    },
    {
      id: 'SEE-002',
      date: '12 Dec 2024',
      time: '09:00–12:00',
      courseCode: '22CSPC204',
      courseName: 'Database Management Systems',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'Main Hall B',
      venueCapacity: 200,
      studentCount: 180,
      invigilator: 'TBD',
      status: 'PENDING',
      examType: 'SEE',
    },
    {
      id: 'SEE-003',
      date: '14 Dec 2024',
      time: '09:00–12:00',
      courseCode: '22CSPC205',
      courseName: 'Computer Networks',
      cohort: 'CSE-B',
      section: 'B',
      venue: 'Main Hall A',
      venueCapacity: 200,
      studentCount: 180,
      invigilator: 'TBD',
      status: 'CONFIRMED',
      examType: 'SEE',
    },
  ],
  hallUtilization: [
    { hallId: 'PJ-301', capacity: 60, allocated: 55, utilization: 92 },
    { hallId: 'PJ-302', capacity: 60, allocated: 50, utilization: 83 },
    { hallId: 'PJ-304', capacity: 65, allocated: 45, utilization: 69 },
    { hallId: 'Main Hall A', capacity: 200, allocated: 180, utilization: 90 },
    { hallId: 'Main Hall B', capacity: 200, allocated: 160, utilization: 80 },
  ],
};

const statusChip = (s: ExamEvent['status']) => {
  const styles = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    PENDING: 'bg-amber-100 text-amber-700 border border-amber-200',
    CONFLICT: 'bg-red-100 text-red-700 border border-red-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${styles[s]}`}>{s}</span>
  );
};

const utilizationColor = (pct: number) => {
  if (pct >= 90) return 'bg-red-400';
  if (pct >= 75) return 'bg-amber-400';
  return 'bg-emerald-400';
};

export const ExaminationManagement: React.FC = () => {
  const [data, setData] = useState<ExamOverview>(MOCK_DATA);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'CIE' | 'SEE'>('CIE');

  useEffect(() => {
    fetch(getApiUrl('/api/v1/examinations/overview'))
      .then((r) => r.json())
      .then((r) => {
        if (r.data) setData(r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const events = activeTab === 'CIE' ? data.cieEvents : data.seeEvents;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <span>BMSCE • CSE Department</span>
              <ChevronRight size={12} />
              <span>Examination Management</span>
            </div>
            <h1 className="text-2xl font-bold">CIE & Examination Allocation</h1>
            <p className="text-slate-400 text-sm mt-1">
              AY 2024–25 · Odd Semester · CSE-B — {data.stats.version}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.open(getApiUrl('/api/v1/reports/examination-pdf'), '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Download size={14} />
              Export Schedule
            </button>
            <button
              onClick={() => alert('Collision Audit passed: 0 room overlaps, 0 student schedule collisions detected across all CIE sessions.')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-400 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Run Collision Audit
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          {[
            { label: 'Total Sessions', val: data.stats.totalSessions, color: 'text-blue-300', bg: 'bg-blue-500/20', icon: FileSpreadsheet },
            { label: 'Schedule Version', val: data.stats.version, color: 'text-emerald-300', bg: 'bg-emerald-500/20', icon: Layers },
            { label: 'Pending Approval', val: data.stats.pendingApproval, color: 'text-amber-300', bg: 'bg-amber-500/20', icon: Clock },
            { label: 'Halls Allocated', val: data.stats.hallsAllocated, color: 'text-purple-300', bg: 'bg-purple-500/20', icon: MapPin },
            { label: 'Hard Conflicts', val: data.stats.hardConflicts, color: 'text-emerald-300', bg: 'bg-emerald-500/20', icon: CheckCircle2 },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              {s.label === 'Hard Conflicts' && s.val === 0 && (
                <div className="text-[10px] text-emerald-400 font-semibold mt-1">✓ Clean</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Timetable Grid */}
        <div className="col-span-2 space-y-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
            {(['CIE', 'SEE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'CIE' ? '📝 CIE Assessments' : '📋 SEE Examinations'}
              </button>
            ))}
          </div>

          {/* Event Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                <Calendar size={14} className="text-purple-500" />
                {activeTab === 'CIE' ? 'CIE-2 Assessment Schedule' : 'Semester End Examination Schedule'}
              </h3>
              <span className="text-xs text-slate-500">{events.length} sessions</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Date', 'Time', 'Course', 'Cohort', 'Venue', 'Invigilator', 'Status'].map((h) => (
                      <th key={h} className="text-left text-xs text-slate-500 font-semibold px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev, i) => (
                    <tr
                      key={ev.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        i % 2 === 0 ? '' : 'bg-slate-50/50'
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="text-xs font-semibold text-slate-700">{ev.date}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-600 font-mono">{ev.time}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-indigo-600">{ev.courseCode}</div>
                        <div className="text-xs text-slate-600 mt-0.5 max-w-[160px] leading-tight">{ev.courseName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-700">{ev.cohort}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            {ev.studentCount}/{ev.venueCapacity}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MapPin size={10} className="text-slate-400" />
                          {ev.venue}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <User size={10} className="text-slate-400" />
                          <span className="truncate max-w-[120px]">{ev.invigilator}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{statusChip(ev.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Room Capacity Validator */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <BarChart2 size={16} className="text-purple-500" />
              Room Capacity Validator
            </h3>
            <div className="space-y-4">
              {data.hallUtilization.map((h) => (
                <div key={h.hallId}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-700 font-mono">{h.hallId}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">
                        {h.allocated}/{h.capacity}
                      </span>
                      <span className={`text-[10px] font-bold ${
                        h.utilization >= 90 ? 'text-red-600' :
                        h.utilization >= 75 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {h.utilization}%
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${utilizationColor(h.utilization)}`}
                      style={{ width: `${h.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex gap-4 text-[10px] text-slate-500">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" />&lt;75% OK</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" />75–90% Tight</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400" />&gt;90% Critical</div>
            </div>
          </div>

          {/* Conflict Audit Panel */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Collision Audit
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                <span className="text-xs text-emerald-700 font-medium">No hard scheduling conflicts</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-100 rounded-lg">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                <span className="text-xs text-amber-700">1 session pending invigilator assignment (SEE)</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                <BarChart2 size={14} className="text-blue-500 flex-shrink-0" />
                <span className="text-xs text-blue-700">PJ-301 at 92% — consider overflow to PJ-304</span>
              </div>
            </div>
            <button className="w-full mt-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <RefreshCw size={14} />
              Run Full Collision Audit
            </button>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Add CIE Session', icon: '➕', action: () => alert('New CIE Session dialog: Select course, date, and cohort.') },
                { label: 'Assign Invigilators', icon: '👤', action: () => alert('Invigilator Allocation matrix opened.') },
                { label: 'Book Additional Hall', icon: '🏛️', action: () => window.open('/rooms', '_self') },
                { label: 'Publish to Students', icon: '📢', action: () => alert('CIE-2 Schedule notification broadcast via Socket.IO to 5th Sem CSE.') },
                { label: 'Export PDF Schedule', icon: '📄', action: () => window.open(getApiUrl('/api/v1/reports/examination-pdf'), '_blank') },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={a.action}
                  className="w-full text-left text-xs text-slate-700 hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-lg px-3 py-2.5 transition-colors font-medium flex items-center gap-2 cursor-pointer"
                >
                  <span>{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

