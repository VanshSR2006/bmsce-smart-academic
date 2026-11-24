import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import {
  AlertOctagon,
  Users,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Filter,
  ChevronRight,
  Zap,
} from 'lucide-react';

interface ConflictSummary {
  totalHardConflicts: number;
  totalSoftConflicts: number;
  facultyClashes: number;
  venueCollisions: number;
  windowViolations: number;
  incidents: ConflictIncident[];
  recommendations: string[];
}

interface ConflictIncident {
  id: string;
  severity: 'HARD' | 'SOFT' | 'WARNING';
  type: string;
  description: string;
  affectedEntities: string[];
  slot: string;
  constraintRef: string;
}

const MOCK_DATA: ConflictSummary = {
  totalHardConflicts: 3,
  totalSoftConflicts: 2,
  facultyClashes: 1,
  venueCollisions: 1,
  windowViolations: 1,
  incidents: [
    {
      id: 'CI-001',
      severity: 'HARD',
      type: 'FACULTY_CLASH',
      description: 'Dr. A. Ramanathan assigned to two simultaneous sessions in Week 3.',
      affectedEntities: ['CSE-B DAA (MON-10:00)', 'CSE-A DAA (MON-10:00)'],
      slot: 'Monday 10:00–11:00',
      constraintRef: 'HC-01: Faculty Single-Assignment',
    },
    {
      id: 'CI-002',
      severity: 'HARD',
      type: 'VENUE_COLLISION',
      description: 'Room PJ-301 double-booked for concurrent lectures.',
      affectedEntities: ['CSE-B DBMS (TUE-11:00)', 'ISE-A OS (TUE-11:00)'],
      slot: 'Tuesday 11:00–12:00',
      constraintRef: 'HC-02: Room Single-Occupancy',
    },
    {
      id: 'CI-003',
      severity: 'HARD',
      type: 'SECTION_OVERLAP',
      description: 'CSE-B scheduled for two subjects in the same slot.',
      affectedEntities: ['CSE-B ToC (WED-09:00)', 'CSE-B SE (WED-09:00)'],
      slot: 'Wednesday 09:00–10:00',
      constraintRef: 'HC-03: Section Non-Overlap',
    },
    {
      id: 'CI-004',
      severity: 'SOFT',
      type: 'WINDOW_VIOLATION',
      description: 'Dr. K. M. Rao exceeds preferred 4-hour daily teaching window.',
      affectedEntities: ['Dr. K. M. Rao — Friday (5 sessions)'],
      slot: 'Friday All-Day',
      constraintRef: 'SC-04: Faculty Load Balancing',
    },
    {
      id: 'CI-005',
      severity: 'SOFT',
      type: 'LAB_SPLIT',
      description: 'DBMS Lab scheduled non-consecutively — requires 2-hour block.',
      affectedEntities: ['CSE-B DBMS Lab (THU-10:00 + THU-14:00)'],
      slot: 'Thursday 10:00 & 14:00',
      constraintRef: 'SC-07: Lab Contiguity',
    },
  ],
  recommendations: [
    'Reassign DAA for CSE-A Monday 10:00 to Dr. M. Nandhini (available, qualified)',
    'Move ISE-A OS from PJ-301 to PJ-304 (capacity 60, available Tue 11:00)',
    'Swap CSE-B ToC to Thursday 14:00 (Dr. K. M. Rao free, PJ-302 available)',
    'Redistribute Dr. K. M. Rao Friday load — move 1 session to Wednesday',
    'Block-schedule DBMS Lab as THU 10:00–12:00 consecutive period',
  ],
};

// Cohort conflict matrix data
const COHORT_MATRIX = {
  cohorts: ['CSE-A', 'CSE-B', 'ISE-A', 'ISE-B', 'ECE-A', 'ECE-B'],
  matrix: [
    [0, 1, 0, 0, 0, 0],
    [1, 2, 1, 0, 0, 0],
    [0, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ],
};

const SeverityBadge: React.FC<{ severity: 'HARD' | 'SOFT' | 'WARNING' }> = ({ severity }) => {
  const styles = {
    HARD: 'bg-red-100 text-red-700 border border-red-200',
    SOFT: 'bg-amber-100 text-amber-700 border border-amber-200',
    WARNING: 'bg-blue-100 text-blue-700 border border-blue-200',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold tracking-wide ${styles[severity]}`}>
      {severity}
    </span>
  );
};

const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
  if (type === 'FACULTY_CLASH') return <Users size={14} className="text-red-500" />;
  if (type === 'VENUE_COLLISION') return <MapPin size={14} className="text-orange-500" />;
  if (type === 'SECTION_OVERLAP') return <Clock size={14} className="text-red-600" />;
  return <AlertOctagon size={14} className="text-amber-500" />;
};

const cellColor = (val: number) => {
  if (val === 0) return 'bg-slate-50 text-slate-300';
  if (val === 1) return 'bg-amber-100 text-amber-700 font-semibold';
  return 'bg-red-100 text-red-700 font-bold';
};

export const ConflictInspector: React.FC = () => {
  const [data, setData] = useState<ConflictSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/conflicts/summary'))
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
  const filtered = d.incidents.filter(
    (i) => filterSeverity === 'ALL' || i.severity === filterSeverity
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <span>BMSCE • CSE Department</span>
              <ChevronRight size={12} />
              <span>Conflict Inspector</span>
            </div>
            <h1 className="text-2xl font-bold">Conflict Inspector</h1>
            <p className="text-slate-400 text-sm mt-1">
              Constraint violation analysis — Timetable v3.1 (AY 2024–25 Odd Sem)
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => window.open('/api/v1/conflicts', '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Download size={14} />
              Export Report
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Re-run Audit
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          {[
            { label: 'Hard Conflicts', val: d.totalHardConflicts, color: 'text-red-400', bg: 'bg-red-500/20' },
            { label: 'Soft Violations', val: d.totalSoftConflicts, color: 'text-amber-400', bg: 'bg-amber-500/20' },
            { label: 'Faculty Clashes', val: d.facultyClashes, color: 'text-orange-400', bg: 'bg-orange-500/20' },
            { label: 'Venue Collisions', val: d.venueCollisions, color: 'text-pink-400', bg: 'bg-pink-500/20' },
            { label: 'Window Violations', val: d.windowViolations, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="col-span-2 space-y-4">
          {/* Filter bar */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 text-lg">Conflict Incidents</h2>
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              {['ALL', 'HARD', 'SOFT', 'WARNING'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterSeverity(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    filterSeverity === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.map((incident) => (
            <div
              key={incident.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors"
            >
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === incident.id ? null : incident.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <TypeIcon type={incident.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <SeverityBadge severity={incident.severity} />
                      <span className="text-xs font-mono text-slate-400">{incident.id}</span>
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {incident.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 mt-1">{incident.description}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      <span className="font-medium">Slot:</span> {incident.slot}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-slate-400 transition-transform ${expanded === incident.id ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>
              {expanded === incident.id && (
                <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Affected Entities
                    </p>
                    <div className="space-y-1">
                      {incident.affectedEntities.map((e) => (
                        <div
                          key={e}
                          className="text-xs text-slate-700 bg-white border border-slate-200 rounded px-3 py-1 font-mono"
                        >
                          {e}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Constraint Reference
                    </p>
                    <code className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                      {incident.constraintRef}
                    </code>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Cohort Conflict Matrix */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <AlertOctagon size={16} className="text-indigo-500" />
              Cohort Conflict Footprint
            </h3>
            <div className="overflow-x-auto">
              <table className="text-xs w-full min-w-[400px]">
                <thead>
                  <tr>
                    <th className="text-slate-400 font-normal pb-2 text-left"></th>
                    {COHORT_MATRIX.cohorts.map((c) => (
                      <th key={c} className="text-slate-500 font-semibold pb-2 text-center px-1 w-10">
                        {c.split('-')[0]}<br />{c.split('-')[1]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COHORT_MATRIX.cohorts.map((rowC, ri) => (
                    <tr key={rowC}>
                      <td className="text-slate-500 font-semibold pr-2 py-1">{rowC}</td>
                      {COHORT_MATRIX.matrix[ri].map((val, ci) => (
                        <td key={ci} className="text-center px-1 py-1">
                          <div
                            className={`w-8 h-8 rounded flex items-center justify-center mx-auto ${cellColor(val)}`}
                          >
                            {val === 0 ? '·' : val}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Red = hard conflict · Amber = soft violation
            </p>
          </div>

          {/* Auto Recommendations */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-emerald-500" />
              Automated Recommendations
            </h3>
            <div className="space-y-3">
              {d.recommendations.map((rec, idx) => (
                <div key={idx} className="flex gap-2">
                  <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-slate-600 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-800 mb-1">Resolution Actions</h3>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">
              <RefreshCw size={14} />
              Re-run CSP Solver
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
              <Download size={14} />
              Save Diagnostic Snapshot
            </button>
            <button className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors">
              <XCircle size={14} />
              Discard & Regenerate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

