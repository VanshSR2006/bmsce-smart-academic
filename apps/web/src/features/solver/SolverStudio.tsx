import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { SolverRunResult, SolverStudioConfig } from '@bmsce/contracts';
import { getApiUrl } from '../../lib/api';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const solverStudioConfigValidator: z.ZodType<SolverStudioConfig> = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  scopeLabel: z.object({
    department: z.string(),
    program: z.string(),
    academicTerm: z.string(),
  }),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    programId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    programs: z.array(
      z.object({
        id: z.string(),
        departmentId: z.string(),
        code: z.string(),
        name: z.string(),
      })
    ),
    academicTerms: z.array(
      z.object({
        id: z.string(),
        academicYearLabel: z.string(),
        termLabel: z.string(),
        status: z.string(),
      })
    ),
    semesters: z.array(z.number().int()),
  }),
  scopeSummary: z.object({
    sectionsCount: z.number().int(),
    subjectOfferingsCount: z.number().int(),
    facultyCount: z.number().int(),
    roomsCount: z.number().int(),
    classPeriodsPerDay: z.number().int().nullable(),
    missingFacultyAssignmentsCount: z.number().int(),
  }),
  hardConstraints: z.array(
    z.object({
      code: z.string(),
      name: z.string(),
      description: z.string(),
      status: z.string(),
      isStrict: z.boolean(),
    })
  ),
  softTargets: z.array(
    z.object({
      key: z.string(),
      name: z.string(),
      description: z.string(),
      weight: z.number(),
      priority: z.string(),
    })
  ),
  engineStrategies: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      note: z.string(),
    })
  ),
  preExecutionAudit: z.object({
    passed: z.boolean(),
    summary: z.string(),
    issues: z.array(z.string()),
  }),
});

const solverRunResultValidator: z.ZodType<SolverRunResult> = z.object({
  runId: z.string(),
  status: z.string(),
  solverStatus: z.string(),
  runtimeMs: z.number(),
  candidatesGenerated: z.number().int(),
  isDemoSimulated: z.boolean(),
  canPublish: z.boolean(),
  warning: z.string().optional(),
  source: z.string(),
});

export const SolverStudio: React.FC = () => {
  const navigate = useNavigate();
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [selectedSemesters, setSelectedSemesters] = useState<number[]>([]);
  const [selectedEngine, setSelectedEngine] = useState('CONSTRAINT_CSP');
  const [isSolving, setIsSolving] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<SolverRunResult | null>(null);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (programId) params.set('programId', programId);
    if (academicTermId) params.set('academicTermId', academicTermId);
    const qs = params.toString();
    return qs ? `/api/v1/solver/studio-config?${qs}` : '/api/v1/solver/studio-config';
  }, [departmentId, programId, academicTermId]);

  const { data, loading, error, refetch } = useApiQuery<unknown>(endpoint);

  const parsed = useMemo(() => {
    if (!data) return null;
    return solverStudioConfigValidator.safeParse(data);
  }, [data]);

  const config = parsed?.success ? parsed.data : null;

  useEffect(() => {
    if (config) {
      setSelectedSemesters(config.availableFilters.semesters);
    }
  }, [config]);

  if (loading) {
    return <QueryStateCard mode="loading" message="Loading Solver Studio configuration..." />;
  }

  if (error) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load Solver Studio"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!config) {
    return (
      <QueryStateCard
        mode="error"
        title="Invalid Solver Studio Payload"
        message="The server response did not match the expected Solver Studio configuration schema."
        onRetry={refetch}
      />
    );
  }

  const filteredPrograms = departmentId
    ? config.availableFilters.programs.filter((p) => p.departmentId === departmentId)
    : config.availableFilters.programs;

  const handleDepartmentChange = (nextDeptId: string) => {
    setDepartmentId(nextDeptId);
    setRunError(null);
    setRunResult(null);
    if (programId && nextDeptId) {
      const stillValid = config.availableFilters.programs.some(
        (p) => p.id === programId && p.departmentId === nextDeptId
      );
      if (!stillValid) setProgramId('');
    }
  };

  const toggleSemester = (sem: number) => {
    setSelectedSemesters((prev) =>
      prev.includes(sem) ? prev.filter((s) => s !== sem) : [...prev, sem].sort((a, b) => a - b)
    );
  };

  const handleRunSolver = async () => {
    setIsSolving(true);
    setRunError(null);
    setRunResult(null);
    try {
      const token = localStorage.getItem('bmsce_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const body: Record<string, unknown> = { engine: selectedEngine };
      if (departmentId) body.departmentId = departmentId;
      if (programId) body.programId = programId;
      if (academicTermId) body.academicTermId = academicTermId;
      if (selectedSemesters.length > 0) body.semesters = selectedSemesters;

      const res = await fetch(getApiUrl('/api/v1/solver/run'), {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || `Solver request failed (HTTP ${res.status})`);
      }

      const parsedRun = solverRunResultValidator.safeParse(json?.data);
      if (!parsedRun.success) {
        throw new Error('Unexpected response format from solver execution endpoint.');
      }

      setRunResult(parsedRun.data);
    } catch (err: unknown) {
      setRunError(err instanceof Error ? err.message : 'Unable to execute timetable solver.');
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Studio Banner & Scope Filters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-extrabold uppercase">
                {config.isDemoData ? 'Synthetic DB Scope' : 'Live DB Scope'}
              </span>
              <span className="text-[11px] font-bold text-slate-500">
                {config.scopeLabel.academicTerm}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Timetable Solver Studio • Constraint Engine
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {config.scopeLabel.department} • {config.scopeLabel.program}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Sections</div>
              <div className="text-sm font-black text-slate-900">
                {config.scopeSummary.sectionsCount}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Offerings</div>
              <div className="text-sm font-black text-slate-900">
                {config.scopeSummary.subjectOfferingsCount}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Faculty / Rooms</div>
              <div className="text-sm font-black text-slate-900">
                {config.scopeSummary.facultyCount} / {config.scopeSummary.roomsCount}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Periods/Day</div>
              <div className="text-sm font-black text-slate-900">
                {config.scopeSummary.classPeriodsPerDay ?? 'Default (7)'}
              </div>
            </div>
          </div>
        </div>

        {/* Scope Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All Departments</option>
              {config.availableFilters.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Program
            </label>
            <select
              value={programId}
              onChange={(e) => {
                setProgramId(e.target.value);
                setRunError(null);
                setRunResult(null);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All Programs</option>
              {filteredPrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Academic Term
            </label>
            <select
              value={academicTermId}
              onChange={(e) => {
                setAcademicTermId(e.target.value);
                setRunError(null);
                setRunResult(null);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              <option value="">All Academic Terms (Active Default on Run)</option>
              {config.availableFilters.academicTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.academicYearLabel} • {t.termLabel} ({t.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!config.hasData ? (
        <QueryStateCard
          mode="empty"
          title="No Academic Scheduling Scope Found"
          message="No departments, academic terms, sections, or subject offerings exist in the database."
          onRetry={refetch}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Hard Constraints */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Enforced Hard Constraints
                  </h2>
                  <div className="text-xs text-slate-500 font-medium">
                    Active CP-SAT & Greedy feasibility rules for the selected scope
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase">
                  ZERO TOLERANCE
                </span>
              </div>

              <div className="space-y-3">
                {config.hardConstraints.map((hc) => (
                  <div
                    key={hc.code}
                    className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 flex items-start space-x-3"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{hc.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-mono text-[10px] font-bold">
                          {hc.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {hc.description}
                      </div>
                      <div className="mt-1.5 text-[11px] font-semibold text-emerald-700">
                        {hc.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Soft Targets & Solver Execution */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Soft Optimization Targets
                    </h3>
                    <div className="text-[11px] text-slate-500">
                      Configured CP-SAT objective weights
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {config.softTargets.map((st) => (
                    <div key={st.key} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-800">{st.name}</span>
                        <span className="text-[11px] font-semibold text-blue-600">
                          Weight {st.weight} ({st.priority})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-tight">
                        {st.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-extrabold text-slate-900">Solver Execution Setup</h3>
                  <span className="text-[11px] text-slate-400 font-medium">Engine Mode</span>
                </div>

                <div className="space-y-2">
                  {config.engineStrategies.map((eng) => (
                    <label
                      key={eng.id}
                      onClick={() => setSelectedEngine(eng.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedEngine === eng.id
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

                <div className="pt-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Target Semesters in Scope
                  </div>
                  {config.availableFilters.semesters.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">
                      No active semesters in this scope.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {config.availableFilters.semesters.map((sem) => (
                        <label
                          key={sem}
                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-bold text-slate-800 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSemesters.includes(sem)}
                            onChange={() => toggleSemester(sem)}
                            className="text-blue-600 rounded"
                          />
                          <span>Sem {sem}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pre-execution Audit Bar */}
          <div
            className={`p-4 rounded-2xl border flex items-start space-x-3 ${config.preExecutionAudit.passed
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-amber-50 border-amber-200'
              }`}
          >
            {config.preExecutionAudit.passed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-extrabold text-xs text-slate-900">
                {config.preExecutionAudit.passed
                  ? 'Pre-execution Scope Audit Passed'
                  : 'Pre-execution Scope Warnings'}
              </div>
              <div className="text-xs text-slate-700">{config.preExecutionAudit.summary}</div>
              {config.preExecutionAudit.issues.length > 0 && (
                <ul className="list-disc list-inside text-[11px] text-amber-900">
                  {config.preExecutionAudit.issues.map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {runError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-red-900">Solver Execution Failed</div>
                <div>{runError}</div>
              </div>
            </div>
          )}

          {runResult ? (
            runResult.isDemoSimulated ? (
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-black uppercase mb-1">
                    DEMO / SIMULATED RESULT
                  </span>
                  <h3 className="text-lg font-black text-amber-950">
                    Simulated Demo Run ({runResult.solverStatus})
                  </h3>
                  <p className="text-xs text-amber-900 max-w-xl mx-auto mt-0.5">
                    {runResult.warning ||
                      'Demo simulated output only. Not generated by OR-Tools and cannot be published.'}
                  </p>
                </div>
                <div className="flex justify-center space-x-3 pt-1">
                  <button
                    onClick={() => setRunResult(null)}
                    className="px-4 py-2 bg-white border border-amber-300 text-amber-900 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Back to Studio
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-emerald-950">
                    Optimization Completed ({runResult.solverStatus})
                  </h3>
                  <p className="text-xs text-emerald-800 max-w-xl mx-auto mt-0.5">
                    Run ID: <span className="font-mono">{runResult.runId}</span> •{' '}
                    {runResult.candidatesGenerated} candidate(s) generated in {runResult.runtimeMs}ms
                    ({runResult.source}).
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
                    onClick={() => setRunResult(null)}
                    className="px-4 py-2 bg-white border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Run Another Scope
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
              <div>
                <div className="font-extrabold text-sm text-white">Ready to Initiate Solver</div>
                <div className="text-xs text-slate-400">
                  Scope: {config.scopeSummary.sectionsCount} sections,{' '}
                  {config.scopeSummary.subjectOfferingsCount} offerings
                </div>
              </div>
              <button
                disabled={
                  isSolving ||
                  (config.availableFilters.semesters.length > 0 && selectedSemesters.length === 0)
                }
                onClick={() => void handleRunSolver()}
                className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-extrabold flex items-center space-x-2 shadow-md transition-all cursor-pointer"
              >
                {isSolving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Running Solver...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run Timetable Solver Engine</span>
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
