import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { ArrowLeft, User, Briefcase, Calendar, FileText, BarChart2, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, Clock } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';

const formatDate = (d) => { try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; } };

export default function EmployeeProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [reports, setReports] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genLoading, setGenLoading] = useState(false);
  const [genMsg, setGenMsg] = useState('');
  const [expandedReport, setExpandedReport] = useState(null);
  const [expandedSummary, setExpandedSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('reports');
  const [attSummary, setAttSummary] = useState(null);
  const [weekInput, setWeekInput] = useState('');

  useEffect(() => {
    if (id) fetchAll();
  }, [id]);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [empRes, repsRes, sumRes, attRes] = await Promise.all([
        API.get(`/users/${id}`),
        API.get(`/reports/employee/${id}`),
        API.get(`/weekly-summaries/employee/${id}`),
        API.get(`/attendance/employee-summary/${id}`)
      ]);
      setEmployee(empRes.data);
      setReports(repsRes.data || []);
      setSummaries(sumRes.data || []);
      setAttSummary(attRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (weekStart) => {
    setGenLoading(true);
    setGenMsg('');
    try {
      const body = { employee_id: id };
      if (weekStart) {
        // Calculate week end (Saturday = Monday + 5 days)
        const start = new Date(weekStart + 'T00:00:00');
        const end = new Date(start);
        const dayOfWeek = start.getDay(); // 0=Sun, 1=Mon...
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(start);
        monday.setDate(start.getDate() + daysToMonday);
        const saturday = new Date(monday);
        saturday.setDate(monday.getDate() + 5);
        body.week_start = monday.toLocaleDateString('en-CA');
        body.week_end = saturday.toLocaleDateString('en-CA');
      }
      await API.post('/weekly-summaries/generate', body);
      setGenMsg('Summary generated successfully!');
      const sumRes = await API.get(`/weekly-summaries/employee/${id}`);
      setSummaries(sumRes.data || []);
    } catch (e) {
      setGenMsg('Failed to generate summary');
    } finally {
      setGenLoading(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-6 pt-16 md:pt-6 flex items-center justify-center text-slate-500 text-sm">
        Loading...
      </main>
    </div>
  );

  if (!employee) return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-6 pt-16 md:pt-6 text-center">
        <p className="text-slate-500">Employee not found</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-800 text-sm font-medium">Go back</button>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6 space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          data-testid="back-btn"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Profile Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-5" data-testid="employee-profile-card">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-blue-800 text-xl font-bold">{(employee.full_name || 'U')[0].toUpperCase()}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {employee.full_name}
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">{employee.email}</p>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <StatusBadge status={employee.status} />
                  <StatusBadge status={employee.role} />
                  {employee.department && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Briefcase className="w-3.5 h-3.5" /> {employee.department}
                    </span>
                  )}
                  {employee.job_title && (
                    <span className="text-xs text-slate-500">{employee.job_title}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400">
              <p>Joined</p>
              <p className="font-medium text-slate-600">{employee.created_at ? formatDate(employee.created_at.split('T')[0]) : '—'}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
              <p className="text-xs text-slate-500">Total Reports</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {reports.filter(r => r.task_status === 'Completed').length}
              </p>
              <p className="text-xs text-slate-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {reports.reduce((s, r) => s + (r.calls_made || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Total Calls</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {reports.reduce((s, r) => s + (r.interested_leads || 0), 0)}
              </p>
              <p className="text-xs text-slate-500">Total Leads</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <div className="flex gap-0">
            {['reports', 'weekly', 'attendance'].map(tab => (
              <button
                key={tab}
                data-testid={`tab-${tab}`}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? 'border-blue-800 text-blue-800'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'reports' ? `Report History (${reports.length})` : tab === 'weekly' ? `Weekly Summaries (${summaries.length})` : 'Attendance'}
              </button>
            ))}
          </div>
        </div>

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-2" data-testid="report-history">
            {reports.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm">
                <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No reports found for this employee.
              </div>
            ) : reports.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatDate(r.report_date)}</p>
                    <p className="text-xs text-slate-500">{r.task_category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.task_status} />
                    <StatusBadge status={r.review_status} />
                    {r.upload_source === 'excel' && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full">XLS</span>
                    )}
                    {r.submitted_after_6pm && (
                      <span className="text-xs text-amber-600 border border-amber-200 bg-amber-50 px-1.5 py-0.5 rounded">Late</span>
                    )}
                    {expandedReport === r.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {expandedReport === r.id && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Morning Plan</p>
                      <p className="text-slate-700 whitespace-pre-line">{r.morning_plan}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Afternoon Plan</p>
                      <p className="text-slate-700 whitespace-pre-line">{r.afternoon_plan || '—'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Final Report</p>
                      <p className="text-slate-700 whitespace-pre-line">{r.final_report}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-slate-600">
                      <span>Calls: <strong className="text-slate-800">{r.calls_made}</strong></span>
                      <span>Follow-ups: <strong className="text-slate-800">{r.follow_ups}</strong></span>
                      <span>Leads: <strong className="text-slate-800">{r.interested_leads}</strong></span>
                    </div>
                    {r.blockers && <div><p className="text-xs text-slate-400 mb-1">Blockers</p><p className="text-slate-700">{r.blockers}</p></div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Weekly Summaries Tab */}
        {activeTab === 'weekly' && (
          <div className="space-y-4" data-testid="weekly-summaries">
            {/* Generate controls */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Generate for week containing date</label>
                  <input
                    data-testid="week-date-input"
                    type="date"
                    value={weekInput}
                    onChange={e => setWeekInput(e.target.value)}
                    className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white w-full sm:w-auto"
                  />
                </div>
                <button
                  data-testid="generate-summary-btn"
                  onClick={() => generateSummary(weekInput)}
                  disabled={genLoading}
                  className="px-4 py-2 text-sm bg-blue-800 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {genLoading ? 'Generating...' : weekInput ? 'Generate for Selected Week' : 'Generate Current Week'}
                </button>
              </div>
              {genMsg && <p className="text-xs text-slate-600 mt-2 bg-slate-50 px-2 py-1.5 rounded border border-slate-200">{genMsg}</p>}
            </div>

            {summaries.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm">
                <BarChart2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No weekly summaries yet. Generate one using the button above.
              </div>
            ) : summaries.map(s => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedSummary(expandedSummary === s.id ? null : s.id)}
                  data-testid={`summary-${s.id}`}
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {formatDate(s.week_start)} — {formatDate(s.week_end)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {s.total_reports_submitted} reports submitted · {s.missing_days} missing
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {s.missing_days > 0 && (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                        <AlertTriangle className="w-3 h-3" /> {s.missing_days} missing
                      </span>
                    )}
                    {expandedSummary === s.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>
                {expandedSummary === s.id && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div className="bg-white border border-slate-200 rounded-md p-3 text-center">
                        <p className="text-xl font-bold text-slate-900">{s.total_reports_submitted}</p>
                        <p className="text-xs text-slate-500">Reports</p>
                      </div>
                      <div className="bg-white border border-red-200 rounded-md p-3 text-center">
                        <p className="text-xl font-bold text-red-600">{s.missing_days}</p>
                        <p className="text-xs text-slate-500">Missing</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md p-3 text-center">
                        <p className="text-xl font-bold text-blue-600">{s.total_calls}</p>
                        <p className="text-xs text-slate-500">Calls</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-md p-3 text-center">
                        <p className="text-xl font-bold text-purple-600">{s.total_interested_leads}</p>
                        <p className="text-xs text-slate-500">Leads</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="bg-emerald-50 rounded-md p-2.5 text-center">
                        <p className="font-bold text-emerald-700">{s.completed_count}</p>
                        <p className="text-xs text-emerald-600">Completed</p>
                      </div>
                      <div className="bg-blue-50 rounded-md p-2.5 text-center">
                        <p className="font-bold text-blue-700">{s.in_progress_count}</p>
                        <p className="text-xs text-blue-600">In Progress</p>
                      </div>
                      <div className="bg-amber-50 rounded-md p-2.5 text-center">
                        <p className="font-bold text-amber-700">{s.pending_count}</p>
                        <p className="text-xs text-amber-600">Pending</p>
                      </div>
                      <div className="bg-red-50 rounded-md p-2.5 text-center">
                        <p className="font-bold text-red-700">{s.delayed_count}</p>
                        <p className="text-xs text-red-600">Delayed</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Compiled Summary</p>
                      <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-md p-3 whitespace-pre-line leading-relaxed">
                        {s.compiled_summary}
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">Follow-ups: {s.total_follow_ups}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="space-y-4" data-testid="attendance-summary-tab">
            {!attSummary ? (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-sm">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                No attendance data available for this employee.
              </div>
            ) : (
              <>
                {/* Monthly Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* This Month */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-3">This Month</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-emerald-600">{attSummary.this_month.present_days}</p>
                        <p className="text-xs text-slate-500">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-red-600">{attSummary.this_month.absent_days}</p>
                        <p className="text-xs text-slate-500">Absent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-600">{attSummary.this_month.late_count}</p>
                        <p className="text-xs text-slate-500">Late</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-blue-600">{attSummary.this_month.avg_working_hours}h</p>
                        <p className="text-xs text-slate-500">Avg Hours</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-purple-600">{attSummary.this_month.auto_clock_out_count}</p>
                        <p className="text-xs text-slate-500">Auto Out</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-700">{attSummary.this_month.present_percentage}%</p>
                        <p className="text-xs text-slate-500">Present %</p>
                      </div>
                    </div>
                  </div>

                  {/* Last Month */}
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-3">Last Month</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-emerald-600">{attSummary.last_month.present_days}</p>
                        <p className="text-xs text-slate-500">Present</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-red-600">{attSummary.last_month.absent_days}</p>
                        <p className="text-xs text-slate-500">Absent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-600">{attSummary.last_month.late_count}</p>
                        <p className="text-xs text-slate-500">Late</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-blue-600">{attSummary.last_month.avg_working_hours}h</p>
                        <p className="text-xs text-slate-500">Avg Hours</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-purple-600">{attSummary.last_month.auto_clock_out_count}</p>
                        <p className="text-xs text-slate-500">Auto Out</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-slate-700">{attSummary.last_month.present_percentage}%</p>
                        <p className="text-xs text-slate-500">Present %</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overall Rating */}
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Overall Rating (This Month)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Based on attendance rate and punctuality</p>
                  </div>
                  <span className={`text-sm font-bold px-4 py-2 rounded-full ${
                    attSummary.this_month.rating === 'Excellent' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    attSummary.this_month.rating === 'Good' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-amber-50 text-amber-700 border border-amber-200'
                  }`} data-testid="attendance-rating">
                    {attSummary.this_month.rating}
                  </span>
                </div>

                {/* Daily Hours Chart */}
                {attSummary.daily_hours.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-4">Daily Working Hours (This Month)</h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={attSummary.daily_hours}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(d) => d.substring(8)}
                        />
                        <YAxis tick={{ fontSize: 11 }} unit="h" />
                        <Tooltip
                          formatter={(v) => [`${v}h`, 'Working Hours']}
                          labelFormatter={(d) => formatDate(d)}
                        />
                        <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
