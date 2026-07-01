import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { Users, UserCheck, FileText, AlertTriangle, Clock, Phone, TrendingUp, Search, ExternalLink, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const formatDate = (d) => { try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; } };

const StatCard = ({ icon: Icon, label, value, color = 'blue', highlight }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    slate: 'bg-slate-100 text-slate-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  return (
    <div className={`bg-white border rounded-lg p-4 flex items-start gap-4 shadow-sm ${highlight ? 'border-red-300' : 'border-slate-200'}`}
      data-testid={`stat-${label.toLowerCase().replace(/ /g, '-')}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${highlight ? 'text-red-600' : 'text-slate-900'}`}>{value ?? '—'}</p>
      </div>
    </div>
  );
};

export default function BossDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [missingData, setMissingData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [autoGenMsg, setAutoGenMsg] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, missingRes, empRes] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/dashboard/missing-today'),
        API.get('/users?role=employee&status=active')
      ]);
      setStats(statsRes.data);
      setMissingData(missingRes.data);
      setEmployees(empRes.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoGenerate = async () => {
    setAutoGenLoading(true);
    setAutoGenMsg('');
    try {
      const res = await API.post('/weekly-summaries/auto-generate', {});
      if (res.data.auto_generated) {
        setAutoGenMsg(`Generated ${res.data.count} summaries for week ${res.data.week_start} to ${res.data.week_end}`);
      } else {
        setAutoGenMsg(res.data.reason);
      }
    } catch (e) {
      setAutoGenMsg('Failed to auto-generate summaries');
    } finally {
      setAutoGenLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    !search || e.full_name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Boss Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {stats?.today ? formatDate(stats.today) : ''}
              {stats && !stats.is_working_day && <span className="ml-2 text-amber-600">(Non-working day)</span>}
            </p>
          </div>
          <button onClick={fetchAll} className="p-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="boss-stats">
              <StatCard icon={Users} label="Total Employees" value={stats?.total_employees} color="blue" />
              <StatCard icon={UserCheck} label="Active Employees" value={stats?.active_employees} color="emerald" />
              <StatCard icon={FileText} label="Reports Today" value={stats?.reports_today} color="purple" />
              <StatCard icon={AlertTriangle} label="Missing Today" value={stats?.missing_today}
                color="red" highlight={stats?.missing_today > 0} />
              <StatCard icon={Clock} label="Pending Approvals" value={stats?.pending_approvals} color="amber" />
              <StatCard icon={Phone} label="Calls This Week" value={stats?.total_calls_this_week} color="slate" />
              <StatCard icon={TrendingUp} label="Follow-ups This Week" value={stats?.total_followups_this_week} color="slate" />
              <StatCard icon={TrendingUp} label="Leads This Week" value={stats?.total_leads_this_week} color="slate" />
            </div>

            {/* Missing Reports Today */}
            {missingData?.is_working_day && missingData.missing_employees?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm" data-testid="missing-reports-section">
                <div className="p-4 border-b border-red-200 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <h2 className="font-semibold text-red-800 text-sm">
                    Missing Reports Today ({missingData.missing_employees.length})
                  </h2>
                  <span className="text-xs text-red-600 ml-auto">{formatDate(missingData.today)}</span>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {missingData.missing_employees.map(emp => (
                    <div
                      key={emp.id}
                      className="flex items-center gap-2 bg-white border border-red-200 rounded-md px-3 py-2 cursor-pointer hover:border-red-400 transition-colors"
                      onClick={() => navigate(`/employee/${emp.id}`)}
                      data-testid={`missing-${emp.id}`}
                    >
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-700 text-xs font-semibold">{(emp.full_name || 'U')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-800">{emp.full_name}</p>
                        <p className="text-xs text-red-600">{emp.department || emp.job_title || ''}</p>
                      </div>
                      <ExternalLink className="w-3 h-3 text-red-400 ml-1" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {missingData?.is_working_day === false && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                Today is a non-working day. Missing report tracking is paused.
              </div>
            )}

            {/* Weekly Summary Auto-Generate */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm">Weekly Summary Generation</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auto-generates on Saturday after 6 PM MYT. Current week: {stats?.week_start} to {stats?.week_end}
                </p>
                {autoGenMsg && <p className="text-xs text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded">{autoGenMsg}</p>}
              </div>
              <button
                data-testid="auto-generate-btn"
                onClick={handleAutoGenerate}
                disabled={autoGenLoading}
                className="px-4 py-2 text-sm bg-blue-800 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60 shrink-0"
              >
                {autoGenLoading ? 'Generating...' : 'Auto-Generate Summaries'}
              </button>
            </div>

            {/* Employee Search */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
                <h2 className="font-semibold text-slate-900 text-sm shrink-0">Active Employees ({employees.length})</h2>
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    data-testid="employee-search"
                    type="text"
                    placeholder="Search employee..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
              {filteredEmployees.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No employees found</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredEmployees.map(emp => (
                    <div
                      key={emp.id}
                      className="p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/employee/${emp.id}`)}
                      data-testid={`employee-row-${emp.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-blue-800 text-sm font-semibold">{(emp.full_name || 'U')[0].toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{emp.full_name}</p>
                          <p className="text-xs text-slate-500">{emp.department || ''} {emp.job_title ? `· ${emp.job_title}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={emp.status} />
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
