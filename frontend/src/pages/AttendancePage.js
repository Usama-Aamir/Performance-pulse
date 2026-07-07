import React, { useState, useEffect, useCallback } from 'react';
import { API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import {
  Users, UserCheck, UserX, Clock, Moon, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

const formatDate = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); }
  catch { return d; }
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
      data-testid={`attendance-stat-${label.toLowerCase().replace(/ /g, '-')}`}
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

const StatusBadge = ({ status, clockOutReason }) => {
  if (!status || status === 'not_clocked_in') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Absent</span>;
  }
  if (status === 'working') {
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Working</span>;
  }
  if (status === 'completed') {
    if (clockOutReason === 'auto') {
      return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Auto Clock Out</span>;
    }
    return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Completed</span>;
  }
  return null;
};

export default function AttendancePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const res = await API.get('/attendance/all-today');
      setData(res.data);
      setLastUpdated(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!lastUpdated) return;
    const tick = () => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Attendance
              </h1>
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600" data-testid="attendance-live-indicator">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              {data ? formatDate(data.date) : ''}
              {data && !data.is_working_day && (
                <span className="ml-2 text-amber-600">(Non-working day)</span>
              )}
              <span className="ml-2 text-slate-400">· Refreshing every 30s · Updated {secondsAgo}s ago</span>
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 transition-colors"
            title="Refresh"
            data-testid="attendance-refresh-btn"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : data ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" data-testid="attendance-summary-cards">
              <StatCard icon={Users} label="Total Employees" value={data.summary.total_employees} color="blue" />
              <StatCard icon={UserCheck} label="Present Today" value={data.summary.present_today} color="emerald" />
              <StatCard icon={UserX} label="Absent Today" value={data.summary.absent_today} color="red" />
              <StatCard icon={Clock} label="Still Working" value={data.summary.still_working} color="amber" />
              <StatCard icon={Moon} label="Auto Clocked Out" value={data.summary.auto_clocked_out} color="purple" />
            </div>

            {/* Attendance Table */}
            {data.attendance.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="attendance-table">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="font-semibold text-slate-900 text-sm">Today's Attendance</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Employee</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Department</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Clock In</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Clock Out</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Hours</th>
                        <th className="text-left px-4 py-2.5 font-semibold text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attendance.map((row) => (
                        <tr
                          key={row.employee_id}
                          className="border-b border-slate-100 hover:bg-slate-50"
                          data-testid={`attendance-row-${row.employee_id}`}
                        >
                          <td className="px-4 py-2.5 font-medium text-slate-900">{row.employee_name}</td>
                          <td className="px-4 py-2.5 text-slate-600">{row.department || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-600">{row.clock_in || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-600">{row.clock_out || '—'}</td>
                          <td className="px-4 py-2.5 text-slate-600">{row.working_duration_display || '—'}</td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={row.status} clockOutReason={row.clock_out_reason} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Not Clocked In */}
            {data.not_clocked_in.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm" data-testid="attendance-not-clocked-in">
                <div className="p-4 border-b border-red-200 flex items-center gap-2">
                  <UserX className="w-5 h-5 text-red-600" />
                  <h2 className="font-semibold text-red-800 text-sm">
                    Not Clocked In ({data.not_clocked_in.length})
                  </h2>
                </div>
                <div className="p-3 flex flex-wrap gap-2">
                  {data.not_clocked_in.map(emp => (
                    <div
                      key={emp.employee_id}
                      className="flex items-center gap-2 bg-white border border-red-200 rounded-md px-3 py-2"
                      data-testid={`attendance-absent-${emp.employee_id}`}
                    >
                      <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-700 text-xs font-semibold">{(emp.employee_name || 'U')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-red-800">{emp.employee_name}</p>
                        <p className="text-xs text-red-600">{emp.department || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.attendance.length === 0 && data.not_clocked_in.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-sm">No attendance data for today</div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-slate-500 text-sm">Failed to load attendance data</div>
        )}
      </main>
    </div>
  );
}
