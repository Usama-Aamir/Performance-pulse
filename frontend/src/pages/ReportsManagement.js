import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { Search, Filter, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

const formatDate = (d) => { try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); } catch { return d; } };

const REVIEW_STATUSES = ['submitted', 'reviewed', 'needs_correction'];
const TASK_STATUSES = ['Completed', 'In Progress', 'Pending', 'Delayed'];

export default function ReportsManagement() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const [filters, setFilters] = useState({
    employee_id: '', review_status: '', task_status: '', date_from: '', date_to: ''
  });

  useEffect(() => {
    API.get('/users?role=employee&status=active')
      .then(res => setEmployees(res.data || []))
      .catch(() => {});
    fetchReports();
  }, []);

  const fetchReports = async (overrideFilters) => {
    setLoading(true);
    const f = overrideFilters || filters;
    const params = new URLSearchParams();
    if (f.employee_id) params.append('employee_id', f.employee_id);
    if (f.review_status) params.append('review_status', f.review_status);
    if (f.task_status) params.append('task_status', f.task_status);
    if (f.date_from) params.append('date_from', f.date_from);
    if (f.date_to) params.append('date_to', f.date_to);
    try {
      const res = await API.get(`/reports?${params}`);
      setReports(res.data || []);
    } catch (e) {} finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, val) => {
    const newFilters = { ...filters, [key]: val };
    setFilters(newFilters);
    fetchReports(newFilters);
  };

  const reviewReport = async (reportId, review_status) => {
    setActionLoading(reportId + review_status);
    try {
      await API.put(`/reports/${reportId}/review`, { review_status });
      fetchReports();
    } catch (e) {} finally {
      setActionLoading(null);
    }
  };

  const clearFilters = () => {
    const empty = { employee_id: '', review_status: '', task_status: '', date_from: '', date_to: '' };
    setFilters(empty);
    fetchReports(empty);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>Reports Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{reports.length} reports</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            data-testid="filter-employee"
            value={filters.employee_id}
            onChange={e => handleFilterChange('employee_id', e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Employees</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <select
            data-testid="filter-review-status"
            value={filters.review_status}
            onChange={e => handleFilterChange('review_status', e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Review Status</option>
            {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <select
            data-testid="filter-task-status"
            value={filters.task_status}
            onChange={e => handleFilterChange('task_status', e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Task Status</option>
            {TASK_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input
            data-testid="filter-date-from"
            type="date"
            value={filters.date_from}
            onChange={e => handleFilterChange('date_from', e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <input
              data-testid="filter-date-to"
              type="date"
              value={filters.date_to}
              onChange={e => handleFilterChange('date_to', e.target.value)}
              className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={clearFilters} className="px-3 py-2 text-xs border border-slate-300 rounded-md text-slate-600 hover:bg-slate-50 transition-colors">
              Clear
            </button>
          </div>
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500 text-sm">
            No reports match your filters
          </div>
        ) : (
          <div className="space-y-2" data-testid="reports-management-list">
            {reports.map(r => (
              <div key={r.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden" data-testid={`report-row-${r.id}`}>
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{r.employee_name || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{formatDate(r.report_date)} · {r.task_category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <StatusBadge status={r.task_status} />
                    <StatusBadge status={r.review_status} />
                    {expanded === r.id ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {expanded === r.id && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
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
                          <p className="text-slate-700">{r.blockers}</p>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4 text-slate-600">
                        <span>Calls: <strong className="text-slate-800">{r.calls_made}</strong></span>
                        <span>Follow-ups: <strong className="text-slate-800">{r.follow_ups}</strong></span>
                        <span>Leads: <strong className="text-slate-800">{r.interested_leads}</strong></span>
                      </div>
                    </div>

                    {/* Review actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <span className="text-xs text-slate-500 font-medium mr-1">Mark as:</span>
                      <button
                        data-testid={`mark-reviewed-${r.id}`}
                        disabled={!!actionLoading || r.review_status === 'reviewed'}
                        onClick={() => reviewReport(r.id, 'reviewed')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        {actionLoading === r.id + 'reviewed' ? '...' : 'Reviewed'}
                      </button>
                      <button
                        data-testid={`mark-correction-${r.id}`}
                        disabled={!!actionLoading || r.review_status === 'needs_correction'}
                        onClick={() => reviewReport(r.id, 'needs_correction')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        {actionLoading === r.id + 'needs_correction' ? '...' : 'Needs Correction'}
                      </button>
                      {r.review_status !== 'submitted' && (
                        <button
                          disabled={!!actionLoading}
                          onClick={() => reviewReport(r.id, 'submitted')}
                          className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition-colors disabled:opacity-50"
                        >
                          Reset
                        </button>
                      )}
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
