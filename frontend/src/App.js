import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/pages/LoginPage';
import WaitingApproval from '@/pages/WaitingApproval';
import AccessDenied from '@/pages/AccessDenied';
import EmployeeDashboard from '@/pages/EmployeeDashboard';
import MyReports from '@/pages/MyReports';
import AdminDashboard from '@/pages/AdminDashboard';
import EmployeeManagement from '@/pages/EmployeeManagement';
import ReportsManagement from '@/pages/ReportsManagement';
import BossDashboard from '@/pages/BossDashboard';
import AttendancePage from '@/pages/AttendancePage';
import AttendanceHistoryPage from '@/pages/AttendanceHistoryPage';
import ReportsHistoryPage from '@/pages/ReportsHistoryPage';
import ActivityLogPage from '@/pages/ActivityLogPage';
import EmployeeProfile from '@/pages/EmployeeProfile';
import MyProfile from '@/pages/MyProfile';
import LeaveRequestsPage from '@/pages/LeaveRequestsPage';
import LeaveManagementPage from '@/pages/LeaveManagementPage';
import MonthlyAttendanceReportPage from '@/pages/MonthlyAttendanceReportPage';
import '@/App.css';

const Spinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-blue-800 border-t-transparent rounded-full animate-spin" />
  </div>
);

const RoleRedirect = () => {
  const { user } = useAuth();
  if (user === undefined) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'pending') return <Navigate to="/waiting-approval" replace />;
  if (user.status === 'rejected' || user.status === 'inactive') return <Navigate to="/access-denied" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'boss') return <Navigate to="/boss" replace />;
  return <Navigate to="/dashboard" replace />;
};

const ProtectedRoute = ({ children, roles }) => {
  const { user } = useAuth();
  if (user === undefined) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.status === 'pending') return <Navigate to="/waiting-approval" replace />;
  if (user.status === 'rejected' || user.status === 'inactive') return <Navigate to="/access-denied" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user === undefined) return <Spinner />;
  if (user) return <RoleRedirect />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/waiting-approval" element={<WaitingApproval />} />
          <Route path="/access-denied" element={<AccessDenied />} />

          {/* Employee */}
          <Route path="/dashboard" element={<ProtectedRoute roles={['employee']}><EmployeeDashboard /></ProtectedRoute>} />
          <Route path="/my-reports" element={<ProtectedRoute roles={['employee']}><MyReports /></ProtectedRoute>} />
          <Route path="/leave-requests" element={<ProtectedRoute roles={['employee']}><LeaveRequestsPage /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/employees" element={<ProtectedRoute roles={['admin']}><EmployeeManagement /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><ReportsManagement /></ProtectedRoute>} />

          {/* Boss */}
          <Route path="/boss" element={<ProtectedRoute roles={['boss']}><BossDashboard /></ProtectedRoute>} />

          {/* Attendance (admin + boss) */}
          <Route path="/attendance" element={<ProtectedRoute roles={['admin', 'boss']}><AttendancePage /></ProtectedRoute>} />
          <Route path="/attendance/history" element={<ProtectedRoute roles={['admin', 'boss']}><AttendanceHistoryPage /></ProtectedRoute>} />
          <Route path="/reports/history" element={<ProtectedRoute roles={['admin', 'boss']}><ReportsHistoryPage /></ProtectedRoute>} />
          <Route path="/leave-management" element={<ProtectedRoute roles={['admin', 'boss']}><LeaveManagementPage /></ProtectedRoute>} />
          <Route path="/monthly-attendance" element={<ProtectedRoute roles={['admin', 'boss']}><MonthlyAttendanceReportPage /></ProtectedRoute>} />
          <Route path="/admin/activity-log" element={<ProtectedRoute roles={['admin', 'boss']}><ActivityLogPage /></ProtectedRoute>} />

          {/* Shared: Employee Profile (admin + boss) */}
          <Route path="/employee/:id" element={<ProtectedRoute roles={['admin', 'boss']}><EmployeeProfile /></ProtectedRoute>} />

          {/* My Profile (all active roles) */}
          <Route path="/my-profile" element={<ProtectedRoute roles={['employee', 'admin', 'boss']}><MyProfile /></ProtectedRoute>} />

          <Route path="/" element={<RoleRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
