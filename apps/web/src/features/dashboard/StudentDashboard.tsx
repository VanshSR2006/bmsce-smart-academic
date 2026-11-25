import React from 'react';
import { useApiQuery } from '../../components/common/useApiQuery';
import { QueryStateCard } from '../../components/common/QueryStateCard';
import {
  Clock,
  Calendar,
  CheckCircle2,
  FileText,
  AlertCircle,
  Download,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const StudentDashboard: React.FC = () => {
  const { data, loading, error, refetch } = useApiQuery<any>('/api/v1/students/me/dashboard');

  if (loading) {
    return <QueryStateCard mode="loading" message="Loading student dashboard..." />;
  }

  if (error) {
    return (
      <QueryStateCard
        mode="error"
        title="Failed to Load Student Dashboard"
        message={error}
        onRetry={refetch}
      />
    );
  }

  if (!data || !data.student || !data.summaryCards) {
    return (
      <QueryStateCard
        mode="empty"
        title="No Student Dashboard Data"
        message="No schedule summary was returned for this student profile."
        onRetry={refetch}
      />
    );
  }

  const { student, summaryCards, activeSessionHero, todayTimeline, announcements, examMilestones, calendarHighlights } = data;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Campus Beacon Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-blue-600 tracking-wider uppercase mb-1">
            USN: {student.usn} • {student.department}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Good morning, {student.name}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {student.semesterLabel} • {student.academicYearLabel} • {student.timetableVersionLabel}
          </p>
          <div className="inline-block mt-2 px-2.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold">
            Prototype Environment (No ERP/SIS Connection Required)
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center space-x-3 self-start md:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <div className="text-[11px] font-bold text-slate-700">Campus Beacon: PJ-Block</div>
            <div className="text-[10px] text-slate-500 font-mono">EDUROAM_BMSCE_5G connected</div>
          </div>
          <button className="px-2 py-1 bg-white border border-slate-200 rounded text-[10px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer">
            Copy USN
          </button>
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Schedule */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>{summaryCards.todaySchedule.title}</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 leading-tight">
            {summaryCards.todaySchedule.mainText}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {summaryCards.todaySchedule.subText}
          </div>
          <div className="mt-2 text-[11px] font-semibold text-emerald-600 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>{summaryCards.todaySchedule.tag}</span>
          </div>
        </div>

        {/* Next Up */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>{summaryCards.nextUp.title}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 leading-tight">
            {summaryCards.nextUp.mainText}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {summaryCards.nextUp.subText}
          </div>
          <div className="mt-2 text-[11px] font-semibold text-slate-600">
            {summaryCards.nextUp.slotInfo}
          </div>
        </div>

        {/* Weekly Schedule Load */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>{summaryCards.weeklyLoad.title}</span>
            <BookOpen className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 leading-tight">
            {summaryCards.weeklyLoad.mainText}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {summaryCards.weeklyLoad.subText}
          </div>
          <div className="mt-2 text-[11px] font-semibold text-blue-600">
            {summaryCards.weeklyLoad.detail}
          </div>
        </div>

        {/* Next Milestone */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>{summaryCards.nextMilestone.title}</span>
            <Sparkles className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-lg font-extrabold text-slate-900 leading-tight">
            {summaryCards.nextMilestone.mainText}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-0.5">
            {summaryCards.nextMilestone.subText}
          </div>
          <div className="mt-2 text-[11px] font-semibold text-amber-700">
            {summaryCards.nextMilestone.tag}
          </div>
        </div>
      </div>

      {/* Active Lecture Hero Card (Deep Navy Container) */}
      <div className="bg-[#0f172a] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[11px] font-extrabold flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                <span>{activeSessionHero.badge}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-semibold">
                {activeSessionHero.category}
              </span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white">
              {activeSessionHero.courseCode} — {activeSessionHero.courseTitle}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 pt-1">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">Classroom Venue</div>
                <div className="font-bold text-white mt-0.5">{activeSessionHero.roomLabel}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">Faculty In-Charge</div>
                <div className="font-bold text-white mt-0.5">{activeSessionHero.facultyLabel}</div>
              </div>
            </div>

            <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs text-slate-200">
              <span className="font-bold text-blue-400">Current Module: </span>
              {activeSessionHero.currentModule}
            </div>

            {/* Session Progress Bar */}
            <div className="pt-2">
              <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
                <span>{activeSessionHero.timeRemainingText}</span>
                <span>{activeSessionHero.progressPct}% Session Completed</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${activeSessionHero.progressPct}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons on Hero */}
          <div className="flex flex-col space-y-2.5 shrink-0 justify-center">
            <button className="px-5 py-2.5 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>View Class Notes</span>
            </button>
            <NavLink
              to="/communication"
              className="px-5 py-2.5 rounded-xl bg-slate-800/90 text-white font-bold text-xs hover:bg-slate-700 flex items-center justify-center space-x-2 border border-slate-700 transition-all"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Class Communication & Query</span>
            </NavLink>
            <NavLink
              to="/timetable"
              className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 flex items-center justify-center space-x-2 shadow-sm transition-all"
            >
              <Calendar className="w-4 h-4" />
              <span>Full Weekly Timetable</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Today's Academic Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Today's Academic Timeline</h3>
            <span className="text-xs text-slate-500 font-medium">Tuesday • Week 7</span>
          </div>
          <div className="flex items-center space-x-3 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Completed</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span>Active</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
              <span>Upcoming</span>
            </span>
          </div>
        </div>

        {/* Timeline Horizontal / Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {todayTimeline.map((slot: any) => (
            <div
              key={slot.id}
              className={`p-3.5 rounded-xl border transition-all ${
                slot.status === 'Current Active'
                  ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                  : 'bg-slate-50/60 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                <span className="text-slate-500">{slot.startTime} – {slot.endTime}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    slot.status === 'Finished'
                      ? 'bg-emerald-100 text-emerald-800'
                      : slot.status === 'Current Active'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {slot.status}
                </span>
              </div>
              <div className="font-extrabold text-xs text-slate-900 leading-tight">
                {slot.courseTitle}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{slot.courseCode}</div>
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-3 pt-2 border-t border-slate-200/60">
                <span>{slot.facultyName}</span>
                <span className="font-mono text-slate-700 font-bold">{slot.roomCode}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Afternoon Practical Lab Banner */}
        <div className="mt-4 p-4 rounded-xl bg-purple-50 border border-purple-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-extrabold tracking-wider text-purple-900 uppercase">
                AFTERNOON BLOCK: 01:15 PM – 04:15 PM (3 Hours Contiguous Lab)
              </span>
              <span className="px-1.5 py-0.5 bg-purple-200/70 text-purple-800 rounded text-[10px] font-bold">
                Batch B1 & B2
              </span>
            </div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">
              DEMO-LAB301 DBMS Practicum (Batch B1) / OS Lab (Batch B2)
            </div>
            <div className="text-[11px] text-slate-600">
              Sample Lab CS-L1 & CS-L2 • Sample Lab Instructor X • Department Computing Complex
            </div>
          </div>
          <button className="px-3.5 py-1.5 bg-white border border-purple-200 rounded-lg text-xs font-bold text-purple-700 hover:bg-purple-100/50 flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            <span>Download Lab Stubs</span>
          </button>
        </div>
      </div>

      {/* Announcements & Examination Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Announcements & Class Communication */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-extrabold text-slate-900">
                Announcements & Class Communication
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                1 Urgent
              </span>
            </div>
            <button className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1 cursor-pointer">
              <span>Notice Archive</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {announcements.map((ann: any) => (
              <div
                key={ann.id}
                className={`p-4 rounded-xl border transition-all ${
                  ann.isUrgent
                    ? 'bg-rose-50/40 border-rose-200'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                  <div className="flex items-center space-x-1.5">
                    {ann.isUrgent ? (
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span className={ann.isUrgent ? 'text-rose-700' : 'text-slate-600'}>
                      {ann.type}
                    </span>
                  </div>
                  <span className="text-slate-400 font-normal">{ann.timestamp}</span>
                </div>
                <div className="font-extrabold text-xs text-slate-900 mb-1">{ann.title}</div>
                <div className="text-xs text-slate-600 leading-relaxed">{ann.body}</div>
                {ann.attachment && (
                  <div className="mt-2 inline-flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:underline cursor-pointer">
                    <Download className="w-3 h-3" />
                    <span>{ann.attachment}</span>
                  </div>
                )}
                {ann.author && (
                  <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-200/60">
                    {ann.author}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Examination Timetable Widget */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Examination Timetable</h3>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Internal Schedule
              </span>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-xl mb-4">
              <div className="text-xs font-bold text-blue-900">CIE-2 Timetable</div>
              <div className="text-[11px] text-blue-700 font-medium">Oct 28 — Nov 02, 2024</div>
            </div>

            <div className="space-y-3">
              {examMilestones.map((exam: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-start justify-between pb-3 border-b border-slate-100 last:border-0 last:pb-0"
                >
                  <div className="flex items-start space-x-3">
                    <div className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-center shrink-0">
                      <div className="text-[10px] font-black text-slate-800">{exam.date}</div>
                    </div>
                    <div>
                      <div className="font-extrabold text-xs text-slate-900 leading-tight">
                        {exam.code} {exam.title}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {exam.time} • {exam.room}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">
                    {exam.marks} Marks
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Academic Calendar Highlights footer */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Academic Calendar Highlights
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium">Last Working Day</div>
                <div className="font-bold text-slate-800">{calendarHighlights.lastWorkingDay}</div>
              </div>
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="text-[10px] text-slate-400 font-medium">Lab Exam Window</div>
                <div className="font-bold text-slate-800">{calendarHighlights.labExamWindow}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

