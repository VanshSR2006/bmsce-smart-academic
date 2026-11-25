import React, { useState } from 'react';
import { getApiUrl } from '../../lib/api';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import {
  Calendar,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

export const StudentTimetableGrid: React.FC = () => {
  const { data, loading, error, refetch } = useApiQuery<any>('/api/v1/sections/demo/timetable');
  const [activeBatch, setActiveBatch] = useState('ALL');

  if (loading) {
    return <QueryStateCard mode="loading" message="Loading master timetable grid..." />;
  }

  if (error) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load Timetable Grid"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!data || (!data.slots && !data.sessions)) {
    return (
      <QueryStateCard
        mode="empty"
        title="No Timetable Slots Available"
        message="No timetable schedule was returned for this section."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Weekly Academic Timetable
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200">
                {data.sectionCode}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                {data.academicTermLabel}
              </span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
                Synthetic Data Preview
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {data.departmentName} • Class In-charge: {data.classInCharge} • Primary Room: {data.primaryRoom}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <button className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer">
              <Share2 className="w-3.5 h-3.5" />
              <span>Sync Calendar</span>
            </button>
            <button
              onClick={() => window.open(getApiUrl('/api/v1/reports/timetable-pdf'), '_blank')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>

        {/* Schedule Notice Amber Banner */}
        <div className="mt-4 p-3 bg-amber-50/80 border border-amber-200/90 rounded-xl flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Schedule Notice:</strong> {data.scheduleNotice}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-amber-200/60 text-amber-800 text-[10px] font-bold shrink-0 hidden sm:inline">
            Temporary Shift
          </span>
        </div>

        {/* Week Switcher & Batch Filter Pills */}
        <div className="mt-5 flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
              <button className="p-1 hover:bg-white rounded text-slate-600 transition-all cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 text-xs font-bold text-slate-800">
                Week 7 (14 Oct – 19 Oct 2024)
              </span>
              <button className="p-1 hover:bg-white rounded text-slate-600 transition-all cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <button className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer">
              Current Week
            </button>
          </div>

          {/* Batch Selector Pills */}
          <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            {data.batches.map((b: any) => (
              <button
                key={b.code}
                onClick={() => setActiveBatch(b.code)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeBatch === b.code
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span>Theory Core</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>Lab Practical (3h)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Tutorial / Remedial</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-300"></span>
            <span>Break / Recess</span>
          </span>
        </div>
      </div>

      {/* Main Timetable Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-32 border-r border-slate-200">Period / Time</th>
                <th className="py-3 px-4 border-r border-slate-200">
                  <div>Monday</div>
                  <div className="text-[10px] text-slate-400 font-normal">14 Oct</div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200">
                  <div>Tuesday</div>
                  <div className="text-[10px] text-slate-400 font-normal">15 Oct</div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200 bg-blue-50/30">
                  <div className="flex items-center space-x-1">
                    <span>Wednesday</span>
                    <span className="px-1.5 py-0.2 bg-blue-600 text-white rounded text-[9px] font-bold">
                      TODAY
                    </span>
                  </div>
                  <div className="text-[10px] text-blue-600 font-normal">16 Oct</div>
                </th>
                <th className="py-3 px-4 border-r border-slate-200">
                  <div>Thursday</div>
                  <div className="text-[10px] text-slate-400 font-normal">17 Oct</div>
                </th>
                <th className="py-3 px-4">
                  <div>Friday</div>
                  <div className="text-[10px] text-slate-400 font-normal">18 Oct</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {/* Period 1 (08:30 - 09:30) */}
              <tr className="hover:bg-slate-50/40">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-700 bg-slate-50/40 border-r border-slate-200">
                  <div>08:30 – 09:30</div>
                  <div className="text-[10px] text-slate-400 font-sans font-medium">Period 1</div>
                </td>
                {/* Mon */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCDAA</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">DAA • Algorithms</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. A. Ramanathan</div>
                  </div>
                </td>
                {/* Tue */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-amber-800 font-mono">22CSSPCOPS</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-304</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Operating Systems</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Prof. Vikram Sen</div>
                  </div>
                </td>
                {/* Wed */}
                <td className="p-2 border-r border-slate-200 bg-blue-50/10">
                  <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-indigo-800 font-mono">22MASPCTFL</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Theory of Computation</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. K. M. Rao</div>
                  </div>
                </td>
                {/* Thu */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCDAA</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">DAA • Algorithms</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. A. Ramanathan</div>
                  </div>
                </td>
                {/* Fri */}
                <td className="p-2">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCCNT</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Computer Networks</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. Rajeshwari V.</div>
                  </div>
                </td>
              </tr>

              {/* Period 2 (09:30 - 10:30) */}
              <tr className="hover:bg-slate-50/40">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-700 bg-slate-50/40 border-r border-slate-200">
                  <div>09:30 – 10:30</div>
                  <div className="text-[10px] text-slate-400 font-sans font-medium">Period 2</div>
                </td>
                {/* Mon */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCDBMS</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Database Mgmt Sys</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Prof. Sneha K.</div>
                  </div>
                </td>
                {/* Tue */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCCNT</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Computer Networks</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. Rajeshwari V.</div>
                  </div>
                </td>
                {/* Wed */}
                <td className="p-2 border-r border-slate-200 bg-blue-50/10">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCSE</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Software Engg & Agile</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. M. Nandhini</div>
                  </div>
                </td>
                {/* Thu */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-amber-800 font-mono">22CSSPCOPS</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Operating Systems</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Prof. Vikram Sen</div>
                  </div>
                </td>
                {/* Fri */}
                <td className="p-2">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCDAA</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">DAA • Algorithms</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. A. Ramanathan</div>
                  </div>
                </td>
              </tr>

              {/* MORNING TEA & REFRESHMENT RECESS */}
              <tr className="bg-slate-100/70 border-y border-slate-200">
                <td className="py-2 px-4 font-mono font-bold text-[11px] text-slate-500 border-r border-slate-200">
                  10:30 – 10:45
                </td>
                <td colSpan={5} className="py-2 px-4 text-center text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  ☕ Morning Tea & Refreshment Recess (15 Mins)
                </td>
              </tr>

              {/* Period 3 (10:45 - 11:45) */}
              <tr className="hover:bg-slate-50/40">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-700 bg-slate-50/40 border-r border-slate-200">
                  <div>10:45 – 11:45</div>
                  <div className="text-[10px] text-slate-400 font-sans font-medium">Period 3</div>
                </td>
                {/* Mon */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCCNT</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Computer Networks</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. Rajeshwari V.</div>
                  </div>
                </td>
                {/* Tue */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCDAA</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">DAA • Algorithms</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. A. Ramanathan</div>
                  </div>
                </td>
                {/* Wed */}
                <td className="p-2 border-r border-slate-200 bg-blue-50/10">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCDBMS</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Database Mgmt Sys</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Prof. Sneha K.</div>
                  </div>
                </td>
                {/* Thu */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCSE</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Software Engineering</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. M. Nandhini</div>
                  </div>
                </td>
                {/* Fri */}
                <td className="p-2">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                    <div className="text-[10px] font-mono text-slate-400 font-bold">22OECSE01</div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Open Elective</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Dr. Shambhavi</div>
                  </div>
                </td>
              </tr>

              {/* Period 4 (11:45 - 12:45) */}
              <tr className="hover:bg-slate-50/40">
                <td className="py-3.5 px-4 font-mono font-bold text-slate-700 bg-slate-50/40 border-r border-slate-200">
                  <div>11:45 – 12:45</div>
                  <div className="text-[10px] text-slate-400 font-sans font-medium">Period 4</div>
                </td>
                {/* Mon */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-indigo-50/60 border border-indigo-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-indigo-800 font-mono">22MASPCTFL</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Theory of Computation</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. K. M. Rao</div>
                  </div>
                </td>
                {/* Tue */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-blue-50/60 border border-blue-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-blue-800 font-mono">22CSSPCDBMS</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Database Mgmt Sys</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Prof. Sneha K.</div>
                  </div>
                </td>
                {/* Wed */}
                <td className="p-2 border-r border-slate-200 bg-blue-50/10">
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-amber-800 font-mono">22CSSTUTNET</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900 text-[9px] font-bold">
                        TUT
                      </span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Networks Simulation</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Dr. Rajeshwari V.</div>
                  </div>
                </td>
                {/* Thu */}
                <td className="p-2 border-r border-slate-200">
                  <div className="p-2 rounded-xl bg-amber-100/70 border border-amber-300">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-amber-900 font-mono">22CSSPCCNT</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-600 text-white text-[9px] font-bold">
                        SEM-HALL 2
                      </span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">CN Guest Lecture</div>
                    <div className="text-[10px] text-slate-700 font-semibold mt-0.5">Dr. Ramanathan (IEEE)</div>
                  </div>
                </td>
                {/* Fri */}
                <td className="p-2">
                  <div className="p-2 rounded-xl bg-amber-50/60 border border-amber-200">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-bold text-amber-800 font-mono">22CSSPCOPS</span>
                      <span className="text-[10px] font-mono text-slate-500 font-bold">PJ-302</span>
                    </div>
                    <div className="font-extrabold text-slate-900 mt-0.5">Operating Systems</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">Prof. Vikram Sen</div>
                  </div>
                </td>
              </tr>

              {/* LUNCH RECESS */}
              <tr className="bg-slate-100/70 border-y border-slate-200">
                <td className="py-2.5 px-4 font-mono font-bold text-[11px] text-slate-500 border-r border-slate-200">
                  12:45 – 01:45
                </td>
                <td colSpan={5} className="py-2.5 px-4 text-center text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  🍽 Institutional Lunch Recess & Faculty Consultation (1 Hour)
                </td>
              </tr>

              {/* Afternoon 3-Hour Lab Block (01:45 - 04:45) */}
              <tr>
                <td className="py-4 px-4 font-mono font-bold text-slate-700 bg-slate-50/40 border-r border-slate-200 align-top">
                  <div>01:45 – 04:45</div>
                  <div className="text-[10px] text-slate-400 font-sans font-medium">Period 5–7 (Lab Block)</div>
                </td>
                {/* Mon */}
                <td className="p-2 border-r border-slate-200 align-top">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">DIRECTED</div>
                      <div className="font-extrabold text-slate-900">Library / Research Study</div>
                      <div className="text-[10px] text-slate-500">Faculty Mentor</div>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-amber-700 uppercase">OPS-TUT</div>
                      <div className="font-bold text-slate-800 text-[11px]">OS Kernel Workshop</div>
                      <div className="text-[10px] text-slate-500">Prof. Vikram Sen</div>
                    </div>
                  </div>
                </td>
                {/* Tue (3-Hour Lab Practical: DBMS Practicum) */}
                <td className="p-2 border-r border-slate-200 align-top">
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                        3-HR LAB PRACTICAL
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold">CS-Lab 2</span>
                    </div>
                    <div className="font-black text-xs text-slate-900">
                      DBMS Practicum (22CSSPL01)
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700">01:45 PM – 04:45 PM</div>
                    <div className="text-[10px] text-slate-600 space-y-0.5">
                      <div>• <strong>Batch B1:</strong> SQL Views & Stored Proc</div>
                      <div>• <strong>Batch B2:</strong> Relational Algebra Triggers</div>
                      <div>• <strong>Batch B3:</strong> Mini-Project Prototyping</div>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200 flex justify-between">
                      <span>Faculty: Prof. Sneha K.</span>
                      <span className="font-bold text-emerald-700">Continuous Eval</span>
                    </div>
                  </div>
                </td>
                {/* Wed (3-Hour Lab Practical: DAA Lab Practicum) */}
                <td className="p-2 border-r border-slate-200 align-top bg-blue-50/10">
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-extrabold uppercase">
                        WED LAB IMMERSION
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold">CS-Lab 1</span>
                    </div>
                    <div className="font-black text-xs text-slate-900">
                      DAA Lab Practicum (22CSSPL02)
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700">01:45 PM – 04:45 PM (Today)</div>
                    <div className="text-[10px] text-slate-600 space-y-0.5">
                      <div>• <strong>Batch B1 & B2:</strong> Dynamic Prog & Graph Traversals</div>
                      <div>• <strong>Batch B3:</strong> Divide & Conquer Analysis</div>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200 flex justify-between">
                      <span>Faculty: Dr. A. Ramanathan</span>
                      <span className="font-bold text-emerald-700">Journal Sign-off</span>
                    </div>
                  </div>
                </td>
                {/* Thu (3-Hour Lab: Computer Networks Lab) */}
                <td className="p-2 border-r border-slate-200 align-top">
                  <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                        3-HR LAB PRACTICAL
                      </span>
                      <span className="text-[10px] font-mono text-emerald-800 font-bold">Systems Lab 1</span>
                    </div>
                    <div className="font-black text-xs text-slate-900">
                      Computer Networks Lab (22CSSPL03)
                    </div>
                    <div className="text-[11px] font-bold text-emerald-700">01:45 PM – 04:45 PM</div>
                    <div className="text-[10px] text-slate-600 space-y-0.5">
                      <div>• <strong>Batch B1:</strong> Socket Programming in C</div>
                      <div>• <strong>Batch B2:</strong> Cisco Packet Tracer Routing</div>
                      <div>• <strong>Batch B3:</strong> Wireshark Packet Captures</div>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 border-t border-emerald-200 flex justify-between">
                      <span>Faculty: Dr. Rajeshwari V.</span>
                      <span className="font-bold text-emerald-700">Lab Logbook</span>
                    </div>
                  </div>
                </td>
                {/* Fri */}
                <td className="p-2 align-top">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">22TRAIN</div>
                      <div className="font-extrabold text-slate-900 text-[11px]">Aptitude & Soft Skills</div>
                      <div className="text-[10px] text-slate-500">Training Cell</div>
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="text-[10px] font-bold text-blue-700 uppercase">MENTORING</div>
                      <div className="font-bold text-slate-800 text-[11px]">Proctoring Hour</div>
                      <div className="text-[10px] text-slate-500">Class In-charge</div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 Bottom Governance & Accreditation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Curricular Load Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Curricular Load Breakdown
            </h3>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-black text-xs rounded-full">
              {data.loadBreakdown.totalHrs} hrs/wk
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">Core Theory</span>
              <div className="font-extrabold text-slate-800">{data.loadBreakdown.coreTheoryHrs}h Core Theory</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">Practicals</span>
              <div className="font-extrabold text-slate-800">{data.loadBreakdown.labPracticalHrs}h Lab Practicals</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">Tutorials</span>
              <div className="font-extrabold text-slate-800">{data.loadBreakdown.tutorialsHrs}h Tutorials</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium">Project</span>
              <div className="font-extrabold text-slate-800">{data.loadBreakdown.projectSeminarHrs}h Project/Seminar</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-600">
            <span>Required Attendance: {data.loadBreakdown.requiredAttendancePct}%</span>
            <span className="text-emerald-600 font-bold flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>CIE Eligible</span>
            </span>
          </div>
        </div>

        {/* Course Faculty Directory */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-3">
            Course Faculty Directory (Synthetic Data)
          </h3>
          <div className="space-y-2 text-xs">
            {data.facultyDirectory.map((f: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 last:border-0">
                <span className="font-mono text-slate-500 font-bold text-[11px]">{f.code} ({f.title})</span>
                <span className="font-semibold text-slate-800">{f.faculty}</span>
                <span className="text-[10px] text-slate-400 font-mono">{f.ext}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Governance & Ratification */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Governance & Ratification
              </h3>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-extrabold text-[10px] rounded border border-emerald-200">
                {data.governance.status}
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">HOD CSE:</span>
                <span className="font-bold text-slate-800">{data.governance.hod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Principal:</span>
                <span className="font-bold text-slate-800">{data.governance.principal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Doc ID:</span>
                <span className="font-mono text-slate-700 font-semibold text-[11px]">{data.governance.docId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Effective:</span>
                <span className="font-semibold text-slate-800">{data.governance.effectiveDate}</span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-emerald-700">
            <span className="flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Certified Matrix</span>
            </span>
            <span className="text-slate-400 font-mono text-[10px]">SHA-256 Validated</span>
          </div>
        </div>
      </div>
    </div>
  );
};

