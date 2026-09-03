import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import {
  Users, UserCheck, FileText, AlertTriangle, Clock,
  Phone, TrendingUp, Search, ExternalLink, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const formatDate = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); }
  catch { return d; }
};

const formatDateTimeMyt = (isoString) => {
  if (!isoString) return '-';
  try {
    return new Date(isoString).toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
};

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
    <div
      className={`bg-white border rounded-lg p-4 flex items-start gap-4 shadow-sm ${highlight ? 'border-red-300' : 'border-slate-200'}`}
      data-testid={`stat-${label.toLowerCase().replace(/ /g, '-')}`}
    >
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

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-3">
    <h2 className="font-semibold text-slate-900 text-sm">{title}</h2>
    {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
  </div>
);

export default function BossDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [missingData, setMissingData] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [autoGenMsg, setAutoGenMsg] = useState('');
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    API.get('/meetings/upcoming')
      .then(res => setUpcomingMeetings(res.data || []))
      .catch(() => {});
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, missingRes, empRes, chartRes, attRes] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/dashboard/missing-today'),
        API.get('/users?role=employee&status=active'),
        API.get('/dashboard/boss-charts'),
        API.get('/dashboard/attendance-summary'),
      ]);
      setStats(statsRes.data);
      setMissingData(missingRes.data);
      setEmployees(empRes.data || []);
      setChartData(chartRes.data);
      setAttendanceData(attRes.data);
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
    !search ||
    e.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  );

  // Fetch per-employee attendance for badges
  const [empAttendance, setEmpAttendance] = useState(null);
  useEffect(() => {
    API.get('/attendance/all-today').then(res => setEmpAttendance(res.data)).catch(() => {});
  }, []);

  const empAttMap = React.useMemo(() => {
    if (!empAttendance) return {};
    const map = {};
    (empAttendance.attendance || []).forEach(a => {
      map[a.employee_id] = a;
    });
    return map;
  }, [empAttendance]);

  // Build activity chart data from stats
  const activityData = stats ? [
    { name: 'Calls', value: stats.total_calls_this_week, fill: '#3b82f6' },
    { name: 'Follow-ups', value: stats.total_followups_this_week, fill: '#8b5cf6' },
    { name: 'Leads', value: stats.total_leads_this_week, fill: '#10b981' },
  ] : [];

  // Submitted vs Missing
  const reportStatusData = stats ? [
    { name: 'Submitted', value: stats.reports_today, fill: '#10b981' },
    { name: 'Missing', value: stats.missing_today, fill: '#ef4444' },
  ] : [];

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Boss Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {stats?.today ? formatDate(stats.today) : ''}
              {stats && !stats.is_working_day && (
                <span className="ml-2 text-amber-600">(Non-working day)</span>
              )}
            </p>
          </div>
          <button
            onClick={fetchAll}
            className="p-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors"
            title="Refresh"
            data-testid="refresh-btn"
          >
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
              <StatCard icon={Clock} label="Currently Working" value={attendanceData?.still_working ?? 0} color="blue" />
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

            {/* Upcoming Meetings */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="upcoming-meetings-section">
              <div className="p-4 border-b border-slate-200 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-slate-900 text-sm">Upcoming Meetings</h2>
              </div>
              {upcomingMeetings.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">No upcoming meetings</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {upcomingMeetings.slice(0, 5).map(meeting => (
                    <div key={meeting.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {meeting.employee_name || 'Employee'} — {meeting.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          With: {meeting.meeting_with} · {formatDateTimeMyt(meeting.start_at)}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{meeting.purpose}</p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 shrink-0">
                        {meeting.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="boss-charts">

              {/* Task Status Breakdown */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <SectionHeader
                  title="Task Status Breakdown"
                  subtitle={`This week (${chartData?.week_start} – ${chartData?.week_end})`}
                />
                {chartData?.task_breakdown?.every(d => d.count === 0) ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                    No report data for this week yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData?.task_breakdown || []} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                        formatter={(v) => [v, 'Reports']}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {(chartData?.task_breakdown || []).map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Team Activity This Week */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <SectionHeader
                  title="Team Activity This Week"
                  subtitle="Calls, follow-ups, and interested leads"
                />
                {activityData.every(d => d.value === 0) ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                    No activity recorded yet this week
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={activityData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                        formatter={(v, n) => [v, n]}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {activityData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Submitted vs Missing Today */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <SectionHeader title="Submitted vs Missing Today" subtitle="Today's report coverage" />
                {reportStatusData.every(d => d.value === 0) ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                    No data yet for today
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={reportStatusData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                        formatter={(v) => [v, 'Employees']}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {reportStatusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Weekly Performance Score Trend */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                <SectionHeader
                  title="Weekly Performance Score Trend"
                  subtitle="Avg team score across last 6 weeks (0–100)"
                />
                {chartData?.score_trend?.every(d => d.avg_score === 0) ? (
                  <div className="h-44 flex items-center justify-center text-slate-400 text-sm">
                    Generate weekly summaries to see score trends
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData?.score_trend || []} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}
                        formatter={(v) => [`${v}/100`, 'Avg Score']}
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_score"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#3b82f6' }}
                        activeDot={{ r: 6 }}
                        name="Avg Score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Weekly Summary Auto-Generate */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm">Weekly Summary Generation</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Auto-generates on Saturday after 6 PM MYT. Current week: {stats?.week_start} to {stats?.week_end}
                </p>
                {autoGenMsg && (
                  <p className="text-xs text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded">{autoGenMsg}</p>
                )}
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
                <h2 className="font-semibold text-slate-900 text-sm shrink-0">
                  Active Employees ({employees.length})
                </h2>
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
                        {empAttMap[emp.id] ? (
                          empAttMap[emp.id].status === 'working' ? (
                            <span className="flex items-center gap-1 text-xs font-medium text-blue-600" data-testid={`emp-att-${emp.id}`}>
                              <span className="w-2 h-2 bg-blue-500 rounded-full" /> Working
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-medium text-emerald-600" data-testid={`emp-att-${emp.id}`}>
                              <span className="w-2 h-2 bg-emerald-500 rounded-full" /> Completed
                            </span>
                          )
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-400" data-testid={`emp-att-${emp.id}`}>
                            <span className="w-2 h-2 bg-slate-300 rounded-full" /> Not Clocked In
                          </span>
                        )}
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
