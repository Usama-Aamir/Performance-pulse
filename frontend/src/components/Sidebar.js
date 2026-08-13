import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard, Users, FileText, LogOut, Activity, Menu, X, User, Clock, Calendar, TrendingUp
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/employees', icon: Users, label: 'Employees' },
    { to: '/admin/reports', icon: FileText, label: 'Reports' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/leave-management', icon: Calendar, label: 'Leave Management' },
    { to: '/monthly-attendance', icon: TrendingUp, label: 'Monthly Report' },
    { to: '/my-profile', icon: User, label: 'My Profile' },
  ];

  const bossLinks = [
    { to: '/boss', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/attendance', icon: Clock, label: 'Attendance' },
    { to: '/leave-management', icon: Calendar, label: 'Leave Management' },
    { to: '/monthly-attendance', icon: TrendingUp, label: 'Monthly Report' },
    { to: '/my-profile', icon: User, label: 'My Profile' },
  ];

  const links = user?.role === 'boss' ? bossLinks : adminLinks;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const NavContent = () => (
    <>
      <div className="p-5 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-800" />
          <span className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Performance Pulse
          </span>
        </div>
        <button className="md:hidden" onClick={() => setMobileOpen(false)}>
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>
      <div className="px-3 py-2 border-b border-slate-100">
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-400">
          {user?.role === 'boss' ? 'Boss View' : 'Admin View'}
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {links.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              data-testid={`sidebar-link-${link.label.toLowerCase().replace(' ', '-')}`}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <link.icon className={`w-4 h-4 ${isActive ? 'text-blue-800' : 'text-slate-400'}`} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-blue-800 text-sm font-semibold">
              {(user?.full_name || 'U')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.full_name}</p>
            <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          data-testid="sidebar-logout-btn"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-md shadow-sm"
        onClick={() => setMobileOpen(true)}
        data-testid="sidebar-mobile-toggle"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/30" onClick={() => setMobileOpen(false)} />
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-white border-r border-slate-200 h-screen fixed flex-col z-10 top-0 left-0">
        <NavContent />
      </aside>

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed top-0 left-0 z-50 w-60 h-screen bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <NavContent />
      </aside>
    </>
  );
};

export default Sidebar;
