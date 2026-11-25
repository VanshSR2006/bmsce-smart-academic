import React, { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import type { ConflictInspectorSummary } from '@bmsce/contracts';
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
  AlertTriangle,
} from 'lucide-react';

const conflictSummaryValidator = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  academicCycle: z.string().optional(),
  activeStagingPlan: z.string().optional(),
  isDemoData: z.boolean().optional(),
  totalHardConflicts: z.number().default(0),
  totalSoftConflicts: z.number().default(0),
  facultyClashes: z.number().default(0),
  venueCollisions: z.number().default(0),
  windowViolations: z.number().default(0),
  incidents: z
    .array(
      z.object({
        id: z.string(),
        severity: z.enum(['HARD', 'SOFT', 'WARNING']),
        type: z.string().default('CONSTRAINT_VIOLATION'),
        description: z.string(),
        affectedEntities: z.array(z.string()).default([]),
        slot: z.string().optional(),
        constraintRef: z.string().optional(),
        resourceEntity: z.string().optional(),
        rootCause: z.string().optional(),
      })
    )
    .default([]),
  recommendations: z.array(z.string()).default([]),
});

// Cohort conflict matrix data (static visual footprint)
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
  const [data, setData] = useState<ConflictInspectorSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchConflicts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApiUrl('/api/v1/conflicts/summary'));
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      const parsed = conflictSummaryValidator.safeParse(json?.data);
      if (!parsed.success) {
        throw new Error('Unexpected response format from conflict inspector service.');
      }
      const validatedData: ConflictInspectorSummary = parsed.data;
      setData(validatedData);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to reach conflict inspector service.';
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConflicts();
  }, [fetchConflicts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        <p className="text-xs text-slate-500 font-medium">Loading conflict audit summary...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3 max-w-xl mx-auto">
          <AlertTriangle size={28} className="text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-900">Failed to Load Conflict Inspector</h2>
          <p className="text-sm text-red-700">{error || 'No response received from server.'}</p>
          <button
            onClick={() => void fetchConflicts()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const incidents = data.incidents ?? [];
  const recommendations = data.recommendations ?? [];
  const filtered = incidents.filter(
    (i) => filterSeverity === 'ALL' || i.severity === filterSeverity
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-2xl p-5 md:p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <span>BMSCE • CSE Department</span>
              <ChevronRight size={12} />
              <span>Conflict Inspector</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold">{data.title || 'Conflict Inspector'}</h1>
            <p className="text-slate-400 text-sm mt-1">
              {data.subtitle || 'Constraint violation analysis — AY 2024–25 Odd Sem'}
            </p>
            {data.isDemoData && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[11px] font-semibold">
                Synthetic Demo Conflict Data (Hardcoded Demonstration)
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => window.open(getApiUrl('/api/v1/conflicts/summary'), '_blank')}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Download size={14} />
              Export Report
            </button>
            <button
              onClick={() => void fetchConflicts()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-400 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Re-run Audit
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mt-6">
          {[
            { label: 'Hard Conflicts', val: data.totalHardConflicts, color: 'text-red-400', bg: 'bg-red-500/20' },
            { label: 'Soft Violations', val: data.totalSoftConflicts, color: 'text-amber-400', bg: 'bg-amber-500/20' },
            { label: 'Faculty Clashes', val: data.facultyClashes, color: 'text-orange-400', bg: 'bg-orange-500/20' },
            { label: 'Venue Collisions', val: data.venueCollisions, color: 'text-pink-400', bg: 'bg-pink-500/20' },
            { label: 'Window Violations', val: data.windowViolations, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
              <div className={`text-2xl md:text-3xl font-bold ${s.color}`}>{s.val}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-800 text-lg">Conflict Incidents</h2>
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              {['ALL', 'HARD', 'SOFT', 'WARNING'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterSeverity(f)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
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

          {incidents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-2">
              <CheckCircle2 size={28} className="text-emerald-500 mx-auto" />
              <h3 className="font-semibold text-slate-800">No Conflict Incidents Reported</h3>
              <p className="text-xs text-slate-500">
                Zero scheduling constraint violations were returned for this audit cycle.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-1">
              <p className="text-sm font-semibold text-slate-700">
                No {filterSeverity} incidents found
              </p>
              <p className="text-xs text-slate-500">
                Try switching the severity filter to ALL to view other incidents.
              </p>
            </div>
          ) : (
            filtered.map((incident) => (
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
                      <p className="text-sm font-medium text-slate-800 mt-1">
                        {incident.description}
                      </p>
                      {incident.slot && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          <span className="font-medium">Slot:</span> {incident.slot}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-slate-400 transition-transform flex-shrink-0 ${
                        expanded === incident.id ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                </div>
                {expanded === incident.id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                    {incident.rootCause && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          Root Cause
                        </p>
                        <p className="text-xs text-slate-700">{incident.rootCause}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Affected Entities
                      </p>
                      {incident.affectedEntities.length === 0 ? (
                        <p className="text-xs text-slate-500">No affected entities listed.</p>
                      ) : (
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
                      )}
                    </div>
                    {incident.constraintRef && (
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          Constraint Reference
                        </p>
                        <code className="text-xs text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                          {incident.constraintRef}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
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
                        {c.split('-')[0]}
                        <br />
                        {c.split('-')[1]}
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

          {/* Demo Recommendations */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Zap size={16} className="text-emerald-500" />
              Suggested Resolutions (Demo)
            </h3>
            {recommendations.length === 0 ? (
              <p className="text-xs text-slate-500">No suggested resolutions available.</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-2">
                    <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-600 leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <h3 className="font-semibold text-slate-800 mb-1">Resolution Actions</h3>
            <button
              onClick={() => void fetchConflicts()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              Re-run Audit
            </button>
            <button
              onClick={() => window.open(getApiUrl('/api/v1/conflicts/summary'), '_blank')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <Download size={14} />
              Save Diagnostic Snapshot
            </button>
            <button
              onClick={() => setFilterSeverity('ALL')}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <XCircle size={14} />
              Reset Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
