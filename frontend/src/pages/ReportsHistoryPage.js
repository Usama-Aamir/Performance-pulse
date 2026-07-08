import React, { useState, useEffect, useCallback } from 'react';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import {
  Calendar, FileText, CheckCircle, XCircle, TrendingUp, Award,
  Download, ChevronLeft, ChevronRight, X, Eye, Phone, Users
} from 'lucide-react';
import { format } from 'date-fns';

const formatDate = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); }
  catch { return d; }
};

const formatDateTime = (dt) => {
  if (!dt) return '—';
  try { return format(new Date(dt), 'dd MMM yyyy, HH:mm'); }
  catch { return dt; }
};

const getMYTToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

const getDateNDaysAgo = (n) => {
  const d = new Date(getMYTToday() + 'T00:00:00');
  d.setDate(d.getDate() - n);
  return d.toLocaleDateString('en-CA');
};

const getFirstOfMonth = () => {
  const today = getMYTToday();
  return today.substring(0, 8) + '01';
};

const getYesterday = () => getDateNDaysAgo(1);

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    purple: 'bg-purple-50 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-4 shadow-sm"
      data-testid={`reports-stat-${label.toLowerCase().replace(/ /g, '-')}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-2xl font-bold mt-0.5 text-slate-900 truncate">{value ?? '—'}</p>
      </div>
    </div>
  );
};

export default function ReportsHistoryPage() {
  const [startDate, setStartDate] = useState(getDateNDaysAgo(7));
  const [endDate, setEndDate] = useState(getMYTToday());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportDetail, setReportDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => {
    API.get('/users?role=employee&status=active').then(res => setEmployees(res.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        status: statusFilter,
      };
      if (selectedEmployee) params.employee_id = selectedEmployee;
      const [histRes, sumRes] = await Promise.all([
        API.get('/reports/history', { params }),
        API.get('/reports/history/summary', { params: { start_date: startDate, end_date: endDate, ...(selectedEmployee && { employee_id: selectedEmployee }) } }),
      ]);
      setRecords(histRes.data || []);
      setSummary(sumRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedEmployee, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setQuickRange = (range) => {
    const today = getMYTToday();
    if (range === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (range === 'yesterday') {
      const y = getYesterday();
      setStartDate(y);
      setEndDate(y);
    } else if (range === 'last7') {
      setStartDate(getDateNDaysAgo(7));
      setEndDate(today);
    } else if (range === 'last30') {
      setStartDate(getDateNDaysAgo(30));
      setEndDate(today);
    } else if (range === 'thisMonth') {
      setStartDate(getFirstOfMonth());
      setEndDate(today);
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'date') cmp = (a.report_date || '').localeCompare(b.report_date || '');
    else if (sortBy === 'employee_name') cmp = (a.employee_name || '').localeCompare(b.employee_name || '');
    else if (sortBy === 'submitted_at') cmp = (a.submitted_at || '').localeCompare(b.submitted_at || '');
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sortedRecords.length / PAGE_SIZE);
  const paginatedRecords = sortedRecords.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
    setPage(0);
  };

  const viewReportDetail = async (reportId) => {
    if (!reportId) return;
    setSelectedReport(reportId);
    setDetailLoading(true);
    setReportDetail(null);
    try {
      const res = await API.get(`/reports/${reportId}`);
      setReportDetail(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setDetailLoading(false);
    }
  };

  const exportToExcel = () => {
    const headers = ['Date', 'Employee Name', 'Department', 'Task Category', 'Task Status', 'Calls Made', 'Leads Contacted', 'Status', 'Submitted At'];
    const rows = sortedRecords.map(r => [
      r.report_date, r.employee_name, r.department || '',
      r.task_category || '', r.task_status || '',
      r.calls_made ?? '', r.interested_leads ?? '',
      r.report_status, r.submitted_at || ''
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Reports History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Browse and review employee daily reports</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4" data-testid="reports-filters">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                data-testid="reports-start-date"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                data-testid="reports-end-date"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Employee</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                data-testid="reports-employee-filter"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="reports-status-filter"
              >
                <option value="all">All</option>
                <option value="submitted">Submitted</option>
                <option value="missing">Missing</option>
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              data-testid="reports-apply-btn"
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Quick:</span>
            {[
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'last7', label: 'Last 7 Days' },
              { key: 'last30', label: 'Last 30 Days' },
              { key: 'thisMonth', label: 'This Month' },
            ].map(r => (
              <button
                key={r.key}
                onClick={() => setQuickRange(r.key)}
                className="text-xs px-3 py-1 border border-slate-200 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                data-testid={`reports-quick-${r.key}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="reports-summary-cards">
            <StatCard icon={Calendar} label="Expected" value={summary.total_expected} color="slate" />
            <StatCard icon={CheckCircle} label="Submitted" value={summary.total_submitted} color="emerald" />
            <StatCard icon={XCircle} label="Missing" value={summary.total_missing} color="red" />
            <StatCard icon={TrendingUp} label="Submission Rate" value={`${summary.submission_rate}%`} color="blue" />
            <StatCard icon={Award} label="Top Performer" value={summary.top_performer?.name || '—'} color="purple" />
          </div>
        )}

        {/* Export + Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="reports-table-container">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">
              Report Records ({records.length})
            </h2>
            <button
              onClick={exportToExcel}
              disabled={records.length === 0}
              className="flex items-center gap-1.5 text-sm text-blue-800 hover:text-blue-600 border border-blue-200 rounded-md px-3 py-1.5 transition-colors bg-blue-50 disabled:opacity-50"
              data-testid="reports-export-btn"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
          ) : paginatedRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No report records found for the selected range</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[
                        { key: 'date', label: 'Date' },
                        { key: 'employee_name', label: 'Employee' },
                        { key: 'submitted_at', label: 'Submitted At' },
                      ].map(col => (
                        <th
                          key={col.key}
                          className="text-left px-4 py-2.5 font-semibold text-slate-500 cursor-pointer hover:text-slate-900 select-none"
                          onClick={() => handleSort(col.key)}
                        >
                          {col.label}
                          {sortBy === col.key && (
                            <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      ))}
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Department</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Task Category</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Task Status</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-500">Calls</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-500">Leads</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Status</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((row, i) => (
                      <tr
                        key={`${row.employee_id}-${row.report_date}-${i}`}
                        className="border-b border-slate-100 hover:bg-slate-50"
                        data-testid={`reports-row-${i}`}
                      >
                        <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{formatDate(row.report_date)}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{row.employee_name}</td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(row.submitted_at)}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.department || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.task_category || '—'}</td>
                        <td className="px-4 py-2.5">
                          {row.task_status ? <StatusBadge status={row.task_status} /> : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{row.calls_made ?? '—'}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{row.interested_leads ?? '—'}</td>
                        <td className="px-4 py-2.5">
                          {row.report_status === 'submitted' ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              🟢 Submitted
                            </span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              🔴 Missing
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {row.report_status === 'submitted' && row.id && (
                            <button
                              onClick={() => viewReportDetail(row.id)}
                              className="inline-flex items-center gap-1 text-xs text-blue-800 hover:text-blue-600 font-medium"
                              data-testid={`reports-view-btn-${i}`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-xs text-slate-500">
                    Page {page + 1} of {totalPages} ({records.length} records)
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
                      data-testid="reports-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
                      data-testid="reports-next-page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => { setSelectedReport(null); setReportDetail(null); }}
          data-testid="report-detail-modal"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-800" />
                <h3 className="font-semibold text-slate-900 text-sm">Report Details</h3>
              </div>
              <button
                onClick={() => { setSelectedReport(null); setReportDetail(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {detailLoading ? (
              <div className="p-8 text-center text-slate-500 text-sm">Loading report...</div>
            ) : reportDetail ? (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Employee</p>
                    <p className="text-slate-700 font-medium">{reportDetail.employee_name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Date</p>
                    <p className="text-slate-700">{formatDate(reportDetail.report_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Category</p>
                    <p className="text-slate-700">{reportDetail.task_category}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Task Status</p>
                    <StatusBadge status={reportDetail.task_status} />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Morning Plan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 border border-slate-200 rounded-md p-3">{reportDetail.morning_plan}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Afternoon Plan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 border border-slate-200 rounded-md p-3">{reportDetail.afternoon_plan || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Final Report</p>
                  <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 border border-slate-200 rounded-md p-3">{reportDetail.final_report}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 border border-blue-100 rounded-md p-3 text-center">
                    <p className="text-lg font-bold text-blue-700">{reportDetail.calls_made}</p>
                    <p className="text-xs text-slate-500">Calls Made</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 rounded-md p-3 text-center">
                    <p className="text-lg font-bold text-purple-700">{reportDetail.follow_ups}</p>
                    <p className="text-xs text-slate-500">Follow-ups</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-md p-3 text-center">
                    <p className="text-lg font-bold text-emerald-700">{reportDetail.interested_leads}</p>
                    <p className="text-xs text-slate-500">Leads</p>
                  </div>
                </div>

                {reportDetail.blockers && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Blockers</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line bg-amber-50 border border-amber-200 rounded-md p-3">{reportDetail.blockers}</p>
                  </div>
                )}
                {reportDetail.final_remarks && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Final Remarks</p>
                    <p className="text-sm text-slate-700 whitespace-pre-line bg-slate-50 border border-slate-200 rounded-md p-3">{reportDetail.final_remarks}</p>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                  <span>Submitted: {formatDateTime(reportDetail.created_at)}</span>
                  {reportDetail.submitted_after_6pm && (
                    <span className="text-amber-600 font-medium">⚠ Submitted after 6 PM</span>
                  )}
                  {reportDetail.upload_source === 'excel' && reportDetail.original_filename && (
                    <a
                      href={`${process.env.REACT_APP_BACKEND_URL}/api/files/${reportDetail.original_filename}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-800 hover:text-blue-600 font-medium"
                    >
                      📎 {reportDetail.original_filename}
                    </a>
                  )}
                  <StatusBadge status={reportDetail.review_status} />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">Failed to load report</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
