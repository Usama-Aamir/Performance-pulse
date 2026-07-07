import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShieldOff, Activity, LogOut } from 'lucide-react';

export default function AccessDenied() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const statusMessages = {
    rejected: {
      title: 'Account Rejected',
      message: 'Your account registration has been rejected by an administrator.',
      sub: 'If you believe this is a mistake, please contact your manager or HR.'
    },
    inactive: {
      title: 'Account Inactive',
      message: 'Your account has been deactivated.',
      sub: 'Please contact an administrator if you need to regain access.'
    }
  };

  const info = statusMessages[user?.status] || {
    title: 'Access Denied',
    message: 'You do not have permission to access this system.',
    sub: 'Please contact an administrator for assistance.'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" data-testid="access-denied-page">
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
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShieldOff className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {info.title}
          </h2>
          <p className="text-sm text-slate-600 mb-4">{info.message}</p>
          {user?.full_name && (
            <p className="text-sm text-slate-500 mb-4">
              Signed in as <span className="font-medium text-slate-700">{user.full_name}</span>
            </p>
          )}
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
            <p className="text-xs text-red-700">{info.sub}</p>
          </div>
          <button
            data-testid="access-denied-logout-btn"
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
