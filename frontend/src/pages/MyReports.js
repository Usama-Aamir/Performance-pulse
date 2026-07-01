import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/contexts/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import { Activity, LogOut, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

const formatDate = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; }
};

export default function MyReports() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    API.get('/reports/my')
      .then(res => setReports(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-800" />
            <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Manrope, sans-serif' }}>Performance Pulse</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-600 font-medium">My Reports</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Dashboard</button>
          <button data-testid="nav-logout" onClick={handleLogout} className="text-slate-500 hover:text-slate-700">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>My Reports</h1>
            <p className="text-sm text-slate-500 mt-0.5">{reports.length} report{reports.length !== 1 ? 's' : ''} total</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium">No reports yet</p>
            <p className="text-sm text-slate-400 mt-1">Submit your first daily report from the dashboard.</p>
            <button onClick={() => navigate('/dashboard')} className="mt-4 text-sm text-blue-800 hover:text-blue-600 font-medium">Go to Dashboard</button>
          </div>
        ) : (
          <div className="space-y-3" data-testid="reports-list">
            {reports.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden" data-testid={`report-item-${r.id}`}>
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{formatDate(r.report_date)}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{r.task_category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.task_status} />
                    <StatusBadge status={r.review_status} />
                    {expanded === r.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {expanded === r.id && (
                  <div className="border-t border-slate-200 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50">
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
                    {r.blockers && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Blockers</p>
                        <p className="text-slate-700 whitespace-pre-line">{r.blockers}</p>
                      </div>
                    )}
                    {r.final_remarks && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Final Remarks</p>
                        <p className="text-slate-700 whitespace-pre-line">{r.final_remarks}</p>
                      </div>
                    )}
                    <div className="flex gap-4 flex-wrap">
                      <span className="text-slate-500">Calls: <strong className="text-slate-800">{r.calls_made}</strong></span>
                      <span className="text-slate-500">Follow-ups: <strong className="text-slate-800">{r.follow_ups}</strong></span>
                      <span className="text-slate-500">Leads: <strong className="text-slate-800">{r.interested_leads}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
