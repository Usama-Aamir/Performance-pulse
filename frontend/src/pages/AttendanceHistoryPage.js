import React, { useState, useEffect, useCallback } from 'react';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import {
  Calendar, Users, Clock, AlertTriangle, Moon, TrendingUp, Download, ChevronLeft, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

const formatDate = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); }
  catch { return d; }
};

const getMYTToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

const getFirstOfMonth = () => {
  const today = getMYTToday();
  return today.substring(0, 8) + '01';
};

const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  };
  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-4 flex items-start gap-4 shadow-sm"
      data-testid={`history-stat-${label.toLowerCase().replace(/ /g, '-')}`}
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-2xl font-bold mt-0.5 text-slate-900">{value ?? '—'}</p>
      </div>
    </div>
  );
};

const StatusBadge = ({ status, clockOutReason, isLate }) => {
  let badge = null;
  if (!status || status === 'absent') {
    badge = <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Absent</span>;
  } else if (status === 'non-working-day') {
    badge = <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">Non-Working</span>;
  } else if (status === 'working') {
    badge = <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Working</span>;
  } else if (status === 'completed') {
    if (clockOutReason === 'auto') {
      badge = <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Auto Clock Out</span>;
    } else {
      badge = <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
    }
  }
  return (
    <div className="flex items-center gap-1">
      {badge}
      {isLate === true && (
        <span title="Late arrival (>9:15 AM MYT)" className="text-sm">🟡</span>
      )}
    </div>
  );
};

export default function AttendanceHistoryPage() {
  const [startDate, setStartDate] = useState(getFirstOfMonth());
  const [endDate, setEndDate] = useState(getMYTToday());
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  useEffect(() => {
    API.get('/users?role=employee&status=active').then(res => setEmployees(res.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate };
      if (selectedEmployee) params.employee_id = selectedEmployee;
      const [histRes, sumRes] = await Promise.all([
        API.get('/attendance/history', { params }),
        API.get('/attendance/history/summary', { params }),
      ]);
      setRecords(histRes.data || []);
      setSummary(sumRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedEmployee]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setQuickRange = (range) => {
    const today = getMYTToday();
    const todayDate = new Date(today + 'T00:00:00');
    if (range === 'thisMonth') {
      setStartDate(getFirstOfMonth());
      setEndDate(today);
    } else if (range === 'lastMonth') {
      const firstThisMonth = todayDate;
      const lastMonthEnd = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth(), 0);
      const lastMonthStart = new Date(lastMonthEnd.getFullYear(), lastMonthEnd.getMonth(), 1);
      setStartDate(lastMonthStart.toLocaleDateString('en-CA'));
      setEndDate(lastMonthEnd.toLocaleDateString('en-CA'));
    } else if (range === 'thisWeek') {
      const day = todayDate.getDay();
      const monday = new Date(todayDate);
      monday.setDate(todayDate.getDate() - (day === 0 ? 6 : day - 1));
      const saturday = new Date(monday);
      saturday.setDate(monday.getDate() + 5);
      setStartDate(monday.toLocaleDateString('en-CA'));
      setEndDate(saturday.toLocaleDateString('en-CA'));
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'date') cmp = (a.date || '').localeCompare(b.date || '');
    else if (sortBy === 'employee_name') cmp = (a.employee_name || '').localeCompare(b.employee_name || '');
    else if (sortBy === 'clock_in') cmp = (a.clock_in || '').localeCompare(b.clock_in || '');
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

  const exportToExcel = () => {
    const headers = ['Date', 'Employee Name', 'Department', 'Clock In', 'Clock Out', 'Working Hours', 'Status', 'Late'];
    const rows = sortedRecords.map(r => [
      r.date, r.employee_name, r.department, r.clock_in || '', r.clock_out || '',
      r.working_duration_display || '', r.status, r.is_late === true ? 'Yes' : (r.is_late === false ? 'No' : '')
    ]);
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${startDate}_to_${endDate}.csv`;
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
            Attendance History
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Browse and analyze past attendance records</p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 space-y-4" data-testid="history-filters">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                data-testid="history-start-date"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                data-testid="history-end-date"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Employee</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]"
                data-testid="history-employee-filter"
              >
                <option value="">All Employees</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
              data-testid="history-apply-btn"
            >
              {loading ? 'Loading...' : 'Apply'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Quick:</span>
            {['thisWeek', 'thisMonth', 'lastMonth'].map(r => (
              <button
                key={r}
                onClick={() => setQuickRange(r)}
                className="text-xs px-3 py-1 border border-slate-200 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
                data-testid={`history-quick-${r}`}
              >
                {r === 'thisWeek' ? 'This Week' : r === 'thisMonth' ? 'This Month' : 'Last Month'}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="history-summary-cards">
            <StatCard icon={Calendar} label="Working Days" value={summary.total_days} color="slate" />
            <StatCard icon={Users} label="Present" value={summary.present_days} color="emerald" />
            <StatCard icon={AlertTriangle} label="Absent" value={summary.absent_days} color="red" />
            <StatCard icon={Clock} label="Late Arrivals" value={summary.late_count} color="amber" />
            <StatCard icon={TrendingUp} label="Avg Hours" value={summary.avg_working_hours} color="blue" />
            <StatCard icon={Moon} label="Auto Clock Out" value={summary.auto_clock_out_count} color="purple" />
          </div>
        )}

        {/* Export + Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="history-table-container">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900 text-sm">
              Attendance Records ({records.length})
            </h2>
            <button
              onClick={exportToExcel}
              disabled={records.length === 0}
              className="flex items-center gap-1.5 text-sm text-blue-800 hover:text-blue-600 border border-blue-200 rounded-md px-3 py-1.5 transition-colors bg-blue-50 disabled:opacity-50"
              data-testid="history-export-btn"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
          ) : paginatedRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">No attendance records found for the selected range</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {[
                        { key: 'date', label: 'Date' },
                        { key: 'employee_name', label: 'Employee' },
                        { key: 'clock_in', label: 'Clock In' },
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
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Clock Out</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Hours</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((row, i) => (
                      <tr
                        key={`${row.employee_id}-${row.date}-${i}`}
                        className="border-b border-slate-100 hover:bg-slate-50"
                        data-testid={`history-row-${i}`}
                      >
                        <td className="px-4 py-2.5 text-slate-600">{formatDate(row.date)}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-900">{row.employee_name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.clock_in || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.department || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.clock_out || '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{row.working_duration_display || '—'}</td>
                        <td className="px-4 py-2.5">
                          <StatusBadge status={row.status} clockOutReason={row.clock_out_reason} isLate={row.is_late} />
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
                      data-testid="history-prev-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="p-1.5 border border-slate-200 rounded-md hover:bg-slate-100 disabled:opacity-40"
                      data-testid="history-next-page"
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
    </div>
  );
}
