import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Clock,
  ExternalLink,
} from 'lucide-react';

export const CandidateComparison: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string>('cand-a');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/solver/candidates/compare'))
      .then((res) => res.json())
      .then((res) => setData(res.data))
      .catch((err) => console.error(err));
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const { candidates, differentialVisualizer, constraintVerifications, impactDeltas } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
              AY: 2024–25 (Odd Sem)
            </span>
            <span className="text-xs font-semibold text-slate-500">Dept: Computer Science & Engg</span>
            <span className="text-xs font-semibold text-slate-500">• Cohort Target: 5th Sem (CSE-B)</span>
            <span className="text-xs font-bold text-slate-800">• Baseline Scheme: {data.activeBaselineVersion}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Timetable Candidate Comparison & Quality Metrics
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Multi-candidate constraint objective evaluation • CP-SAT vs Greedy Heuristics • Reproducible Benchmarks
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start lg:self-auto">
          <button className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
            Audit Log & Version History
          </button>
          <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer">
            <GitCompare className="w-3.5 h-3.5 text-blue-400" />
            <span>Re-run Constraint Repair</span>
          </button>
        </div>
      </div>

      {/* 3 Candidate Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {candidates.map((cand: any) => (
          <div
            key={cand.id}
            onClick={() => setSelectedCandidate(cand.id)}
            className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
              selectedCandidate === cand.id
                ? 'bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-extrabold text-blue-700 uppercase">
                  {cand.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    cand.isRecommended
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {cand.impactCategory}
                </span>
              </div>

              <h3 className="font-extrabold text-sm text-slate-900 mb-1 leading-snug">
                {cand.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {cand.description}
              </p>

              <div className="p-3 bg-white/80 rounded-xl border border-slate-200/80 mb-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400 font-medium">DISRUPTION IMPACT SCORE:</span>
                  <span className="font-black text-slate-900">{cand.disruptionImpactScore} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${cand.disruptionImpactScore}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/60">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target Time:</span>
                  <span className="font-semibold text-slate-800">{cand.targetTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Venue:</span>
                  <span className="font-semibold text-slate-800">{cand.venue}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Replacement:</span>
                  <span className="font-bold text-slate-900">{cand.replacement}</span>
                </div>
              </div>
            </div>

            <button
              className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCandidate === cand.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {selectedCandidate === cand.id ? 'Strategy Active (Selected)' : 'Select Candidate'}
            </button>
          </div>
        ))}
      </div>

      {/* Schedule Differential Visualizer */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">Schedule Differential Visualizer</h2>
          <div className="text-xs text-slate-500 font-medium">
            Comparative side-by-side inspection showing proposed Period 1 isolation and zero downstream schedule corruption.
          </div>
        </div>

        {/* Side-by-side Visualizer */}
        <div className="space-y-3">
          {/* Original Schedule */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Original Schedule (Baseline Master v4.2)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {differentialVisualizer.original.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs ${
                    s.isDisrupted
                      ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/10'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{s.slot}</span>
                    <span className="font-bold">{s.period}</span>
                  </div>
                  <div className={`font-bold ${s.isDisrupted ? 'text-rose-900' : 'text-slate-900'}`}>
                    {s.title}
                  </div>
                  <div className={`text-[11px] ${s.isDisrupted ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                    {s.faculty}
                  </div>
                  {s.isDisrupted && (
                    <span className="inline-block mt-1 px-1.5 py-0.2 bg-rose-200 text-rose-800 text-[9px] font-black rounded">
                      DISRUPTED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Repaired Schedule */}
          <div className="pt-2">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">
              Repaired Schedule (Option A Applied — Feasible Proxy)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              {differentialVisualizer.repaired.map((s: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs ${
                    s.isChanged
                      ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/10'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span>{s.slot}</span>
                    <span className="font-bold">{s.period}</span>
                  </div>
                  <div className="font-bold text-slate-900">{s.title}</div>
                  <div className={`text-[11px] ${s.isChanged ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    {s.faculty}
                  </div>
                  {s.isChanged && (
                    <span className="inline-block mt-1 px-1.5 py-0.2 bg-emerald-200 text-emerald-900 text-[9px] font-black rounded">
                      PROXY APPLIED
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Algorithmic Constraint Verification & Comparative Impact Deltas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Algorithmic Constraint Verification */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-extrabold text-slate-900">Algorithmic Constraint Verification</h3>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-black text-xs border border-emerald-200">
              5 / 5 Hard Constraints Satisfied
            </span>
          </div>

          <div className="space-y-2.5">
            {constraintVerifications.map((cv: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{cv.name}</span>
                    <span className="text-[10px] font-bold text-emerald-700 font-mono">PASS</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5">{cv.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right (5 cols): Comparative Impact Deltas & Governance */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 pb-2 border-b border-slate-100">
              Comparative Impact Deltas vs Baseline v4.2
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Students Affected</div>
                <div className="text-lg font-black text-slate-900">{impactDeltas.studentsEnrolled} Enrolled</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">0 Batch Inconvenience</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Sessions Shifted</div>
                <div className="text-lg font-black text-slate-900">{impactDeltas.sessionsShifted} Single Slot</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">0 Downstream Ripple</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Room Variance</div>
                <div className="text-lg font-black text-slate-900">{impactDeltas.roomVariancePct}% Shift</div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">PJ-302 Retained</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Curricular Deviation</div>
                <div className="text-lg font-black text-slate-900">&lt; {impactDeltas.curricularDeviationPct}%</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">Within DAAB Tolerance</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
              <div className="font-bold text-slate-800">Workload Re-allocation Balance</div>
              <div className="text-[11px] text-slate-600 flex justify-between">
                <span>Prof. S. Malathi (Proxy):</span>
                <span className="font-bold text-emerald-700">{impactDeltas.workloadBalance.profSMalathi}</span>
              </div>
              <div className="text-[11px] text-slate-600 flex justify-between">
                <span>Dr. A. Ramanathan (Leave):</span>
                <span className="font-bold text-slate-700">{impactDeltas.workloadBalance.drARamanathan}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Decision Authorization Gatekeeper Banner */}
      <div className="bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>HOD Academic Governance & Decision Authorization</span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 mt-2">
              <strong>Mandatory Autonomous Clause & Justification Note:</strong> Authorized substitute faculty allocation under Autonomous Academic Cluster 02. Schedule exception published for 14-Oct-2024 only; base v4.2 master timetable remains authoritative.
            </div>
          </div>

          <div className="shrink-0 flex flex-col space-y-2">
            {published ? (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center text-xs font-bold text-emerald-900">
                ✓ Exception Authorized & Published to Central Timetable Feed
              </div>
            ) : (
              <button
                onClick={() => setPublished(true)}
                className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorize & Publish Exception</span>
              </button>
            )}
            <div className="text-[10px] text-slate-400 text-center font-medium">
              Authorizing triggers live push to BMSCE Student Mobile App & Hallway Displays
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

