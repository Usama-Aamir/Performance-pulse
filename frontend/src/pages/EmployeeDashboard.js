import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/contexts/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import { Activity, ClipboardList, CheckCircle, LogOut, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';

const TASK_CATEGORIES = ['Admin Work', 'Letter Preparation', 'Client Calling', 'Digital Marketing', 'App Testing', 'Follow-up', 'Other'];
const TASK_STATUSES = ['Completed', 'In Progress', 'Pending', 'Delayed'];

const getMYTToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

const formatDate = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; }
};

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [todayReport, setTodayReport] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    morning_plan: '', afternoon_plan: '', final_report: '',
    task_category: 'Other', task_status: 'Completed',
    calls_made: 0, follow_ups: 0, interested_leads: 0,
    blockers: '', final_remarks: ''
  });

  const today = getMYTToday();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, recentRes] = await Promise.all([
        API.get('/reports/today'),
        API.get('/reports/my')
      ]);
      setTodayReport(todayRes.data?.report || null);
      setIsWorkingDay(todayRes.data?.is_working_day !== false);
      setRecentReports(recentRes.data?.slice(0, 5) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await API.post('/reports', form);
      setTodayReport(res.data);
      setSuccess(true);
      fetchData();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-800" />
          <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Performance Pulse</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            data-testid="nav-my-reports"
            onClick={() => navigate('/my-reports')}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">My Reports</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-800 text-xs font-semibold">{(user?.full_name || 'U')[0].toUpperCase()}</span>
            </div>
            <span className="text-sm text-slate-700 hidden sm:block">{user?.full_name}</span>
          </div>
          <button data-testid="nav-logout" onClick={handleLogout} className="text-slate-500 hover:text-slate-700 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {getGreeting()}, {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Today: <span className="font-medium text-slate-700">{formatDate(today)}</span>
            {!isWorkingDay && <span className="ml-2 text-amber-600 font-medium">(Non-working day)</span>}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : !isWorkingDay ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <ClipboardList className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h3 className="font-semibold text-amber-800 mb-1">No Report Required Today</h3>
            <p className="text-sm text-amber-700">Today is a non-working day. Reports are required Monday to Saturday.</p>
          </div>
        ) : todayReport ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="report-submitted-card">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Report Submitted</h3>
                <p className="text-xs text-slate-500">Submitted for {formatDate(todayReport.report_date)}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={todayReport.review_status} />
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Morning Plan</p>
                <p className="text-slate-700 whitespace-pre-line">{todayReport.morning_plan}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Afternoon Plan</p>
                <p className="text-slate-700 whitespace-pre-line">{todayReport.afternoon_plan || '—'}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Final Report</p>
                <p className="text-slate-700 whitespace-pre-line">{todayReport.final_report}</p>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div><span className="text-xs text-slate-400">Category: </span><span className="text-slate-700">{todayReport.task_category}</span></div>
                <div><span className="text-xs text-slate-400">Status: </span><StatusBadge status={todayReport.task_status} /></div>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div><span className="text-xs text-slate-400">Calls: </span><span className="font-medium text-slate-800">{todayReport.calls_made}</span></div>
                <div><span className="text-xs text-slate-400">Follow-ups: </span><span className="font-medium text-slate-800">{todayReport.follow_ups}</span></div>
                <div><span className="text-xs text-slate-400">Leads: </span><span className="font-medium text-slate-800">{todayReport.interested_leads}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="report-form-card">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Plus className="w-4 h-4 text-blue-800" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Submit Today's Report</h3>
                <p className="text-xs text-slate-500">Report for {formatDate(today)} — deadline 6 PM MYT</p>
              </div>
            </div>

            {error && (
              <div data-testid="report-error" className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Morning Planned Tasks <span className="text-red-500">*</span>
                  <span className="text-xs font-normal text-slate-400 ml-1">(9 AM – 12/1 PM)</span>
                </label>
                <textarea
                  data-testid="form-morning-plan"
                  required
                  rows={3}
                  value={form.morning_plan}
                  onChange={e => setForm(p => ({ ...p, morning_plan: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="What did you plan to work on this morning?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Afternoon Planned Tasks
                  <span className="text-xs font-normal text-slate-400 ml-1">(1/2 PM – 6 PM)</span>
                </label>
                <textarea
                  data-testid="form-afternoon-plan"
                  rows={3}
                  value={form.afternoon_plan}
                  onChange={e => setForm(p => ({ ...p, afternoon_plan: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="What did you plan to work on this afternoon?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Final Completed Work <span className="text-red-500">*</span>
                </label>
                <textarea
                  data-testid="form-final-report"
                  required
                  rows={4}
                  value={form.final_report}
                  onChange={e => setForm(p => ({ ...p, final_report: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Summarise what you actually completed today..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Task Category</label>
                  <select
                    data-testid="form-task-category"
                    value={form.task_category}
                    onChange={e => setForm(p => ({ ...p, task_category: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Task Status</label>
                  <select
                    data-testid="form-task-status"
                    value={form.task_status}
                    onChange={e => setForm(p => ({ ...p, task_status: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Calls Made</label>
                  <input
                    data-testid="form-calls"
                    type="number" min={0}
                    value={form.calls_made}
                    onChange={e => setForm(p => ({ ...p, calls_made: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Follow-ups</label>
                  <input
                    data-testid="form-followups"
                    type="number" min={0}
                    value={form.follow_ups}
                    onChange={e => setForm(p => ({ ...p, follow_ups: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Interested Leads</label>
                  <input
                    data-testid="form-leads"
                    type="number" min={0}
                    value={form.interested_leads}
                    onChange={e => setForm(p => ({ ...p, interested_leads: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Blockers / Issues</label>
                <textarea
                  data-testid="form-blockers"
                  rows={2}
                  value={form.blockers}
                  onChange={e => setForm(p => ({ ...p, blockers: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Any blockers or issues encountered?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Final Remarks</label>
                <textarea
                  data-testid="form-remarks"
                  rows={2}
                  value={form.final_remarks}
                  onChange={e => setForm(p => ({ ...p, final_remarks: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Any additional remarks..."
                />
              </div>

              <button
                data-testid="report-submit-btn"
                type="submit"
                disabled={submitting}
                className="w-full bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Daily Report'}
              </button>
            </form>
          </div>
        )}

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Recent Reports</h3>
              <button
                onClick={() => navigate('/my-reports')}
                className="text-xs text-blue-800 hover:text-blue-600 font-medium"
              >
                View all
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentReports.map(r => (
                <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{formatDate(r.report_date)}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{r.final_report?.substring(0, 60)}...</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={r.task_status} />
                    <StatusBadge status={r.review_status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
