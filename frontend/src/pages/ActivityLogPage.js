import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { Calendar, Download, RefreshCw, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const ACTION_COLORS = {
  login: 'bg-blue-100 text-blue-800',
  logout: 'bg-blue-100 text-blue-800',
  login_failed: 'bg-red-100 text-red-800',
  report_submitted: 'bg-emerald-100 text-emerald-800',
  report_downloaded: 'bg-emerald-100 text-emerald-800',
  report_viewed: 'bg-emerald-100 text-emerald-800',
  clock_in: 'bg-purple-100 text-purple-800',
  clock_out: 'bg-purple-100 text-purple-800',
  auto_clock_out: 'bg-amber-100 text-amber-800',
  attendance_viewed: 'bg-purple-100 text-purple-800',
  user_created: 'bg-orange-100 text-orange-800',
  user_updated: 'bg-orange-100 text-orange-800',
  user_status_changed: 'bg-orange-100 text-orange-800',
  profile_updated: 'bg-orange-100 text-orange-800',
  dashboard_viewed: 'bg-slate-100 text-slate-800',
  reports_history_viewed: 'bg-emerald-100 text-emerald-800',
  attendance_history_viewed: 'bg-purple-100 text-purple-800',
};

const ACTION_LABELS = {
  login: 'Login',
  logout: 'Logout',
  login_failed: 'Login Failed',
  report_submitted: 'Report Submitted',
  report_downloaded: 'Report Downloaded',
  report_viewed: 'Report Viewed',
  clock_in: 'Clock In',
  clock_out: 'Clock Out',
  auto_clock_out: 'Auto Clock Out',
  attendance_viewed: 'Attendance Viewed',
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_status_changed: 'User Status Changed',
  profile_updated: 'Profile Updated',
  dashboard_viewed: 'Dashboard Viewed',
  reports_history_viewed: 'Reports History Viewed',
  attendance_history_viewed: 'Attendance History Viewed',
};

const ROLE_COLORS = {
  admin: 'bg-red-100 text-red-800',
  boss: 'bg-purple-100 text-purple-800',
  employee: 'bg-blue-100 text-blue-800',
};

const ActivityLogPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefreshing, setAutoRefreshing] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedAction, setSelectedAction] = useState('');

  const [page, setPage] = useState(0);
  const [totalLogs, setTotalLogs] = useState(0);
  const pageSize = 50;

  const [summary, setSummary] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        limit: pageSize,
        offset: page * pageSize,
        start_date: startDate,
        end_date: endDate,
      };
      if (selectedUser) params.user_id = selectedUser;
      if (selectedAction) params.action = selectedAction;

      const res = await API.get('/activity/logs', { params });
      setLogs(res.data || []);
      setTotalLogs(res.data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get('/activity/logs/summary', {
        params: { start_date: startDate, end_date: endDate }
      });
      setSummary(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
    fetchSummary();
  }, [startDate, endDate, selectedUser, selectedAction, page]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAutoRefreshing(true);
      fetchLogs();
      fetchSummary();
      setTimeout(() => setAutoRefreshing(false), 500);
    }, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate, selectedUser, selectedAction, page]);

  const handleQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setPage(0);
  };

  const exportToExcel = () => {
    const headers = ['Time', 'User', 'Role', 'Action', 'Target Type', 'Target ID', 'Details'];
    const rows = logs.map(log => [
      format(new Date(log.created_at), 'dd MMM yyyy, HH:mm'),
      log.user_name,
      log.user_role,
      ACTION_LABELS[log.action] || log.action,
      log.target_type || '',
      log.target_id || '',
      typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || ''),
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity_log_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (iso) => {
    try {
      return format(new Date(iso), 'dd MMM yyyy, HH:mm');
    } catch {
      return iso;
    }
  };

  const totalPages = Math.ceil(totalLogs / pageSize);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Activity Log</h1>
          <p className="text-slate-600 text-sm mt-1">Audit trail of all system actions</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(0); }}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(0); }}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">User</label>
              <select
                value={selectedUser}
                onChange={(e) => { setSelectedUser(e.target.value); setPage(0); }}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Users</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-medium text-slate-700 mb-1">Action</label>
              <select
                value={selectedAction}
                onChange={(e) => { setSelectedAction(e.target.value); setPage(0); }}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {Object.entries(ACTION_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleQuickRange(1)} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700">Today</button>
              <button onClick={() => handleQuickRange(7)} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700">Last 7 Days</button>
              <button onClick={() => handleQuickRange(30)} className="px-3 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-md text-slate-700">Last 30 Days</button>
            </div>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={() => { fetchLogs(); fetchSummary(); }}
              className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors ${autoRefreshing ? 'opacity-75' : ''}`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-slate-900">{summary.total_actions}</p>
              <p className="text-xs text-slate-500">Total Actions</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-slate-900">{summary.unique_users}</p>
              <p className="text-xs text-slate-500">Unique Users</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-slate-900">{summary.most_active_user?.name || '—'}</p>
              <p className="text-xs text-slate-500">Most Active User</p>
              <p className="text-xs text-slate-400 mt-1">{summary.most_active_user?.action_count || 0} actions</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
              <p className="text-2xl font-bold text-slate-900">{Object.keys(summary.action_breakdown || {}).length}</p>
              <p className="text-xs text-slate-500">Action Types</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Time</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Target</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-500">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">Loading...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No activity logs found</td></tr>
                ) : (
                  logs.map((log, i) => (
                    <tr key={log.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatTime(log.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{log.user_name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[log.user_role] || 'bg-slate-100 text-slate-800'}`}>
                            {log.user_role}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-800'}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.target_type ? (
                          <span className="text-slate-700">{log.target_type}</span>
                        ) : '—'}
                        {log.target_id && <span className="text-slate-400 text-xs ml-1">({log.target_id.slice(0, 8)}...)</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '—')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Showing {page * pageSize + 1} to {Math.min((page + 1) * pageSize, totalLogs)} of {totalLogs} entries
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-xs text-slate-600">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;
