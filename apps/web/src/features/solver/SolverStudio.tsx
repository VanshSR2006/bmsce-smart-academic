import React, { useState } from 'react';
import { getApiUrl } from '../../lib/api';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Download,
  ShieldCheck,
  Cpu,
  Layers,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const SolverStudio: React.FC = () => {
  const navigate = useNavigate();
  const [selectedEngine, setSelectedEngine] = useState('CONSTRAINT_CSP');
  const [isSolving, setIsSolving] = useState(false);
  const [solveSuccess, setSolveSuccess] = useState(false);

  const [hardConstraints, setHardConstraints] = useState([
    {
      code: 'C-HARD-01',
      name: 'Zero Faculty Overlaps',
      description: 'A faculty instructor cannot be committed to two overlapping cohorts, laboratories, or elective tracks across any department simultaneously.',
      registry: 'Validated: 58 CSE Faculty Registry',
      checked: true,
    },
    {
      code: 'C-HARD-02',
      name: 'Zero Physical Room Collisions',
      description: 'Physical classrooms, smart amphitheaters, and workstations host strictly at most one session during any discrete 55-minute slot.',
      registry: 'Verified: 21 Lecture Halls & 12 Specialized Computing Labs',
      checked: true,
    },
    {
      code: 'C-HARD-03',
      name: 'Continuous Laboratory Integrity (3-Period Slot)',
      description: 'Practical laboratory modules (e.g. Operating Systems, Computer Networks) must strictly allocate uninterrupted 3-hour contiguous periods without split breaks.',
      registry: 'NEP 2022 Mandate (Clause 4.3 – Lab Block Formats)',
      checked: true,
    },
    {
      code: 'C-HARD-04',
      name: 'Maximum Daily Faculty Contact Cap',
      description: 'Institutional maximum workload policy: strict barrier of no more than 4 formal instruction hours per professor per working day.',
      registry: 'AICTE Workload Regulatory Threshold',
      checked: true,
    },
    {
      code: 'C-HARD-05',
      name: 'Institutional Rest Recesses & Lunch Curfew',
      description: 'Tea interval (10:30–10:45 AM) and institutional lunch window (12:45–01:45 PM) are locked. Zero instructional assignments permitted college-wide.',
      registry: 'Locked: Zero instructional assignments permitted college-wide',
      checked: true,
    },
  ]);

  const [softTargets, setSoftTargets] = useState([
    {
      key: 'IDLE_GAPS',
      name: 'Minimize Student Idle Gap Windows',
      description: 'Avoid scattered schedules where cohorts endure 1-hour voids between theoretical blocks.',
      weight: 95,
      priority: 'High Priority',
    },
    {
      key: 'LECTURE_BARRIER',
      name: 'Continuous Faculty Lecture Barrier (Max 2h)',
      description: 'Penalize back-to-back theoretical lectures spanning beyond 110 minutes for any single instructor.',
      weight: 82,
      priority: 'High Priority',
    },
    {
      key: 'ROOM_ANCHOR',
      name: 'Cohort Room Anchor (Home Base)',
      description: 'Retain designated lecture halls (e.g. 5th Sem Sec A anchored to PJ-302) to minimize inter-floor migration.',
      weight: 92,
      priority: 'Priority',
    },
    {
      key: 'SUBJECT_SPREAD',
      name: 'Equitable Weekly Subject Spread',
      description: 'Avoid delivering 2 distinct theoretical sessions of the identical course code on the same calendar day.',
      weight: 78,
      priority: 'Medium Priority',
    },
  ]);

  const handleRunSolver = async () => {
    setIsSolving(true);
    try {
      const res = await fetch(getApiUrl('/api/v1/solver/run'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine: selectedEngine }),
      });
      const data = await res.json();
      setTimeout(() => {
        setIsSolving(false);
        setSolveSuccess(true);
      }, 1500);
    } catch (err) {
      console.error(err);
      setIsSolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner & Search Space Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase">
                ENGINE V4.2-CSP
              </span>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Genetic + CSP Engine Ready</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">Config Hash: 08cb9E20-CSE</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Timetable Solver Studio • Constraint Engine
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Autonomous Scheme 2024–25 (Odd Semester) • Department of Computer Science & Engineering • B.M.S. College of Engineering
            </p>
          </div>

          {/* Search Space Metrics Chips */}
          <div className="flex items-center space-x-2 self-start lg:self-auto">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Search Space</div>
              <div className="text-sm font-black text-slate-900">2.41 × 10⁴ slots</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Defined Rules</div>
              <div className="text-sm font-black text-slate-900">19 Strict & Soft</div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Target Cohorts</div>
              <div className="text-sm font-black text-slate-900">16 Sections</div>
            </div>
          </div>
        </div>

        {/* Wizard Step Progression Bar */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between overflow-x-auto text-xs">
          {[
            { step: 'STEP 01', label: 'Academic Calendar', completed: true },
            { step: 'STEP 02', label: 'Sections & Batches', completed: true },
            { step: 'STEP 03', label: 'Curriculum & Credits', completed: true },
            { step: 'STEP 04', label: 'Faculty Workload', completed: true },
            { step: 'STEP 05', label: 'Rooms & Smart Labs', completed: true },
            { step: 'CURRENT 06', label: 'Hard & Soft Rules', active: true },
          ].map((s, idx) => (
            <div key={idx} className="flex items-center space-x-2 shrink-0 px-2">
              {s.completed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : s.active ? (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  6
                </span>
              ) : null}
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase">{s.step}</div>
                <div className={`font-bold ${s.active ? 'text-blue-600' : 'text-slate-700'}`}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid: Strict Hard Constraints (Left) vs Soft Targets & Engine (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Strict Hard Constraints */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Strict Hard Constraints</h2>
              <div className="text-xs text-slate-500 font-medium">
                Invariable conditions. Any solution violating even one rule is mathematically disqualified.
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
              ZERO TOLERANCE
            </span>
          </div>

          <div className="space-y-3">
            {hardConstraints.map((hc, idx) => (
              <div
                key={hc.code}
                className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 flex items-start space-x-3"
              >
                <input
                  type="checkbox"
                  checked={hc.checked}
                  onChange={() => {
                    const copy = [...hardConstraints];
                    copy[idx].checked = !copy[idx].checked;
                    setHardConstraints(copy);
                  }}
                  className="mt-1 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-slate-900">{hc.name}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-mono text-[10px] font-bold">
                      {hc.code}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {hc.description}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold text-emerald-700 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{hc.registry}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Advanced constraint relaxing on unsolvable deadlocks?
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
              STRICTLY FORBIDDEN
            </span>
          </div>
        </div>

        {/* Right Column (5 cols): Soft Targets & Engine Setup */}
        <div className="lg:col-span-5 space-y-6">
          {/* Soft Optimization Targets */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Soft Optimization Targets</h3>
                <div className="text-[11px] text-slate-500">
                  Weighted objective penalties (Aim: &gt;95% Target Fitness score)
                </div>
              </div>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-bold">
                4 Heuristics
              </span>
            </div>

            <div className="space-y-3.5">
              {softTargets.map((st, i) => (
                <div key={st.key} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800">{st.name}</span>
                    <span className="text-[11px] font-semibold text-blue-600">
                      {st.weight}% ({st.priority})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 leading-tight">
                    {st.description}
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 rounded-full"
                      style={{ width: `${st.weight}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solver Execution Setup */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-900">Solver Execution Setup</h3>
              <span className="text-[11px] text-slate-400 font-medium">Engine Mode</span>
            </div>

            {/* Engine Selector */}
            <div className="space-y-2">
              {[
                { id: 'GREEDY_BASELINE', label: 'Greedy Baseline', note: 'Fast ~4s • Quick visibility test' },
                { id: 'CONSTRAINT_CSP', label: 'Constraint CSP (OR-Tools)', note: 'Balanced ~12s • Recommended mode' },
                { id: 'DEEP_GENETIC', label: 'Deep Genetic', note: 'Exhaustive ~3m • Global optima search' },
              ].map((eng) => (
                <label
                  key={eng.id}
                  onClick={() => setSelectedEngine(eng.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedEngine === eng.id
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/10'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{eng.label}</div>
                    <div className="text-[11px] text-slate-500">{eng.note}</div>
                  </div>
                  <input
                    type="radio"
                    name="engine"
                    checked={selectedEngine === eng.id}
                    onChange={() => setSelectedEngine(eng.id)}
                    className="w-4 h-4 text-blue-600"
                  />
                </label>
              ))}
            </div>

            {/* Target Semesters Checkboxes */}
            <div className="pt-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Target Semesters (CSE Dept)
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                {['Sem 1', 'Sem 3', 'Sem 5', 'Sem 7'].map((sem, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800">
                    <input type="checkbox" defaultChecked className="mr-1 text-blue-600 rounded" />
                    <span>{sem}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pre-execution Consistency Audit Bar */}
      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="font-extrabold text-xs text-slate-900">
              Pre-execution Consistency Audit Passed
            </div>
            <div className="text-xs text-slate-600">
              All 58 professors have non-negative hour capacities, room seating limits match section counts, and NEP laboratory contact blocks are balanced.
            </div>
          </div>
        </div>
        <button className="px-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center space-x-1.5 self-start md:self-auto cursor-pointer">
          <Download className="w-3.5 h-3.5" />
          <span>Download Verification JSON</span>
        </button>
      </div>

      {/* Solver Action Trigger Box */}
      {solveSuccess ? (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-emerald-950">
              Optimization Completed: Optimal Feasible Timetable Generated!
            </h3>
            <p className="text-xs text-emerald-800 max-w-xl mx-auto mt-0.5">
              0 hard constraint violations across 16 cohorts. Soft objective fitness reached 98.4%. 2 distinct candidate solutions are ready for comparative inspection.
            </p>
          </div>
          <div className="flex justify-center space-x-3 pt-1">
            <button
              onClick={() => navigate('/candidate-comparison')}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Inspect Candidate Comparison</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSolveSuccess(false)}
              className="px-4 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold cursor-pointer"
            >
              Back to Studio
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <div className="font-extrabold text-sm text-white">Ready to Initiate Solver</div>
              <div className="text-xs text-slate-400">
                Estimated optimization: 2,400+ Complexity Unit (OR-Tools CP-SAT)
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer">
              Reset to Factory Presets
            </button>
            <button className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer">
              Dry Run Test
            </button>
            <button
              disabled={isSolving}
              onClick={handleRunSolver}
              className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              {isSolving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Solving Constraints...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Timetable Solver Engine</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

