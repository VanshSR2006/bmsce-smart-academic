import React, { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import type { NepSchemeOverview } from '@bmsce/contracts';
import { getApiUrl } from '../../lib/api';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import {
  ChevronRight,
  Compass,
  Download,
  Inbox,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const nepSchemeOverviewValidator: z.ZodType<NepSchemeOverview> = z.object({
  hasData: z.boolean(),
  isDemoData: z.boolean(),
  schemeLabel: z.string(),
  department: z.string(),
  academicTermLabel: z.string(),
  programLabel: z.string(),
  appliedFilters: z.object({
    departmentId: z.string().nullable(),
    programId: z.string().nullable(),
    academicTermId: z.string().nullable(),
  }),
  availableFilters: z.object({
    departments: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    programs: z.array(z.object({ id: z.string(), code: z.string(), name: z.string() })),
    academicTerms: z.array(
      z.object({ id: z.string(), academicYearLabel: z.string(), termLabel: z.string() })
    ),
  }),
  schemaLimitations: z.array(z.string()),
  categories: z.array(
    z.object({
      code: z.string(),
      title: z.string(),
      subjectCount: z.number().int(),
      offeringCount: z.number().int(),
      totalWeeklyHours: z.number(),
      courses: z.array(
        z.object({
          id: z.string(),
          code: z.string(),
          name: z.string(),
          subjectType: z.string(),
          departmentName: z.string(),
          semesters: z.array(z.number().int()),
          offeringCount: z.number().int(),
          hoursPerWeek: z.number(),
          sessionDurationPeriods: z.number().int(),
          requiresLab: z.boolean(),
          isLabContiguous: z.boolean(),
          credits: z.number().nullable(),
          ltp: z.string().nullable(),
        })
      ),
    })
  ),
  statistics: z.object({
    totalUniqueSubjects: z.number().int(),
    totalOfferings: z.number().int(),
    totalWeeklyContactHours: z.number(),
    theorySubjectCount: z.number().int(),
    labSubjectCount: z.number().int(),
    tutorialOtherCount: z.number().int(),
    labContactRatioPct: z.number(),
  }),
  staticReferenceRules: z.array(
    z.object({
      mandate: z.string(),
      rule: z.string(),
      enforcement: z.string(),
    })
  ),
});

export const NepScheme: React.FC = () => {
  const [departmentId, setDepartmentId] = useState<string>('');
  const [programId, setProgramId] = useState<string>('');
  const [academicTermId, setAcademicTermId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const endpoint = useMemo(() => {
    const params = new URLSearchParams();
    if (departmentId) params.set('departmentId', departmentId);
    if (programId) params.set('programId', programId);
    if (academicTermId) params.set('academicTermId', academicTermId);
    const qs = params.toString();
    return qs ? `/api/v1/nep-scheme/overview?${qs}` : '/api/v1/nep-scheme/overview';
  }, [departmentId, programId, academicTermId]);

  const { data: rawData, loading, error, refetch } = useApiQuery<unknown>(endpoint);

  const parsed = useMemo(() => {
    if (rawData == null) return null;
    return nepSchemeOverviewValidator.safeParse(rawData);
  }, [rawData]);

  const data = parsed?.success ? parsed.data : null;

  useEffect(() => {
    if (data && data.categories.length > 0) {
      setActiveCategory((prev) =>
        prev && data.categories.some((c) => c.code === prev) ? prev : data.categories[0].code
      );
    } else {
      setActiveCategory('');
    }
  }, [data]);

  if (loading) {
    return (
      <QueryStateCard
        mode="loading"
        message="Loading curriculum and subject offerings..."
        spinnerColorClass="border-indigo-600"
      />
    );
  }

  if (error || (rawData != null && parsed && !parsed.success)) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load NEP Scheme"
        message={error || 'Unexpected response format from curriculum service.'}
        onRetry={refetch}
      />
    );
  }

  if (!data) {
    return (
      <QueryStateCard
        mode="empty"
        title="No Curriculum Data Returned"
        message="No curriculum payload was returned by the server."
        onRetry={refetch}
      />
    );
  }

  const selectedCategory =
    data.categories.find((c) => c.code === activeCategory) || data.categories[0] || null;
  const hasFilters = Boolean(departmentId || programId || academicTermId);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <span>{data.programLabel}</span>
              <ChevronRight size={12} />
              <span>{data.department}</span>
              <ChevronRight size={12} />
              <span className="text-slate-300 font-semibold">{data.academicTermLabel}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{data.schemeLabel}</h1>
            <p className="text-slate-400 text-xs mt-1">
              Database-backed Subject &amp; SubjectOffering records grouped by Subject.subjectType
            </p>
            {data.isDemoData && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-[11px] font-semibold">
                Includes Demo / Synthetic Academic Records
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.open(getApiUrl(endpoint), '_blank')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download size={14} />
              Export JSON Spec
            </button>
          </div>
        </div>

        {/* Scope Filters (from DB) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/10">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Academic Term
            </label>
            <select
              value={academicTermId}
              onChange={(e) => setAcademicTermId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2"
            >
              <option value="">All Academic Terms</option>
              {data.availableFilters.academicTerms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.academicYearLabel} — {t.termLabel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Department
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2"
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
            <label className="block text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Program
            </label>
            <select
              value={programId}
              onChange={(e) => setProgramId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-2"
            >
              <option value="">All Programs</option>
              {data.availableFilters.programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Metrics Row (DB-derived) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Unique Subjects</div>
            <div className="text-xl font-bold text-white mt-1">
              {data.statistics.totalUniqueSubjects}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Deduplicated in scope</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Subject Offerings</div>
            <div className="text-xl font-bold text-blue-300 mt-1">
              {data.statistics.totalOfferings}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Section-level records</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Theory Subjects</div>
            <div className="text-xl font-bold text-purple-300 mt-1">
              {data.statistics.theorySubjectCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">subjectType = THEORY</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Lab Subjects</div>
            <div className="text-xl font-bold text-teal-300 mt-1">
              {data.statistics.labSubjectCount}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">subjectType = LAB</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Lab Contact Ratio</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">
              {data.statistics.labContactRatioPct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">From offering hours</div>
          </div>
        </div>
      </div>

      {/* Schema Limitations Notice */}
      {data.schemaLimitations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Schema Representation Note: </span>
            {data.schemaLimitations.join(' ')}
          </div>
        </div>
      )}

      {/* Empty State when no offerings match */}
      {!data.hasData || !selectedCategory ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3">
          <Inbox size={28} className="text-slate-400 mx-auto" />
          <h2 className="text-base font-bold text-slate-800">
            No Matching Subject Offerings Found
          </h2>
          <p className="text-sm text-slate-500">
            No `SubjectOffering` records exist in the database for the selected filters.
          </p>
          {hasFilters && (
            <button
              onClick={() => {
                setDepartmentId('');
                setProgramId('');
                setAcademicTermId('');
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Reset Scope Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: SubjectType Categories + Static Reference Notes */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Compass size={14} className="text-indigo-600" />
                Subject Categories (DB `subjectType`)
              </div>

              {data.categories.map((cat) => {
                const isActive = selectedCategory.code === cat.code;
                return (
                  <div
                    key={cat.code}
                    onClick={() => setActiveCategory(cat.code)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                        : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                        {cat.code}
                      </span>
                      <span className="text-xs font-bold text-indigo-700">
                        {cat.subjectCount} Subject(s) • {cat.offeringCount} Offering(s)
                      </span>
                    </div>
                    <h4 className="font-bold text-xs text-slate-900 mt-1">{cat.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {cat.totalWeeklyHours} unique contact hrs/wk across category
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Static Reference Notes (clearly labeled) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600" />
                Solver Constraint Reference (Static)
              </div>
              <div className="space-y-2.5">
                {data.staticReferenceRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1"
                  >
                    <div className="font-bold text-slate-800">{rule.mandate}</div>
                    <p className="text-[11px] text-slate-600 leading-snug">{rule.rule}</p>
                    <div className="text-[10px] text-indigo-700 font-medium font-mono pt-1">
                      {rule.enforcement}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: DB-Backed Subjects Table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">
                    {selectedCategory.code} • Database Records
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">{selectedCategory.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                    {selectedCategory.courses.length} Unique Subject(s)
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[520px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                      <th className="py-2.5 px-3">Course Code &amp; Title</th>
                      <th className="py-2.5 px-2">Sem(s)</th>
                      <th className="py-2.5 px-2">Offerings</th>
                      <th className="py-2.5 px-2">L:T:P / Credits</th>
                      <th className="py-2.5 px-2">Contact Hrs/Wk</th>
                      <th className="py-2.5 px-3">Scheduling Rule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedCategory.courses.map((course) => (
                      <tr key={course.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900">{course.name}</div>
                          <div className="text-[11px] text-indigo-600 font-mono mt-0.5">
                            {course.code}
                          </div>
                        </td>

                        <td className="py-3 px-2">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                            {course.semesters.length > 0
                              ? `Sem ${course.semesters.join(', ')}`
                              : '—'}
                          </span>
                        </td>

                        <td className="py-3 px-2 font-semibold text-slate-700">
                          {course.offeringCount}
                        </td>

                        <td className="py-3 px-2 text-slate-500">
                          <div>{course.ltp ?? '—'}</div>
                          <div className="text-[10px] text-slate-400">
                            {course.credits != null ? `${course.credits} Cr` : 'Not in schema'}
                          </div>
                        </td>

                        <td className="py-3 px-2">
                          <div className="font-semibold text-slate-800">
                            {course.hoursPerWeek} Hours
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {course.sessionDurationPeriods}p / session
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {course.isLabContiguous ? (
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1 w-fit">
                              Contiguous {course.sessionDurationPeriods}p Block
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                              Standard Slots
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Static Reference Formula Note */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                  <Sparkles size={13} className="text-indigo-600" />
                  Reference Note (Static Policy Summary):
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  Subject groupings, offering counts, and contact hours above come directly from
                  PostgreSQL `Subject` and `SubjectOffering` records. Credit values and NEP vertical
                  codes will appear once added to the database schema.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
