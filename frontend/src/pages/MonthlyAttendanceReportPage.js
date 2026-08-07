import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Calendar, Clock, User, TrendingUp, AlertCircle, ChevronLeft, ChevronRight, X } from 'lucide-react';

const STATUS_COLORS = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  on_leave: 'bg-blue-100 text-blue-800',
  weekend: 'bg-slate-100 text-slate-600'
};

const MonthlyAttendanceReportPage = () => {
  const { user } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return now.getMonth() + 1; // 1-12
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const now = new Date();
    return now.getFullYear();
  });
  
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [drilldownData, setDrilldownData] = useState(null);
  const [loadingDrilldown, setLoadingDrilldown] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await API.get('/attendance/monthly-report', {
        params: { year: selectedYear, month: selectedMonth }
      });
      setReportData(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedYear, selectedMonth]);

  const handleEmployeeClick = async (employee) => {
    setSelectedEmployee(employee);
    setLoadingDrilldown(true);
    try {
      const res = await API.get(`/attendance/monthly-report/${employee.employee_id}`, {
        params: { year: selectedYear, month: selectedMonth }
      });
      setDrilldownData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDrilldown(false);
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5); // HH:MM
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Monthly Attendance Report</h1>
          <p className="text-slate-600 text-sm mt-1">View aggregated attendance metrics by month</p>
        </div>

        {/* Month Selector */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-6 flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {monthNames.map((name, idx) => (
                <option key={idx} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-slate-900">{reportData.length}</p>
            <p className="text-xs text-slate-500">Total Employees</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-green-600">
              {reportData.reduce((sum, emp) => sum + emp.days_present, 0)}
            </p>
            <p className="text-xs text-slate-500">Total Days Present</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-blue-600">
              {reportData.reduce((sum, emp) => sum + emp.days_on_leave, 0)}
            </p>
            <p className="text-xs text-slate-500">Total Days on Leave</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
            <p className="text-2xl font-bold text-red-600">
              {reportData.reduce((sum, emp) => sum + emp.days_absent, 0)}
            </p>
            <p className="text-xs text-slate-500">Total Days Absent</p>
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No data available for this month</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Department</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700">Working Days</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 text-green-700">Present</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 text-blue-700">On Leave</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700 text-red-700">Absent</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700">Avg Hours/Day</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700">Late</th>
                    <th className="px-4 py-3 text-center font-medium text-slate-700">Auto CO</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((emp) => (
                    <tr 
                      key={emp.employee_id} 
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => handleEmployeeClick(emp)}
                    >
                      <td className="px-4 py-3 font-medium">{emp.employee_name}</td>
                      <td className="px-4 py-3 text-slate-600">{emp.department}</td>
                      <td className="px-4 py-3 text-center">{emp.working_days_in_month}</td>
                      <td className="px-4 py-3 text-center text-green-700 font-medium">{emp.days_present}</td>
                      <td className="px-4 py-3 text-center text-blue-700 font-medium">{emp.days_on_leave}</td>
                      <td className="px-4 py-3 text-center text-red-700 font-medium">{emp.days_absent}</td>
                      <td className="px-4 py-3 text-center">{emp.average_hours_per_day}</td>
                      <td className="px-4 py-3 text-center">
                        {emp.late_arrivals_count > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            {emp.late_arrivals_count}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {emp.auto_clock_outs_count > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {emp.auto_clock_outs_count}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Drill-down Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 my-8">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedEmployee.employee_name} - {monthNames[selectedMonth - 1]} {selectedYear}
                  </h3>
                  <p className="text-sm text-slate-600">{selectedEmployee.department}</p>
                </div>
                <button
                  onClick={() => { setSelectedEmployee(null); setDrilldownData(null); }}
                  className="p-1 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              
              {loadingDrilldown ? (
                <div className="p-8 text-center text-slate-500">Loading details...</div>
              ) : drilldownData ? (
                <div className="p-4">
                  {/* Summary */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-green-600">{drilldownData.days_present}</p>
                      <p className="text-xs text-slate-600">Present</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-blue-600">{drilldownData.days_on_leave}</p>
                      <p className="text-xs text-slate-600">On Leave</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-red-600">{drilldownData.days_absent}</p>
                      <p className="text-xs text-slate-600">Absent</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-lg font-bold text-slate-900">{drilldownData.average_hours_per_day}h</p>
                      <p className="text-xs text-slate-600">Avg Hours/Day</p>
                    </div>
                  </div>

                  {/* Daily Breakdown */}
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Date</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Status</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Clock In</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Clock Out</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Duration</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Late</th>
                          <th className="px-3 py-2 text-left font-medium text-slate-700">Auto CO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drilldownData.daily_breakdown.map((day) => (
                          <tr key={day.date} className="border-b border-slate-100">
                            <td className="px-3 py-2">{formatDate(day.date)}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[day.status]}`}>
                                {day.status.charAt(0).toUpperCase() + day.status.slice(1).replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-3 py-2">{formatTime(day.clock_in)}</td>
                            <td className="px-3 py-2">{formatTime(day.clock_out)}</td>
                            <td className="px-3 py-2">
                              {day.working_duration_minutes ? `${Math.round(day.working_duration_minutes / 60)}h ${day.working_duration_minutes % 60}m` : '-'}
                            </td>
                            <td className="px-3 py-2">
                              {day.is_late && (
                                <AlertCircle className="w-4 h-4 text-yellow-600" />
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {day.is_auto_clock_out && (
                                <Clock className="w-4 h-4 text-orange-600" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyAttendanceReportPage;
