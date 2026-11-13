import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { StudentDashboard } from './features/dashboard/StudentDashboard';
import { HODDashboard } from './features/dashboard/HODDashboard';
import { StudentTimetableGrid } from './features/timetable/StudentTimetableGrid';
import { SolverStudio } from './features/solver/SolverStudio';
import { CandidateComparison } from './features/candidates/CandidateComparison';
import { ConflictInspector } from './features/conflicts/ConflictInspector';
import { TimetableRepairCenter } from './features/repairs/TimetableRepairCenter';
import { ClassCommunicationCenter } from './features/communication/ClassCommunicationCenter';
import { ExaminationManagement } from './features/examinations/ExaminationManagement';
import { FacultyWorkload } from './features/workload/FacultyWorkload';
import { RoomManagement } from './features/rooms/RoomManagement';
import { NepScheme } from './features/nep/NepScheme';

const DashboardRouter: React.FC = () => {
  const { currentUser } = useAuth();
  if (currentUser.role === 'DEPT_HEAD' || currentUser.role === 'PLATFORM_ADMIN') {
    return <HODDashboard />;
  }
  return <StudentDashboard />;
};

const App: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/timetable" element={<StudentTimetableGrid />} />
        <Route path="/solver-studio" element={<SolverStudio />} />
        <Route path="/candidate-comparison" element={<CandidateComparison />} />
        <Route path="/conflict-inspector" element={<ConflictInspector />} />
        <Route path="/disruption-repair" element={<TimetableRepairCenter />} />
        <Route path="/communication" element={<ClassCommunicationCenter />} />
        <Route path="/examinations" element={<ExaminationManagement />} />
        {/* Full Resources & Infrastructure modules */}
        <Route path="/workload" element={<FacultyWorkload />} />
        <Route path="/rooms" element={<RoomManagement />} />
        <Route path="/nep-scheme" element={<NepScheme />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
};

const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center justify-center h-full min-h-[400px]">
    <div className="text-center space-y-3">
      <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mx-auto">
        <span className="text-2xl">🚧</span>
      </div>
      <h2 className="text-xl font-semibold text-slate-700">{title}</h2>
      <p className="text-sm text-slate-500">This module is under development.</p>
    </div>
  </div>
);

export default App;

