import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import { NavLink } from 'react-router-dom';
import {
  Rocket,
  Wrench,
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export const HODDashboard: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approvedProposal, setApprovedProposal] = useState(false);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/hod/dashboard-overview'))
      .then((res) => res.json())
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load HOD dashboard:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const { metrics, liveRoomMatrix, activeDisruptions, recentAuditLogs } = data;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                Cluster Alpha • Synthetic Environment
              </span>
              <span className="text-[11px] font-bold text-slate-500">Dept Code: DEMO-CSE</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {data.department}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{data.academicYear}</p>
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
            <button className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer">
              <Users className="w-3.5 h-3.5 text-slate-600" />
              <span>Workload Balancing</span>
            </button>
          </div>
        </div>

        {/* 5 Top Key Metric Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>SYNTHETIC TIMETABLE</span>
              <span className="text-emerald-600">v4.2</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {metrics.timetableSolvedPct}% Solved
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
              0 Hard Conflicts • 4 Soft Balanced
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>SAMPLE FACULTY</span>
              <span className="text-blue-600">46/48 Active</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              Average {metrics.facultyAvgHrsPerWeek} hrs
            </div>
            <div className="text-[11px] font-semibold text-amber-600 mt-0.5">
              1 Leave Alert Pending
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>LAB & ROOM LOAD</span>
              <span className="text-purple-600">Peak 96%</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {metrics.labRoomLoadPct}% Utilized
            </div>
            <div className="text-[11px] font-semibold text-slate-500 mt-0.5">
              4 Free Rooms for Buffer
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>HOD DECISION QUEUE</span>
              <span className="text-rose-600">1 Pending</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {metrics.pendingProposalsCount} Proposals
            </div>
            <div className="text-[11px] font-semibold text-rose-600 mt-0.5">
              Review Required
            </div>
          </div>

          <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase">
              <span>NEP SYNTHETIC RULES</span>
              <span className="text-emerald-600">Compliant</span>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1">
              {metrics.nepAuditPassPct}% Audit Pass
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
              Slot Limits & Ratios Verified
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Live Matrix (Left 2 cols) & Action Drawers (Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Live Room & Laboratory Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-2">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Live Room & Laboratory Matrix
                </h2>
                <div className="text-xs text-slate-500 font-medium">
                  Real-time slot tracking: 10:15 AM – 11:15 AM (Slot 3) • Academic Complex & PG Block
                </div>
              </div>
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto text-xs font-bold text-slate-600">
                <button className="px-2.5 py-1 rounded bg-white text-slate-900 shadow-2xs cursor-pointer">
                  All Facilities
                </button>
                <button className="px-2.5 py-1 rounded hover:text-slate-900 cursor-pointer">
                  Classrooms
                </button>
                <button className="px-2.5 py-1 rounded hover:text-slate-900 cursor-pointer">
                  Advanced Labs
                </button>
              </div>
            </div>

            {/* Room Matrix Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {liveRoomMatrix.map((rm: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    rm.status === 'IN_USE'
                      ? 'bg-slate-50/70 border-slate-200'
                      : rm.status === 'FREE'
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-slate-900">{rm.code}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        rm.status === 'IN_USE'
                          ? 'bg-blue-100 text-blue-800'
                          : rm.status === 'FREE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {rm.status === 'IN_USE' ? 'IN USE' : rm.status === 'FREE' ? 'FREE' : 'NETWORK CHECK'}
                    </span>
                  </div>
                  <div className="font-bold text-xs text-slate-800 leading-tight">
                    {rm.currentCohort}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 mt-2.5 pt-2 border-t border-slate-200/60">
                    <span>{rm.faculty}</span>
                    <span className="font-mono text-slate-600">{rm.cap}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
              <div className="flex items-center space-x-3 text-[11px]">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  <span>10 Active Labs & Classrooms</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>4 Available</span>
                </span>
              </div>
              <button className="text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer">
                <span>Full Facility Master Map</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Schedule Adjustments & Automation Log Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Recent Schedule Adjustments & Live Automation Log
                </h3>
                <div className="text-xs text-slate-500">Audited operational transactions for Odd Semester 2024–25</div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                Auto-Sync Enabled
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Timestamp / Code</th>
                    <th className="py-2.5 px-3">Target Entity</th>
                    <th className="py-2.5 px-3">Event Description & Context</th>
                    <th className="py-2.5 px-3">Authorized By</th>
                    <th className="py-2.5 px-3 text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentAuditLogs.map((log: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">
                        {log.targetEntity}
                      </td>
                      <td className="py-3 px-3 text-slate-600 leading-snug">
                        {log.eventDescription}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {log.authorizedBy}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.validation === 'CLEARED' || log.validation === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.validation === 'AUTO-LOCKED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.validation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Decision Drawers (Active Disruptions & Proposals) */}
        <div className="space-y-6">
          {/* 1. Active Disruptions Banner */}
          <div className="bg-white rounded-2xl p-6 border-2 border-amber-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black text-amber-900 uppercase">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>1. ACTIVE DISRUPTIONS</span>
              </div>
              <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-extrabold">
                LIVE UNRESOLVED ALERT
              </span>
            </div>

            {activeDisruptions.map((dis: any) => (
              <div key={dis.id} className="space-y-2">
                <div className="font-extrabold text-sm text-slate-900">{dis.title}</div>
                <div className="text-xs font-semibold text-slate-700">{dis.subject}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{dis.affectedCohort}</div>
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
                  {dis.actionNote}
                </div>
              </div>
            ))}

            <div className="pt-2 flex flex-col space-y-2">
              <NavLink
                to="/disruption-repair"
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all"
              >
                <Wrench className="w-3.5 h-3.5 text-blue-400" />
                <span>Initiate Timetable Repair Studio</span>
              </NavLink>
              <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer">
                Assign Proxy Faculty (3 Available)
              </button>
            </div>
          </div>

          {/* 2. Pending Repair Proposals */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-black text-slate-900 uppercase">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>2. PENDING REPAIR PROPOSALS</span>
              </div>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                TENTATIVE APPROVAL
              </span>
            </div>

            {approvedProposal ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <div className="text-xs font-extrabold text-emerald-900">
                  Proposal #TR-204 Approved & Applied
                </div>
                <div className="text-[11px] text-emerald-700">
                  Dated exception generated for 14-Oct-2024. Base master timetable remains authoritative.
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">Proposal #TR-204</span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                    Recommended
                  </span>
                </div>
                <div className="text-xs text-slate-600 leading-snug">
                  Assign <strong>Sample Faculty A</strong> as proxy for DEMO-CS303 or swap with Thursday Slot 5 (0 hard conflicts, 0 credit imbalance).
                </div>
                <div className="pt-2 flex items-center space-x-2">
                  <button
                    onClick={() => setApprovedProposal(true)}
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>1-Click Approve</span>
                  </button>
                  <button className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer">
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Approved & Published Changes */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black text-slate-900 uppercase">
                3. APPROVED & PUBLISHED CHANGES
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">AUDIT LOG</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Proposal #PR-201: Sample Faculty B swap</span>
                  <span className="text-[10px] text-slate-400">08:30 AM</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Approved & Locked in Master Timetable v4.2
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Proposal #PR-198: Buffer Lab Slot</span>
                  <span className="text-[10px] text-slate-400">Yesterday</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Verified Compliant • Cluster Synchronized
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

