import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { Search, ChevronDown, UserCog, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';

const ROLES = ['employee', 'admin', 'boss'];
const STATUSES = ['active', 'inactive', 'rejected', 'pending'];
const DEPARTMENTS = ['Sales', 'Marketing', 'Operations', 'IT', 'HR', 'Management', 'Other'];

const formatDate = (d) => { try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; } };

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterRole) params.append('role', filterRole);
      const res = await API.get(`/users?${params}`);
      setUsers(res.data || []);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [filterStatus, filterRole]);

  const updateStatus = async (userId, status) => {
    setActionLoading(userId + status);
    try {
      await API.put(`/users/${userId}/status`, { status });
      fetchUsers();
    } catch (e) {} finally { setActionLoading(null); }
  };

  const updateRole = async (userId, role) => {
    setActionLoading(userId + 'role');
    try {
      await API.put(`/users/${userId}/role`, { role });
      fetchUsers();
    } catch (e) {} finally { setActionLoading(null); }
  };

  const filtered = users.filter(u =>
    !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Employee Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">{users.length} users total</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              data-testid="user-search"
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <select
            data-testid="filter-status"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <select
            data-testid="filter-role"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
          </select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="users-table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Name</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Department</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Status</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Role</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Joined</th>
                  <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider py-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-sm">Loading...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-500 text-sm">No users found</td></tr>
                ) : filtered.map(u => (
                  <tr key={u.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors" data-testid={`user-row-${u.id}`}>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-900">{u.full_name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                      {u.job_title && <p className="text-xs text-slate-400">{u.job_title}</p>}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-700">{u.department || '—'}</td>
                    <td className="py-3 px-4"><StatusBadge status={u.status} /></td>
                    <td className="py-3 px-4">
                      <select
                        data-testid={`role-select-${u.id}`}
                        value={u.role}
                        disabled={!!actionLoading}
                        onChange={e => updateRole(u.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 capitalize"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">{u.created_at ? formatDate(u.created_at) : '—'}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {u.status === 'pending' && (
                          <>
                            <button
                              data-testid={`approve-${u.id}`}
                              disabled={!!actionLoading}
                              onClick={() => updateStatus(u.id, 'active')}
                              className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              data-testid={`reject-${u.id}`}
                              disabled={!!actionLoading}
                              onClick={() => updateStatus(u.id, 'rejected')}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {u.status === 'active' && (
                          <button
                            data-testid={`deactivate-${u.id}`}
                            disabled={!!actionLoading}
                            onClick={() => updateStatus(u.id, 'inactive')}
                            className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors disabled:opacity-50"
                          >
                            Deactivate
                          </button>
                        )}
                        {(u.status === 'inactive' || u.status === 'rejected') && (
                          <button
                            data-testid={`activate-${u.id}`}
                            disabled={!!actionLoading}
                            onClick={() => updateStatus(u.id, 'active')}
                            className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50"
                          >
                            Activate
                          </button>
                        )}
                        {u.role !== 'boss' && (
                          <button
                            data-testid={`view-profile-${u.id}`}
                            onClick={() => navigate(`/employee/${u.id}`)}
                            className="px-2 py-1 text-xs bg-blue-50 text-blue-800 rounded hover:bg-blue-100 transition-colors flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Profile
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
