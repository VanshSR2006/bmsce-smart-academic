import React, { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import type {
  CandidateComparisonResponse,
  ComparisonCandidateItem,
  PublishCandidateResponse,
} from '@bmsce/contracts';
import { getApiUrl } from '../../lib/api';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import { useNavigate } from 'react-router-dom';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileCheck,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

const candidateComparisonValidator: z.ZodType<CandidateComparisonResponse> = z.object({
  hasData: z.boolean(),
  scopeLabel: z.object({
    department: z.string(),
    program: z.string(),
    academicTerm: z.string(),
  }),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    programId: z.string().nullable(),
    academicTermId: z.string().nullable(),
    runId: z.string().nullable(),
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
    runs: z.array(
      z.object({
        id: z.string(),
        algorithmCode: z.string(),
        solverStatus: z.string().nullable(),
        createdAt: z.string(),
        candidateCount: z.number().int(),
      })
    ),
  }),
  run: z
    .object({
      id: z.string(),
      algorithmCode: z.string(),
      status: z.string(),
      solverStatus: z.string().nullable(),
      runtimeMs: z.number().nullable(),
      createdAt: z.string(),
      completedAt: z.string().nullable(),
      academicTermLabel: z.string(),
    })
    .nullable(),
  candidates: z.array(
    z.object({
      id: z.string(),
      optimizationRunId: z.string(),
      candidateNumber: z.number().int(),
      label: z.string(),
      solverStatus: z.string(),
      isFeasible: z.boolean(),
      hardViolationCount: z.number().int(),
      softPenalty: z.number().nullable(),
      qualityScore: z.number().nullable(),
      unscheduledSessionCount: z.number().int(),
      sessionCount: z.number().int(),
      metrics: z.record(z.unknown()),
      explanation: z.string().nullable(),
      isPublished: z.boolean(),
      publishedVersionId: z.string().nullable(),
      publishedVersionNumber: z.number().int().nullable(),
      sectionSummaries: z.array(
        z.object({
          sectionId: z.string(),
          sectionCode: z.string(),
          semesterNumber: z.number().int(),
          sessionCount: z.number().int(),
          labSessionCount: z.number().int(),
          totalPeriods: z.number().int(),
        })
      ),
      sessionsPreview: z.array(
        z.object({
          id: z.string(),
          subjectOfferingId: z.string(),
          subjectCode: z.string(),
          subjectName: z.string(),
          sectionId: z.string(),
          sectionCode: z.string(),
          facultyId: z.string(),
          facultyName: z.string(),
          roomId: z.string(),
          roomCode: z.string(),
          dayOfWeek: z.number().int(),
          dayCode: z.string(),
          startTime: z.string(),
          endTime: z.string(),
          durationPeriods: z.number().int(),
          sessionKind: z.string(),
          batchId: z.string().nullable(),
        })
      ),
    })
  ),
});

const publishResponseValidator: z.ZodType<PublishCandidateResponse> = z.object({
  timetableId: z.string(),
  timetableVersionId: z.string(),
  versionNumber: z.number().int(),
  status: z.string(),
  sourceType: z.string(),
  optimizationCandidateId: z.string(),
  supersedesVersionId: z.string().nullable(),
  sessionsPublished: z.number().int(),
  publishedAt: z.string(),
  publicationNote: z.string().nullable(),
  auditLogId: z.string(),
});

export const CandidateComparison: React.FC = () => {
  const navigate = useNavigate();
  const [departmentId, setDepartmentId] = useState('');
  const [programId, setProgramId] = useState('');
  const [academicTermId, setAcademicTermId] = useState('');
  const [runId, setRunId] = useState('');

  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('ALL');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publicationNote, setPublicationNote] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishCandidateResponse | null>(null);
  const publishingRef = useRef(false);

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (programId) params.set('programId', programId);
    if (academicTermId) params.set('academicTermId', academicTermId);
    if (runId) params.set('runId', runId);
    const qs = params.toString();
    return qs ? `/api/v1/solver/candidates/compare?${qs}` : '/api/v1/solver/candidates/compare';
  }, [departmentId, programId, academicTermId, runId]);

  const { data: rawData, loading, error, refetch } = useApiQuery<unknown>(endpoint);

  const parsed = useMemo(() => {
    if (!rawData) return null;
    return candidateComparisonValidator.safeParse(rawData);
  }, [rawData]);

  const data = parsed?.success ? parsed.data : null;

  useEffect(() => {
    if (!data || data.candidates.length === 0) {
      setSelectedCandidateId('');
      setConfirmOpen(false);
      return;
    }
    setSelectedCandidateId((prev) => {
      if (prev && data.candidates.some((c) => c.id === prev)) return prev;
      const best = data.candidates.find((c) => c.isFeasible) ?? data.candidates[0];
      return best.id;
    });
    setConfirmOpen(false);
    setSectionFilter('ALL');
  }, [data]);

  const selectedCandidate: ComparisonCandidateItem | null = useMemo(() => {
    if (!data || data.candidates.length === 0) return null;
    return data.candidates.find((c) => c.id === selectedCandidateId) ?? data.candidates[0];
  }, [data, selectedCandidateId]);

  const filteredPrograms = useMemo(() => {
    if (!data) return [];
    if (!departmentId) return data.availableFilters.programs;
    return data.availableFilters.programs.filter((p) => p.departmentId === departmentId);
  }, [data, departmentId]);

  const filteredSessions = useMemo(() => {
    if (!selectedCandidate) return [];
    if (sectionFilter === 'ALL') return selectedCandidate.sessionsPreview;
    return selectedCandidate.sessionsPreview.filter((s) => s.sectionId === sectionFilter);
  }, [selectedCandidate, sectionFilter]);

  const handlePublish = async () => {
    if (!selectedCandidate || publishingRef.current) return;
    if (!selectedCandidate.isFeasible || selectedCandidate.sessionCount === 0 || selectedCandidate.isPublished) {
      return;
    }

    publishingRef.current = true;
    setIsPublishing(true);
    setPublishError(null);

    try {
      const token =
        typeof window !== 'undefined' ? localStorage.getItem('bmsce_token')?.trim() || null : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(getApiUrl('/api/v1/solver/publish'), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          candidateId: selectedCandidate.id,
          departmentId: departmentId || undefined,
          programId: programId || undefined,
          academicTermId: data?.appliedFilters.academicTermId || academicTermId || undefined,
          publicationNote: publicationNote.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const serverMsg = json?.error?.message;
        if (res.status === 401) {
          setPublishError(
            serverMsg
              ? `Authentication required: ${serverMsg} Please sign in with an authorized account.`
              : 'Authentication required (HTTP 401). Please sign in with an authorized account before publishing.'
          );
          return;
        }
        if (res.status === 403) {
          setPublishError(
            serverMsg
              ? `Authorization denied: ${serverMsg}`
              : 'Authorization denied (HTTP 403). Only HOD, Dean, or Academic Administrator roles may publish timetables.'
          );
          return;
        }
        if (res.status === 409) {
          if (json?.error?.code === 'CANDIDATE_ALREADY_PUBLISHED') {
            setConfirmOpen(false);
            refetch();
          }
          setPublishError(
            serverMsg || 'Publication conflict (HTTP 409). This candidate may already be published or a concurrent publish occurred.'
          );
          return;
        }
        setPublishError(serverMsg || `Publish failed with HTTP ${res.status}`);
        return;
      }

      const validated = publishResponseValidator.safeParse(json?.data);
      if (!validated.success) {
        setPublishError('Publish succeeded on server, but response payload did not match expected contract.');
        refetch();
        return;
      }

      setPublishResult(validated.data);
      setConfirmOpen(false);
      setPublicationNote('');
      refetch();
    } catch (err: unknown) {
      setPublishError(err instanceof Error ? err.message : 'Unable to reach server to publish candidate.');
    } finally {
      publishingRef.current = false;
      setIsPublishing(false);
    }
  };

  if (loading) {
    return <QueryStateCard mode="loading" message="Loading optimization candidates from database..." />;
  }

  if (error) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load Candidate Comparison"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!data || (parsed && !parsed.success)) {
    return (
      <QueryStateCard
        mode="error"
        title="Invalid Comparison Response"
        message="Candidate comparison response from server did not match the expected contract."
        onRetry={refetch}
      />
    );
  }

  const renderScopeBar = () => (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
        <select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setProgramId('');
            setRunId('');
          }}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50"
        >
          <option value="">All Departments</option>
          {data.availableFilters.departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.code} — {d.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Program</label>
        <select
          value={programId}
          onChange={(e) => {
            setProgramId(e.target.value);
            setRunId('');
          }}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50"
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
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Academic Term</label>
        <select
          value={academicTermId || data.appliedFilters.academicTermId || ''}
          onChange={(e) => {
            setAcademicTermId(e.target.value);
            setRunId('');
          }}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50"
        >
          {data.availableFilters.academicTerms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.academicYearLabel} ({t.termLabel})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Optimization Run</label>
        <select
          value={runId || data.appliedFilters.runId || ''}
          onChange={(e) => setRunId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50"
        >
          {data.availableFilters.runs.length === 0 ? (
            <option value="">No completed runs</option>
          ) : (
            data.availableFilters.runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.algorithmCode} • {r.solverStatus || 'DONE'} ({r.candidateCount} cand.)
              </option>
            ))
          )}
        </select>
      </div>
    </div>
  );

  if (!data.hasData || data.candidates.length === 0) {
    return (
      <div className="space-y-4">
        {renderScopeBar()}
        <QueryStateCard
          mode="empty"
          title="No Completed Optimization Candidates"
          message="No completed real optimization runs with persisted candidate sessions exist for the selected scope. Run the solver in Solver Studio first."
          onRetry={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
              {data.scopeLabel.academicTerm}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              Dept: {data.scopeLabel.department}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              • Program: {data.scopeLabel.program}
            </span>
            {data.run && (
              <span className="text-xs font-bold text-slate-800">
                • Run: {data.run.algorithmCode} ({data.run.solverStatus || data.run.status})
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Timetable Candidate Comparison & Publishing
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Database-backed candidate schedules • {data.candidates.length} candidate(s) in run
            {data.run?.runtimeMs !== null && data.run?.runtimeMs !== undefined
              ? ` • ${data.run.runtimeMs} ms`
              : ''}
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start lg:self-auto">
          <button
            onClick={() => navigate('/solver')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <GitCompare className="w-3.5 h-3.5 text-blue-400" />
            <span>Open Solver Studio</span>
          </button>
        </div>
      </div>

      {renderScopeBar()}

      {publishResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm">
                Published TimetableVersion v{publishResult.versionNumber} ({publishResult.status})
              </div>
              <div className="text-emerald-800 mt-0.5">
                Version ID: <code className="font-mono">{publishResult.timetableVersionId}</code> •{' '}
                {publishResult.sessionsPublished} sessions published • AuditLog:{' '}
                <code className="font-mono">{publishResult.auditLogId}</code>
                {publishResult.supersedesVersionId && (
                  <span>
                    {' '}
                    • Preserved prior version <code className="font-mono">{publishResult.supersedesVersionId}</code>
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/timetable')}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
          >
            View Timetable
          </button>
        </div>
      )}

      {/* Candidate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.candidates.map((cand) => {
          const isSelected = selectedCandidate?.id === cand.id;
          return (
            <div
              key={cand.id}
              onClick={() => {
                setSelectedCandidateId(cand.id);
                setConfirmOpen(false);
                setPublishError(null);
              }}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${isSelected
                ? 'bg-blue-50/40 border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-extrabold text-blue-700 uppercase">
                    Candidate #{cand.candidateNumber} • {cand.solverStatus}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {cand.isPublished && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                        Published v{cand.publishedVersionNumber}
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${cand.isFeasible
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                        }`}
                    >
                      {cand.isFeasible ? 'Feasible' : `${cand.hardViolationCount} Hard Violations`}
                    </span>
                  </div>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 mb-1 leading-snug">
                  {cand.label}
                </h3>
                {cand.explanation && (
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">{cand.explanation}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/80 text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Quality Score</div>
                  <div className="font-black text-slate-900">
                    {cand.qualityScore !== null ? cand.qualityScore.toFixed(1) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Soft Penalty</div>
                  <div className="font-black text-slate-900">
                    {cand.softPenalty !== null ? cand.softPenalty.toFixed(1) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Persisted Sessions</div>
                  <div className="font-bold text-slate-800">{cand.sessionCount}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Unscheduled</div>
                  <div className="font-bold text-slate-800">{cand.unscheduledSessionCount}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Candidate Section Summary + Sessions Preview */}
      {selectedCandidate && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-100">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-extrabold text-slate-900">Section Coverage Summary</h3>
            </div>

            {selectedCandidate.sectionSummaries.length === 0 ? (
              <p className="text-xs text-slate-500">No section sessions persisted for this candidate.</p>
            ) : (
              <div className="space-y-2">
                {selectedCandidate.sectionSummaries.map((sec) => (
                  <div
                    key={sec.sectionId}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-extrabold text-slate-900">{sec.sectionCode}</div>
                      <div className="text-[11px] text-slate-500">Semester {sec.semesterNumber}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800">{sec.sessionCount} sessions</div>
                      <div className="text-[11px] text-slate-500">
                        {sec.labSessionCount} lab • {sec.totalPeriods} periods
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {Object.keys(selectedCandidate.metrics).length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-blue-500" />
                  <span>Solver Metrics</span>
                </div>
                {Object.entries(selectedCandidate.metrics).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs text-slate-600">
                    <span>{k}</span>
                    <span className="font-bold text-slate-900">{String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Persisted Candidate Sessions ({selectedCandidate.sessionCount} total)
                </h3>
              </div>

              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-800 bg-slate-50"
              >
                <option value="ALL">All Sections</option>
                {selectedCandidate.sectionSummaries.map((s) => (
                  <option key={s.sectionId} value={s.sectionId}>
                    {s.sectionCode}
                  </option>
                ))}
              </select>
            </div>

            {filteredSessions.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No sessions match the selected section.</p>
            ) : (
              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-200 sticky top-0 bg-white">
                    <tr>
                      <th className="py-2 pr-3">Section</th>
                      <th className="py-2 pr-3">Day & Time</th>
                      <th className="py-2 pr-3">Subject</th>
                      <th className="py-2 pr-3">Faculty</th>
                      <th className="py-2 pr-3">Room</th>
                      <th className="py-2">Kind</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/70">
                        <td className="py-2 pr-3 font-bold text-slate-900">{s.sectionCode}</td>
                        <td className="py-2 pr-3 text-slate-700 whitespace-nowrap">
                          {s.dayCode} {s.startTime}–{s.endTime}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="font-semibold text-slate-900">{s.subjectCode}</div>
                          <div className="text-[11px] text-slate-500">{s.subjectName}</div>
                        </td>
                        <td className="py-2 pr-3 text-slate-700">{s.facultyName}</td>
                        <td className="py-2 pr-3 font-semibold text-slate-800">{s.roomCode}</td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.sessionKind === 'LAB'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                              }`}
                          >
                            {s.sessionKind}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Governance & Non-Destructive Publish Authorization */}
      {selectedCandidate && (
        <div className="bg-white rounded-2xl p-6 border-2 border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Timetable Version Publishing & History Preservation</span>
              </div>
              <p className="text-xs text-slate-600">
                Publishing creates a new <strong>PUBLISHED</strong> <code>TimetableVersion</code> linked to{' '}
                <strong>{selectedCandidate.label}</strong> ({selectedCandidate.sessionCount} sessions) and
                preserves prior published versions via <code>supersedesVersionId</code>.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-end space-y-2">
              {selectedCandidate.isPublished ? (
                <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900">
                  ✓ Already Published as Version v{selectedCandidate.publishedVersionNumber}
                </div>
              ) : (
                <button
                  disabled={
                    isPublishing ||
                    !selectedCandidate.isFeasible ||
                    selectedCandidate.sessionCount === 0
                  }
                  onClick={() => {
                    setPublishError(null);
                    setConfirmOpen(true);
                  }}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-extrabold shadow-md flex items-center space-x-2 transition-all cursor-pointer"
                >
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Authorize & Publish Candidate</span>
                </button>
              )}
            </div>
          </div>

          {publishError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{publishError}</span>
            </div>
          )}

          {confirmOpen && !selectedCandidate.isPublished && (
            <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-3">
              <div className="text-xs font-bold text-slate-900">
                Confirm Publication: {selectedCandidate.label} ({selectedCandidate.sessionCount} sessions)
              </div>
              <input
                type="text"
                value={publicationNote}
                onChange={(e) => setPublicationNote(e.target.value)}
                placeholder="Optional publication note (e.g., Approved by CSE HOD for Odd Sem)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-800 bg-white"
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={() => setConfirmOpen(false)}
                  className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPublishing}
                  onClick={handlePublish}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                >
                  {isPublishing ? 'Publishing...' : 'Confirm & Publish TimetableVersion'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
