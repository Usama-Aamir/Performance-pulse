import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { Users, UserCheck, AlertTriangle, FileText, Phone, TrendingUp, ClipboardList, Clock } from 'lucide-react';
import { format } from 'date-fns';

const formatDate = (d) => { try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; } };

const StatCard = ({ icon: Icon, label, value, color = 'blue', sub }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-4 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [recentReports, setRecentReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, reportsRes] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/users?status=pending'),
        API.get('/reports?review_status=submitted')
      ]);
      setStats(statsRes.data);
      setPendingUsers(pendingRes.data || []);
      setRecentReports((reportsRes.data || []).slice(0, 5));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId) => {
    setActionLoading(userId + '-approve');
    try {
      await API.put(`/users/${userId}/status`, { status: 'active' });
      fetchAll();
    } catch (e) {} finally {
      setActionLoading(null);
    }
  };

  const rejectUser = async (userId) => {
    setActionLoading(userId + '-reject');
    try {
      await API.put(`/users/${userId}/status`, { status: 'rejected' });
      fetchAll();
    } catch (e) {} finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {stats?.today ? formatDate(stats.today) : ''}
            {stats && !stats.is_working_day && <span className="ml-2 text-amber-600">(Non-working day)</span>}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-stats">
              <StatCard icon={Users} label="Total Employees" value={stats?.total_employees} color="blue" />
              <StatCard icon={UserCheck} label="Active Employees" value={stats?.active_employees} color="emerald" />
              <StatCard icon={Clock} label="Pending Approvals" value={stats?.pending_approvals} color="amber" />
              <StatCard icon={FileText} label="Reports Today" value={stats?.reports_today} color="purple"
                sub={stats?.is_working_day && stats?.missing_today > 0 ? `${stats.missing_today} missing` : undefined} />
            </div>

            {/* Weekly Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Phone} label="Calls This Week" value={stats?.total_calls_this_week} color="slate" />
              <StatCard icon={TrendingUp} label="Follow-ups This Week" value={stats?.total_followups_this_week} color="slate" />
              <StatCard icon={TrendingUp} label="Leads This Week" value={stats?.total_leads_this_week} color="slate" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Approvals */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="pending-approvals-section">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-sm">Pending Approvals ({pendingUsers.length})</h2>
                  <button onClick={() => navigate('/admin/employees')} className="text-xs text-blue-800 hover:text-blue-600 font-medium">
                    View all employees
                  </button>
                </div>
                {pendingUsers.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">No pending approvals</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {pendingUsers.map(u => (
                      <div key={u.id} className="p-3 flex items-center justify-between" data-testid={`pending-user-${u.id}`}>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                          {u.department && <p className="text-xs text-slate-400">{u.department}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button
                            data-testid={`approve-btn-${u.id}`}
                            disabled={!!actionLoading}
                            onClick={() => approveUser(u.id)}
                            className="px-2.5 py-1 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === u.id + '-approve' ? '...' : 'Approve'}
                          </button>
                          <button
                            data-testid={`reject-btn-${u.id}`}
                            disabled={!!actionLoading}
                            onClick={() => rejectUser(u.id)}
                            className="px-2.5 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === u.id + '-reject' ? '...' : 'Reject'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Reports Needing Review */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-sm">Recent Reports (Unreviewed)</h2>
                  <button onClick={() => navigate('/admin/reports')} className="text-xs text-blue-800 hover:text-blue-600 font-medium">View all</button>
                </div>
                {recentReports.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 text-sm">No unreviewed reports</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {recentReports.map(r => (
                      <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => navigate('/admin/reports')}>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{r.employee_name || 'Employee'}</p>
                          <p className="text-xs text-slate-500">{formatDate(r.report_date)}</p>
                        </div>
                        <div className="flex gap-2">
                          <StatusBadge status={r.task_status} />
                          <StatusBadge status={r.review_status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
