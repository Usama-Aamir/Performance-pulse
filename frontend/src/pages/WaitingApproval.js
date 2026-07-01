import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Clock, Activity, LogOut } from 'lucide-react';

export default function WaitingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" data-testid="waiting-approval-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-800" />
            <span className="font-bold text-slate-900 text-lg" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Performance Pulse
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Pending Approval
          </h2>
          <p className="text-sm text-slate-600 mb-2">
            Your account is awaiting admin approval.
          </p>
          {user?.full_name && (
            <p className="text-sm text-slate-500 mb-4">
              Signed in as <span className="font-medium text-slate-700">{user.full_name}</span>
            </p>
          )}
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-6 text-left">
            <p className="text-xs text-amber-800">
              An administrator needs to review and activate your account before you can access the system. Please contact your manager if this is taking too long.
            </p>
          </div>
          <button
            data-testid="waiting-logout-btn"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mx-auto transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
