import React, { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type {
  ActiveRepairData,
  ActiveRepairStrategy,
  RepairAuthorizeResponse,
} from '@bmsce/contracts';
import { getApiUrl } from '../../lib/api';

const repairDataValidator = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  isDemoData: z.boolean().optional(),
  incident: z
    .object({
      id: z.string(),
      code: z.string().optional(),
      type: z.string(),
      affectedFaculty: z.string(),
      affectedSections: z.array(z.string()).default([]),
      affectedSlots: z.array(z.string()).default([]),
      reason: z.string().optional(),
      reportedAt: z.string().optional(),
      severity: z.string().default('MEDIUM'),
    })
    .nullable(),
  strategies: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        optionLabel: z.string().optional(),
        badgeText: z.string().optional(),
        description: z.string(),
        disruption: z.number(),
        feasibility: z.number(),
        isRecommended: z.boolean().optional(),
        constraints: z
          .array(
            z.object({
              name: z.string(),
              pass: z.boolean(),
              detail: z.string().optional(),
            })
          )
          .default([]),
        diff: z
          .array(
            z.object({
              slot: z.string(),
              before: z.string(),
              after: z.string(),
            })
          )
          .default([]),
        impactDelta: z
          .array(
            z.object({
              metric: z.string(),
              before: z.string(),
              after: z.string(),
              direction: z.enum(['up', 'down', 'same']),
            })
          )
          .default([]),
      })
    )
    .default([]),
});

const repairAuthorizeResponseValidator: z.ZodType<RepairAuthorizeResponse> = z.object({
  authorized: z.boolean(),
  appliedToTimetable: z.boolean(),
  isDemoData: z.boolean(),
  status: z.enum(['AUDIT_RECORDED', 'ALREADY_RECORDED']),
  incidentId: z.string(),
  strategyId: z.string(),
  authorizationType: z.enum(['DATED_EXCEPTION', 'MASTER_UPDATE']),
  message: z.string(),
  auditLogId: z.string().nullable(),
  timestamp: z.string(),
});
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  User,
  Calendar,
  ChevronRight,
  TrendingUp,
  Shield,
  Zap,
  RefreshCw,
} from 'lucide-react';

const ScoreBar: React.FC<{ value: number; color: string }> = ({ value, color }) => {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-9 text-right">{clamped}%</span>
    </div>
  );
};

export const TimetableRepairCenter: React.FC = () => {
  const [data, setData] = useState<ActiveRepairData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string>('');
  const [repairType, setRepairType] = useState<'exception' | 'master' | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<RepairAuthorizeResponse | null>(null);
  const authorizingRef = useRef(false);

  const fetchRepairData = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const res = await fetch(getApiUrl('/api/v1/repairs/active'));
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      const json = await res.json();
      const parsed = repairDataValidator.safeParse(json?.data);
      if (!parsed.success) {
        throw new Error('Unexpected response format from repair service.');
      }
      const validatedData: ActiveRepairData = parsed.data;
      setData(validatedData);
      setSelected((prev) => {
        const strategies = validatedData.strategies;
        if (strategies.length === 0) return '';
        if (prev && strategies.some((s) => s.id === prev)) return prev;
        return strategies[0].id;
      });
    } catch (err: unknown) {
      if (!options?.silent) {
        const message =
          err instanceof Error ? err.message : 'Unable to reach disruption repair service.';
        setError(message);
        setData(null);
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchRepairData();
  }, [fetchRepairData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        <p className="text-xs text-slate-500 font-medium">Loading disruption repair workspace...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-3 max-w-xl mx-auto">
          <AlertTriangle size={28} className="text-red-500 mx-auto" />
          <h2 className="text-lg font-bold text-red-900">Failed to Load Disruption Repair Data</h2>
          <p className="text-sm text-red-700">{error || 'No response received from server.'}</p>
          <button
            onClick={() => void fetchRepairData()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const incident = data.incident;
  const strategies = data.strategies ?? [];
  const selectedStrategy: ActiveRepairStrategy | undefined =
    strategies.find((s) => s.id === selected) ?? strategies[0];

  const handleAuthorize = async () => {
    if (!incident || !selectedStrategy || !repairType || authorizingRef.current) {
      return;
    }

    authorizingRef.current = true;
    setIsAuthorizing(true);
    setAuthError(null);
    setAuthResult(null);

    try {
      const token = localStorage.getItem('bmsce_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(getApiUrl('/api/v1/repairs/authorize'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          incidentId: incident.id,
          strategyId: selectedStrategy.id,
          authorizationType: repairType === 'master' ? 'MASTER_UPDATE' : 'DATED_EXCEPTION',
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const apiErrMsg =
          json?.error?.message || `Authorization request failed (HTTP ${res.status})`;
        throw new Error(apiErrMsg);
      }

      const parsed = repairAuthorizeResponseValidator.safeParse(json?.data);
      if (!parsed.success) {
        throw new Error('Unexpected response format from authorization endpoint.');
      }

      setAuthResult(parsed.data);
      await fetchRepairData({ silent: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Network error while recording authorization.';
      setAuthError(message);
    } finally {
      authorizingRef.current = false;
      setIsAuthorizing(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="bg-[#0f172a] rounded-2xl p-5 md:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <span>BMSCE • CSE Department</span>
              <ChevronRight size={12} />
              <span>Disruption Repair</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold">
              {data.title || 'Timetable Repair Center'}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {incident
                ? `Minimal-change conflict resolution — Incident ${incident.id}`
                : 'No active disruption incident'}
            </p>
            {data.isDemoData && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[11px] font-semibold">
                Demonstration Proposal Data (Hardcoded Demo)
              </span>
            )}
          </div>
          {incident && (
            <div className="sm:text-right">
              <span className="inline-block px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">
                {incident.severity} PRIORITY
              </span>
            </div>
          )}
        </div>
      </div>

      {/* No Active Incident Empty State */}
      {!incident && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">No Active Disruption Incidents</h2>
          <p className="text-sm text-slate-500">
            All scheduled faculty and room allocations are currently operating normally.
          </p>
        </div>
      )}

      {/* Incident Banner */}
      {incident && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="bg-amber-100 rounded-xl p-3 self-start flex-shrink-0">
              <AlertTriangle size={24} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-amber-900">
                  {incident.type ? incident.type.replace(/_/g, ' ') : 'DISRUPTION INCIDENT'}
                </h3>
                <span className="text-xs font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  {incident.code || incident.id}
                </span>
                {incident.reportedAt && (
                  <span className="text-xs text-amber-700">Reported: {incident.reportedAt}</span>
                )}
              </div>
              <p className="text-sm text-amber-800 mt-1">
                <span className="font-semibold">{incident.affectedFaculty}</span>
                {incident.reason ? ` — ${incident.reason}` : ''}
              </p>
              <div className="flex flex-wrap gap-3 mt-3">
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <User size={12} />
                  <span>
                    Sections:{' '}
                    {incident.affectedSections.length > 0
                      ? incident.affectedSections.join(', ')
                      : 'None specified'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-amber-700">
                  <Clock size={12} />
                  <span>{incident.affectedSlots.length} slot(s) affected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty Strategies State */}
      {incident && strategies.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <AlertTriangle size={28} className="text-amber-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">No Repair Strategies Available</h2>
          <p className="text-sm text-slate-500">
            No candidate repair proposals were returned for incident {incident.id}.
          </p>
        </div>
      )}

      {/* Strategies + Detail Panel */}
      {incident && selectedStrategy && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strategy Cards */}
          <div className="space-y-4">
            <h2 className="font-semibold text-slate-800">Repair Strategies</h2>
            {strategies.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${selectedStrategy.id === s.id
                  ? 'border-indigo-500 shadow-md shadow-indigo-100'
                  : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm text-slate-800">{s.label}</span>
                  {selectedStrategy.id === s.id && (
                    <CheckCircle2 size={16} className="text-indigo-500 flex-shrink-0" />
                  )}
                </div>
                {s.badgeText && (
                  <span className="inline-block mb-2 px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
                    {s.badgeText}
                  </span>
                )}
                <p className="text-xs text-slate-500 mb-3 leading-relaxed line-clamp-2">
                  {s.description}
                </p>
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
          <div className="lg:col-span-2 space-y-5">
            {/* Schedule Differential */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500" />
                Schedule Differential Visualizer — {selectedStrategy.label}
              </h3>
              {selectedStrategy.diff.length === 0 ? (
                <p className="text-xs text-slate-500">No schedule slot differences provided.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Before
                    </p>
                    <div className="space-y-2">
                      {selectedStrategy.diff.map((row, i) => (
                        <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3">
                          <div className="text-xs font-semibold text-red-600 mb-1 font-mono">
                            {row.slot}
                          </div>
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
                        <div
                          key={i}
                          className="bg-emerald-50 border border-emerald-100 rounded-lg p-3"
                        >
                          <div className="text-xs font-semibold text-emerald-600 mb-1 font-mono">
                            {row.slot}
                          </div>
                          <div className="text-xs text-slate-600">{row.after}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Constraint Verification + Impact */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Shield size={16} className="text-emerald-500" />
                  Constraint Verification
                </h3>
                {selectedStrategy.constraints.length === 0 ? (
                  <p className="text-xs text-slate-500">No constraint checks reported.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStrategy.constraints.map((c) => (
                      <div key={c.name} className="flex items-center gap-2">
                        {c.pass ? (
                          <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                        )}
                        <span className="text-xs text-slate-700">{c.name}</span>
                        <span
                          className={`ml-auto text-xs font-medium ${c.pass ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                        >
                          {c.pass ? 'PASS' : 'WARN'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-500" />
                  Impact Deltas
                </h3>
                {selectedStrategy.impactDelta.length === 0 ? (
                  <p className="text-xs text-slate-500">No impact deltas reported.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedStrategy.impactDelta.map((m) => (
                      <div key={m.metric} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-600">{m.metric}</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400 line-through">{m.before}</span>
                          <ChevronRight size={10} className="text-slate-300" />
                          <span
                            className={`text-xs font-medium ${m.direction === 'up'
                              ? 'text-amber-600'
                              : m.direction === 'down'
                                ? 'text-blue-600'
                                : 'text-slate-700'
                              }`}
                          >
                            {m.after}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* HOD Authorization */}
            <div className="bg-white rounded-xl border-2 border-indigo-100 p-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Zap size={16} className="text-indigo-500" />
                <h3 className="font-semibold text-slate-800">HOD Authorization</h3>
                <span className="sm:ml-auto text-xs text-slate-500">
                  Selected:{' '}
                  <span className="font-semibold text-indigo-600">{selectedStrategy.label}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={() => {
                    setRepairType('exception');
                    setAuthError(null);
                  }}
                  className={`py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer disabled:opacity-60 ${
                    repairType === 'exception'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="font-semibold">Create Dated Exception</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Demo audit log only — master timetable unchanged
                  </div>
                </button>
                <button
                  type="button"
                  disabled={isAuthorizing}
                  onClick={() => {
                    setRepairType('master');
                    setAuthError(null);
                  }}
                  className={`py-3 px-3 rounded-xl text-sm font-medium border-2 transition-all cursor-pointer disabled:opacity-60 ${
                    repairType === 'master'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <div className="font-semibold">Increment Master Timetable</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Demo audit log only — master timetable unchanged
                  </div>
                </button>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-sm text-slate-600">
                  {repairType ? (
                    <>
                      Ready to record demo authorization for{' '}
                      <strong>{selectedStrategy.label}</strong> (
                      {repairType === 'exception' ? 'dated exception' : 'master update'} mode).
                    </>
                  ) : (
                    'Select an authorization mode above to enable submission.'
                  )}
                </span>
                <button
                  type="button"
                  disabled={!selectedStrategy || !repairType || isAuthorizing}
                  onClick={() => void handleAuthorize()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
                >
                  {isAuthorizing && (
                    <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                  )}
                  {isAuthorizing ? 'Recording...' : 'Authorize & Apply'}
                </button>
              </div>

              {authError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {authResult && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                    <span>
                      {authResult.status === 'ALREADY_RECORDED'
                        ? 'Demo Authorization Already Recorded'
                        : 'Demo Authorization Recorded'}
                    </span>
                  </div>
                  <p>{authResult.message}</p>
                  <p className="font-mono text-[11px] text-emerald-700">
                    Incident: {authResult.incidentId} • Strategy: {authResult.strategyId}
                    {authResult.auditLogId ? ` • Audit ID: ${authResult.auditLogId}` : ''}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
