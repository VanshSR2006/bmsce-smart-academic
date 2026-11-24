import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../lib/api';
import {
  Sliders,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Download,
  ChevronRight,
  ShieldCheck,
  Compass,
  GraduationCap,
  Award,
} from 'lucide-react';

interface NepCourse {
  code: string;
  name: string;
  ltp: string;
  credits: number;
  hoursPerWeek: number;
  semester: number;
  isLabContiguous: boolean;
}

interface NepVertical {
  code: string;
  title: string;
  description: string;
  color: string;
  totalCredits: number;
  courses: NepCourse[];
}

interface SolverRule {
  mandate: string;
  rule: string;
  enforcement: string;
  status: string;
}

interface NepSchemeData {
  schemeLabel: string;
  department: string;
  degree: string;
  totalDegreeCredits: number;
  semesterCreditsTarget: string;
  verticals: NepVertical[];
  solverRules: SolverRule[];
  statistics: {
    totalCoreCredits: number;
    totalElectiveCredits: number;
    totalSkillCredits: number;
    practicalHandsOnRatio: string;
  };
}

export const NepScheme: React.FC = () => {
  const [data, setData] = useState<NepSchemeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeVertical, setActiveVertical] = useState<string>('PCC');

  useEffect(() => {
    fetch(getApiUrl('/api/v1/nep-scheme/overview'))
      .then((res) => res.json())
      .then((res) => {
        if (res.data) setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load NEP scheme:', err);
        setLoading(false);
      });
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  const selectedVertical = data.verticals.find((v) => v.code === activeVertical) || data.verticals[0];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#0f172a] rounded-2xl p-6 text-white shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1 font-medium">
              <span>BMSCE Autonomous Curriculum</span>
              <ChevronRight size={12} />
              <span>{data.department}</span>
              <ChevronRight size={12} />
              <span className="text-slate-300 font-semibold">{data.schemeLabel}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              NEP 2022 Curriculum Framework & Credit Architecture
            </h1>
            <p className="text-slate-400 text-xs mt-1">
              Autonomous Credit Matrix (160 Total Credits) • L:T:P Contact Period Rules • Automated Timetable Constraint Anchors
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.open('/api/v1/nep-scheme/overview', '_blank')}
              className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download size={14} />
              Export NEP Syllabus Spec
            </button>
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Degree Requirement</div>
            <div className="text-xl font-bold text-white mt-1">{data.totalDegreeCredits} Credits</div>
            <div className="text-[10px] text-slate-400 mt-0.5">8 Semesters Total</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Professional Core (PCC)</div>
            <div className="text-xl font-bold text-blue-300 mt-1">{data.statistics.totalCoreCredits} Credits</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Algorithms, DBMS, OS, CN</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Electives (PEC / OEC)</div>
            <div className="text-xl font-bold text-purple-300 mt-1">{data.statistics.totalElectiveCredits} Credits</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Specialization & Cross-Domain</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Experiential & Skills</div>
            <div className="text-xl font-bold text-teal-300 mt-1">{data.statistics.totalSkillCredits} Credits</div>
            <div className="text-[10px] text-slate-400 mt-0.5">3h Practical Blocks</div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5">
            <div className="text-slate-400 text-xs font-medium">Practical Ratio</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">38.5%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">High Hands-On Balance</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Vertical Categories and Course Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Vertical Track Selector (1 col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Compass size={14} className="text-indigo-600" />
              Curricular Verticals (NEP 2022)
            </div>

            {data.verticals.map((vert) => {
              const isActive = activeVertical === vert.code;
              return (
                <div
                  key={vert.code}
                  onClick={() => setActiveVertical(vert.code)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'bg-indigo-50/70 border-indigo-400 shadow-xs'
                      : 'bg-slate-50/60 hover:bg-slate-100/80 border-slate-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-white text-slate-800 border border-slate-200">
                      {vert.code}
                    </span>
                    <span className="text-xs font-bold text-indigo-700">{vert.totalCredits} Credits</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 mt-1">{vert.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{vert.description}</p>
                </div>
              );
            })}
          </div>

          {/* Timetable Constraint Enforcements */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-600" />
              NEP Automated Solver Mandates
            </div>
            <div className="space-y-2.5">
              {data.solverRules.map((rule, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{rule.mandate}</span>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {rule.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">{rule.rule}</p>
                  <div className="text-[10px] text-indigo-700 font-medium font-mono pt-1">
                    ⚙️ {rule.enforcement}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Course Table & L:T:P Specs (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase">
                  {selectedVertical.code} Specification
                </span>
                <h3 className="text-lg font-bold text-slate-900">{selectedVertical.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{selectedVertical.description}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-xl">
                  {selectedVertical.courses.length} Sample Courses
                </span>
              </div>
            </div>

            {/* Courses Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold">
                    <th className="py-2.5 px-3">Course Code & Title</th>
                    <th className="py-2.5 px-2">Sem</th>
                    <th className="py-2.5 px-2">L:T:P Ratio</th>
                    <th className="py-2.5 px-2">Credits</th>
                    <th className="py-2.5 px-2">Contact Hrs/Wk</th>
                    <th className="py-2.5 px-3">Scheduling Rule</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVertical.courses.map((course) => (
                    <tr key={course.code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900">{course.name}</div>
                        <div className="text-[11px] text-indigo-600 font-mono mt-0.5">{course.code}</div>
                      </td>

                      <td className="py-3 px-2">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          Sem {course.semester}
                        </span>
                      </td>

                      <td className="py-3 px-2">
                        <div className="font-mono font-bold text-slate-800 text-[11px]">{course.ltp}</div>
                        <div className="text-[10px] text-slate-400">Lec : Tut : Lab</div>
                      </td>

                      <td className="py-3 px-2">
                        <div className="font-bold text-slate-900 text-sm">{course.credits}</div>
                        <div className="text-[10px] text-slate-400">Credits</div>
                      </td>

                      <td className="py-3 px-2">
                        <div className="font-semibold text-slate-800">{course.hoursPerWeek} Hours</div>
                        <div className="text-[10px] text-slate-400">Per Week</div>
                      </td>

                      <td className="py-3 px-3">
                        {course.isLabContiguous ? (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 flex items-center gap-1 w-fit">
                            <span>⚡</span> Mandatory 3h Lab Block
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 w-fit">
                            Standard Contact Slots
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Credit-to-Contact Formula Note */}
            <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-indigo-950">
                <Sparkles size={13} className="text-indigo-600" />
                NEP 2022 Contact Hour Computation Standard:
              </div>
              <p className="text-[11px] text-indigo-800 leading-relaxed">
                • <strong>Theory Lecture (L):</strong> 1 Lecture Credit = 1 Contact Hour per working week.<br />
                • <strong>Tutorial (T):</strong> 1 Tutorial Credit = 1 Contact Hour in classroom format.<br />
                • <strong>Practical Laboratory (P):</strong> 1 Practical Credit = 2 Contact Hours. Under Autonomous Clause 4.3, each lab session requires a contiguous 3-period block (180 mins) to account for workstation prep, experimental runs, and immediate viva grading.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

