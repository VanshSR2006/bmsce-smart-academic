import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  ChevronRight,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';

interface RepairData {
  incident: {
    id: string;
    type: string;
    affectedFaculty: string;
    affectedSections: string[];
    affectedSlots: string[];
    reason: string;
    reportedAt: string;
    severity: string;
  };
  strategies: RepairStrategy[];
}

interface RepairStrategy {
  id: string;
  label: string;
  description: string;
  disruption: number;
  feasibility: number;
  constraints: { name: string; pass: boolean }[];
  diff: { slot: string; before: string; after: string }[];
  impactDelta: { metric: string; before: string; after: string; direction: 'up' | 'down' | 'same' }[];
}

const MOCK_DATA: RepairData = {
  incident: {
    id: 'INC-2024-031',
    type: 'FACULTY_ABSENCE',
    affectedFaculty: 'Dr. A. Ramanathan',
    affectedSections: ['CSE-B'],
    affectedSlots: ['MON 09:00–10:00', 'MON 10:00–11:00', 'WED 09:00–10:00'],
    reason: 'Medical emergency — 3-day leave approved by HOD',
    reportedAt: '2024-11-13 07:30',
    severity: 'HIGH',
  },
  strategies: [
    {
      id: 'OPT-A',
      label: 'Option A — Proxy Assignment',
      description:
        'Assign Prof. S. Malathi (qualified, DAA, 14 hrs/week remaining) to all 3 affected slots. Minimal footprint — no section rescheduling.',
      disruption: 12,
      feasibility: 96,
      constraints: [
        { name: 'Faculty Availability', pass: true },
        { name: 'Subject Qualification', pass: true },
        { name: 'Room Continuity', pass: true },
        { name: 'Section Non-Overlap', pass: true },
        { name: 'Weekly Load Cap (20h)', pass: true },
      ],
      diff: [
        { slot: 'MON 09:00–10:00', before: 'Dr. A. Ramanathan / DAA / PJ-301', after: 'Prof. S. Malathi / DAA / PJ-301' },
        { slot: 'MON 10:00–11:00', before: 'Dr. A. Ramanathan / DAA / PJ-301', after: 'Prof. S. Malathi / DAA / PJ-301' },
        { slot: 'WED 09:00–10:00', before: 'Dr. A. Ramanathan / DAA / PJ-302', after: 'Prof. S. Malathi / DAA / PJ-302' },
      ],
      impactDelta: [
        { metric: 'Sessions Rescheduled', before: '0', after: '0', direction: 'same' },
        { metric: 'Faculty Load Δ (S. Malathi)', before: '14h', after: '17h', direction: 'up' },
        { metric: 'Rooms Affected', before: '0', after: '0', direction: 'same' },
        { metric: 'Student Disruption', before: '—', after: 'Minimal', direction: 'same' },
      ],
    },
    {
      id: 'OPT-B',
      label: 'Option B — Slot Redistribution',
      description:
        'Move all 3 DAA sessions to Thursday/Friday open slots. Dr. A. Ramanathan returns and covers on recovery. Requires room rebooking.',
      disruption: 34,
      feasibility: 81,
      constraints: [
        { name: 'Faculty Availability', pass: true },
        { name: 'Subject Qualification', pass: true },
        { name: 'Room Continuity', pass: false },
        { name: 'Section Non-Overlap', pass: true },
        { name: 'Weekly Load Cap (20h)', pass: true },
      ],
      diff: [
        { slot: 'MON 09:00–10:00', before: 'Dr. A. Ramanathan / DAA / PJ-301', after: 'CANCELLED — rescheduled THU' },
        { slot: 'MON 10:00–11:00', before: 'Dr. A. Ramanathan / DAA / PJ-301', after: 'CANCELLED — rescheduled FRI' },
        { slot: 'WED 09:00–10:00', before: 'Dr. A. Ramanathan / DAA / PJ-302', after: 'CANCELLED — rescheduled FRI' },
        { slot: 'THU 14:00–15:00', before: '—', after: 'Dr. A. Ramanathan / DAA / PJ-304 (new)' },
        { slot: 'FRI 10:00–11:00', before: '—', after: 'Dr. A. Ramanathan / DAA / PJ-304 (new)' },
        { slot: 'FRI 11:00–12:00', before: '—', after: 'Dr. A. Ramanathan / DAA / PJ-304 (new)' },
      ],
      impactDelta: [
        { metric: 'Sessions Rescheduled', before: '0', after: '3', direction: 'up' },
        { metric: 'Faculty Load Δ', before: 'Unchanged', after: 'Unchanged', direction: 'same' },
        { metric: 'Rooms Affected', before: '0', after: '1 rebooking', direction: 'up' },
        { metric: 'Student Disruption', before: '—', after: 'Moderate', direction: 'up' },
      ],
    },
    {
      id: 'OPT-C',
      label: 'Option C — Merge & Skip',
      description:
        'Mark sessions as cancelled with self-study directive. CR notified. Catch-up session scheduled Week 5 as extra class.',
      disruption: 8,
      feasibility: 72,
      constraints: [
        { name: 'Faculty Availability', pass: true },
        { name: 'Subject Qualification', pass: true },
        { name: 'Room Continuity', pass: true },
        { name: 'Section Non-Overlap', pass: true },
        { name: 'Weekly Load Cap (20h)', pass: true },
      ],
      diff: [
        { slot: 'MON 09:00–10:00', before: 'Dr. A. Ramanathan / DAA / PJ-301', after: 'SELF-STUDY — Module 4 Ref' },
        { slot: 'MON 10:00–11:00', before: 'Dr. A. Ramanathan / DAA / PJ-301', after: 'SELF-STUDY — Module 4 Ref' },
        { slot: 'WED 09:00–10:00', before: 'Dr. A. Ramanathan / DAA / PJ-302', after: 'SELF-STUDY — Module 4 Ref' },
      ],
      impactDelta: [
        { metric: 'Sessions Cancelled', before: '0', after: '3', direction: 'up' },
        { metric: 'Faculty Load Δ', before: 'Unchanged', after: '−3h', direction: 'down' },
        { metric: 'Extra Class Required', before: 'No', after: 'Yes (Week 5)', direction: 'up' },
        { metric: 'Student Disruption', before: '—', after: 'High (self-study)', direction: 'up' },
      ],
    },
  ],
};

const ScoreBar: React.FC<{ value: number; color: string }> = ({ value, color }) => (
  <div className="flex items-center gap-2">
    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
    </div>
    <span className="text-xs font-semibold text-slate-700 w-8 text-right">{value}%</span>
  </div>
);

export const TimetableRepairCenter: React.FC = () => {
  const [data, setData] = useState<RepairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>('OPT-A');
  const [repairType, setRepairType] = useState<'exception' | 'master' | null>(null);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/repairs/active'))
      .then((r) => r.json())
      .then((r) => {
        setData(r.data || MOCK_DATA);
        setLoading(false);
      })
      .catch(() => {
        setData(MOCK_DATA);
        setLoading(false);
      });
  }, []);

  const d = data || MOCK_DATA;
  const selectedStrategy = d.strategies.find((s) => s.id === selected) || d.strategies[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
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
              <span>Disruption Repair</span>
            </div>
            <h1 className="text-2xl font-bold">Timetable Repair Center</h1>
            <p className="text-slate-400 text-sm mt-1">
              Minimal-change conflict resolution — Incident {d.incident.id}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
              {d.incident.severity} PRIORITY
            </span>
          </div>
        </div>
      </div>

      {/* Incident Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex gap-4">
          <div className="bg-amber-100 rounded-xl p-3 flex-shrink-0">
            <AlertTriangle size={24} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="font-bold text-amber-900">{d.incident.type.replace(/_/g, ' ')}</h3>
              <span className="text-xs font-mono text-amber-600 bg-amber-100 px-2 py-0.5 rounded">
                {d.incident.id}
              </span>
              <span className="text-xs text-amber-700">Reported: {d.incident.reportedAt}</span>
            </div>
            <p className="text-sm text-amber-800 mt-1">
              <span className="font-semibold">{d.incident.affectedFaculty}</span> — {d.incident.reason}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <div className="flex items-center gap-1 text-xs text-amber-700">
                <User size={12} />
                <span>Sections: {d.incident.affectedSections.join(', ')}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-700">
                <Clock size={12} />
                <span>{d.incident.affectedSlots.length} slots affected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Strategy Cards */}
        <div className="space-y-4">
          <h2 className="font-semibold text-slate-800">Repair Strategies</h2>
          {d.strategies.map((s) => (
            <div
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${
                selected === s.id
                  ? 'border-indigo-500 shadow-md shadow-indigo-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm text-slate-800">{s.label}</span>
                {selected === s.id && (
                  <CheckCircle2 size={16} className="text-indigo-500 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">{s.description}</p>
              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Feasibility</span>
                  </div>
                  <ScoreBar value={s.feasibility} color="bg-emerald-400" />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Disruption Risk</span>
                  </div>
                  <ScoreBar value={s.disruption} color="bg-amber-400" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Detail Panel */}
        <div className="col-span-2 space-y-5">
          {/* Schedule Differential */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-500" />
              Schedule Differential Visualizer — {selectedStrategy.label}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Before
                </p>
                <div className="space-y-2">
                  {selectedStrategy.diff.map((row, i) => (
                    <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-red-600 mb-1 font-mono">{row.slot}</div>
                      <div className="text-xs text-slate-600">{row.before}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  After (Proposed)
                </p>
                <div className="space-y-2">
                  {selectedStrategy.diff.map((row, i) => (
                    <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                      <div className="text-xs font-semibold text-emerald-600 mb-1 font-mono">{row.slot}</div>
                      <div className="text-xs text-slate-600">{row.after}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Constraint Verification + Impact */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Shield size={16} className="text-emerald-500" />
                Constraint Verification
              </h3>
              <div className="space-y-2">
                {selectedStrategy.constraints.map((c) => (
                  <div key={c.name} className="flex items-center gap-2">
                    {c.pass ? (
                      <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                    ) : (
                      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                    )}
                    <span className="text-xs text-slate-700">{c.name}</span>
                    <span className={`ml-auto text-xs font-medium ${c.pass ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {c.pass ? 'PASS' : 'WARN'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-blue-500" />
                Impact Deltas
              </h3>
              <div className="space-y-2">
                {selectedStrategy.impactDelta.map((m) => (
                  <div key={m.metric} className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">{m.metric}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 line-through">{m.before}</span>
                      <ChevronRight size={10} className="text-slate-300" />
                      <span className={`text-xs font-medium ${
                        m.direction === 'up' ? 'text-amber-600' :
                        m.direction === 'down' ? 'text-blue-600' : 'text-slate-700'
                      }`}>
                        {m.after}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* HOD Authorization */}
          <div className="bg-white rounded-xl border-2 border-indigo-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={16} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-800">HOD Authorization</h3>
              <span className="ml-auto text-xs text-slate-500">
                Applying: <span className="font-semibold text-indigo-600">{selectedStrategy.label}</span>
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setRepairType('exception')}
                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  repairType === 'exception'
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-700 hover:border-indigo-300'
                }`}
              >
                <div className="font-semibold">Create Dated Exception</div>
                <div className="text-xs text-slate-500 mt-0.5">One-time override, master unchanged</div>
              </button>
              <button
                onClick={() => setRepairType('master')}
                className={`py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                  repairType === 'master'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                }`}
              >
                <div className="font-semibold">Increment Master Timetable</div>
                <div className="text-xs text-slate-500 mt-0.5">Permanent change, creates new version</div>
              </button>
            </div>
            {repairType && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                <span className="text-sm text-slate-600">
                  Ready to apply <strong>{selectedStrategy.label}</strong> as{' '}
                  {repairType === 'exception' ? 'a dated exception' : 'master timetable update'}
                </span>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
                  Authorize & Apply
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

