import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, LayoutDashboard, CalendarDays, Bell, Sparkles, GitCompare, AlertOctagon, Wrench, FileSpreadsheet, Users, DoorOpen, Sliders, Search, HelpCircle, ChevronDown, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Drawer } from './Drawer';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, switchUser } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const location = useLocation();

  const isStudent = currentUser.role === 'STUDENT' || currentUser.role === 'CR';

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const navGroups = [
    {
      title: 'ACADEMIC OPERATIONS',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard },
        { label: 'Master Timetable Grid', path: '/timetable', icon: CalendarDays },
        { label: 'Class Communication', path: '/communication', icon: MessageSquare },
      ],
    },
    {
      title: 'ADMINISTRATIVE STUDIO',
      items: [
        { label: 'Timetable Studio (Solver)', path: '/solver-studio', icon: Sparkles },
        { label: 'Candidate Comparison', path: '/candidate-comparison', icon: GitCompare },
        { label: 'Conflict Inspector', path: '/conflict-inspector', icon: AlertOctagon, badge: '3 Hard' },
        { label: 'Disruption Repair', path: '/disruption-repair', icon: Wrench },
        { label: 'CIE & Exam Allocation', path: '/examinations', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'RESOURCES & INFRASTRUCTURE',
      items: [
        { label: 'Faculty Workload', path: '/workload', icon: Users },
        { label: 'Smart Labs & Rooms', path: '/rooms', icon: DoorOpen },
        { label: 'NEP 2022 Scheme', path: '/nep-scheme', icon: Sliders },
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f4f6fa] text-slate-800">
      {/* Top Global Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs px-3 md:px-6 py-2.5 flex items-center justify-between gap-2">
        {/* Hamburger button for mobile */}
        <button
          className="lg:hidden p-2"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        {/* Left: Logo & Title */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#1e293b] flex items-center justify-center text-white font-black text-xl shadow-xs">
            ⚡
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-base">
                CampusFlow
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold tracking-wider rounded bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                Portal
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500">
              BMSCE Academic Management Portal
            </div>
          </div>

          <div className="hidden lg:flex items-center ml-4 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Odd Sem 2024–25</span>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="hidden md:flex items-center relative w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search courses, faculty, room codes..."
            className="w-full pl-9 pr-10 py-1.5 bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          <kbd className="absolute right-3 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            ⌘K
          </kbd>
        </div>

        {/* Right: Persona Switcher & Profile */}
        <div className="flex items-center space-x-3">
          {/* Persona / Role Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>
                {currentUser.role === 'DEPT_HEAD'
                  ? 'HOD / Cluster Head'
                  : currentUser.role === 'FACULTY'
                  ? 'Faculty'
                  : currentUser.role === 'CR'
                  ? 'Class Representative'
                  : 'Student'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50">
                <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch Demo Persona
                </div>
                <button
                  onClick={() => { switchUser('DEPT_HEAD'); setShowRoleMenu(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                    currentUser.role === 'DEPT_HEAD' ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">Dr. K. R. Suresh</div>
                    <div className="text-[11px] text-slate-500">HOD CSE • Professor</div>
                  </div>
                  {currentUser.role === 'DEPT_HEAD' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
                <button
                  onClick={() => { switchUser('FACULTY'); setShowRoleMenu(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                    currentUser.role === 'FACULTY' ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">Dr. A. Ramanathan</div>
                    <div className="text-[11px] text-slate-500">Faculty • DAA Coordinator</div>
                  </div>
                  {currentUser.role === 'FACULTY' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
                <button
                  onClick={() => { switchUser('CR'); setShowRoleMenu(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                    currentUser.role === 'CR' ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">Aryan Rao</div>
                    <div className="text-[11px] text-slate-500">Class Representative (CSE-5B)</div>
                  </div>
                  {currentUser.role === 'CR' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
                <button
                  onClick={() => { switchUser('STUDENT'); setShowRoleMenu(false); }}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                    currentUser.role === 'STUDENT' ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold">Arjun</div>
                    <div className="text-[11px] text-slate-500">5th Sem Student (CSE-5B)</div>
                  </div>
                  {currentUser.role === 'STUDENT' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Notifications Icon */}
          <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500"></span>
          </button>

          {/* Help */}
          <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer">
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Avatar Profile */}
          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-200">
              {currentUser.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {currentUser.displayName}
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser.designation}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Drawer for mobile navigation */}
      <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
        <div className="space-y-6">
          {navGroups.map((group, idx) => (
            <div key={idx}>
              <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-3">
                {group.title}
              </div>
              <div className="space-y-1">
                {group.items.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={i}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                        }`
                      }
                      onClick={() => setIsDrawerOpen(false)}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          {item.badge}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
          {/* Bottom Sidebar Status */}
          <div className="pt-4 border-t border-slate-100 mt-6 text-left">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All 14 Clusters Synced</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              BMSCE Edge • v4.2.1-prod
            </div>
          </div>
        </div>
      </Drawer>
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar Navigation */}
        <aside className="w-64 hidden lg:block bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 p-4 overflow-y-auto">
          <div className="space-y-6">
            {navGroups.map((group, idx) => (
              <div key={idx}>
                <div className="text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2 px-3">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={i}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-bold shadow-2xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                          }`
                        }
                      >
                        <div className="flex items-center space-x-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Sidebar Status */}
          <div className="pt-4 border-t border-slate-100 mt-6 text-left">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>All 14 Clusters Synced</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
              BMSCE Edge • v4.2.1-prod
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#f4f6fa] pb-24">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Floating Bottom Status Dock matching design */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur-md text-white border border-slate-800 rounded-full shadow-2xl px-3 md:px-6 py-2.5 flex items-center space-x-3 md:space-x-6 text-xs max-w-[calc(100vw-24px)] overflow-hidden">
        {isStudent ? (
          <>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold tracking-tight">CSE-B MASTER SCHEDULE V4.2</span>
              <span className="px-1.5 py-0.2 bg-emerald-900/80 text-emerald-300 rounded text-[10px] font-bold">
                ACTIVE
              </span>
            </div>
            <span className="text-slate-400 text-[11px] hidden md:inline">
              Signed by Dean Academics (Dr. P. Jayashree)
            </span>
            <div className="flex items-center space-x-2 pl-4 border-l border-slate-700">
              <button className="px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-xs font-semibold cursor-pointer">
                Download PDF
              </button>
              <button className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-xs font-bold cursor-pointer">
                Full Timetable Grid
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="font-semibold text-slate-200">Active Engine Sys: 0 Hard Violations</span>
            </div>
            <span className="text-slate-400 hidden lg:inline">Next Recalculation: 12:00 PM</span>
            <div className="flex items-center space-x-2 pl-4 border-l border-slate-700">
              <NavLink
                to="/solver-studio"
                className="px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Run Timetable Solver Engine
              </NavLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

