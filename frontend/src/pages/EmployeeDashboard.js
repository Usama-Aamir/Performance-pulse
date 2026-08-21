import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import {
  FileText, Upload, Download, CheckCircle,
  AlertTriangle, Eye, RotateCcw, ChevronDown, ChevronUp, Clock
} from 'lucide-react';
import { format } from 'date-fns';

const getMYTToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
const formatDate = (d) => {
  try { return format(new Date(d + 'T00:00:00'), 'dd MMM yyyy'); }
  catch { return d; }
};

// ─── Preview table ───────────────────────────────────────────────
const PreviewTable = ({ rows }) => (
  <div className="overflow-x-auto border border-slate-200 rounded-lg">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {['Date','Name','Dept','Morning Plan','Afternoon Plan','Final Report',
            'Category','Status','Calls','F/U','Leads'].map(h => (
            <th key={h} className="text-left px-3 py-2 font-semibold text-slate-500 whitespace-nowrap">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-slate-100 hover:bg-blue-50/30">
            <td className="px-3 py-2 whitespace-nowrap">{r.report_date}</td>
            <td className="px-3 py-2">{r.employee_name}</td>
            <td className="px-3 py-2">{r.department}</td>
            <td className="px-3 py-2 max-w-xs truncate" title={r.morning_plan}>{r.morning_plan}</td>
            <td className="px-3 py-2 max-w-xs truncate" title={r.afternoon_plan}>{r.afternoon_plan}</td>
            <td className="px-3 py-2 max-w-xs truncate" title={r.final_report}>{r.final_report}</td>
            <td className="px-3 py-2 whitespace-nowrap">{r.task_category}</td>
            <td className="px-3 py-2 whitespace-nowrap"><StatusBadge status={r.task_status} /></td>
            <td className="px-3 py-2 text-center">{r.calls_made}</td>
            <td className="px-3 py-2 text-center">{r.follow_ups}</td>
            <td className="px-3 py-2 text-center">{r.interested_leads}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const confirmFileRef = useRef(null);

  const [todayReport, setTodayReport] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [loading, setLoading] = useState(true);

  // attendance state
  const [attendance, setAttendance] = useState(null);
  const [attWorkingDay, setAttWorkingDay] = useState(true);
  const [attLoading, setAttLoading] = useState(false);
  const [liveDuration, setLiveDuration] = useState('');
  const [myHistory, setMyHistory] = useState(null);
  const [myReportsHistory, setMyReportsHistory] = useState(null);

  // upload flow
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);   // parsed rows
  const [previewFilename, setPreviewFilename] = useState('');
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // manual fallback
  const [showManual, setShowManual] = useState(false);

  const today = getMYTToday();

  useEffect(() => { fetchData(); }, []);

  // Live duration timer for working attendance
  useEffect(() => {
    if (!attendance?.clock_in_at || attendance?.clock_out_at) return;

    const updateDuration = () => {
      const start = new Date(attendance.clock_in_at).getTime();
      const elapsed = Math.max(0, Date.now() - start);
      const h = Math.floor(elapsed / 3600000);
      const m = Math.floor((elapsed % 3600000) / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      setLiveDuration(`${h}h ${m}m ${s}s`);
    };

    updateDuration();
    const timerId = setInterval(updateDuration, 1000);

    return () => clearInterval(timerId);
  }, [attendance?.clock_in_at, attendance?.clock_out_at]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [todayRes, recentRes, attRes, histRes] = await Promise.all([
        API.get('/reports/today'),
        API.get('/reports/my'),
        API.get('/attendance/today'),
        API.get('/attendance/my-history'),
      ]);
      setTodayReport(todayRes.data?.report || null);
      setIsWorkingDay(todayRes.data?.is_working_day !== false);
      setRecentReports((recentRes.data || []).slice(0, 5));
      setAttendance(attRes.data?.attendance || null);
      setAttWorkingDay(attRes.data?.is_working_day !== false);
      setMyHistory(histRes.data);
      setMyReportsHistory(recentRes.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleClockIn = async () => {
    setAttLoading(true);
    try {
      const res = await API.post('/attendance/clock-in');
      setAttendance(res.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setUploadError(typeof detail === 'string' ? detail : 'Failed to clock in');
    } finally { setAttLoading(false); }
  };

  const handleClockOut = async () => {
    setAttLoading(true);
    try {
      const res = await API.post('/attendance/clock-out');
      setAttendance(res.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setUploadError(typeof detail === 'string' ? detail : 'Failed to clock out');
    } finally { setAttLoading(false); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      setUploadError('Only .xlsx files are accepted.');
      return;
    }
    setSelectedFile(file);
    setPreview(null);
    setUploadError('');
    setParsing(true);

    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await API.post('/reports/upload-preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data.preview);
      setPreviewFilename(res.data.filename);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setUploadError(typeof detail === 'string' ? detail : 'Failed to parse the file.');
      setSelectedFile(null);
    } finally { setParsing(false); }
  };

  const handleConfirm = async () => {
    if (!selectedFile) return;
    setConfirming(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('file', selectedFile);
    try {
      await API.post('/reports/upload-confirm', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(null);
      setSelectedFile(null);
      fetchData();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setUploadError(typeof detail === 'string' ? detail : 'Failed to submit report.');
    } finally { setConfirming(false); }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleDownloadTemplate = () => {
    window.open(`${process.env.REACT_APP_BACKEND_URL}/api/reports/template`, '_blank');
  };

  const getGreeting = () => {
    const mytHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', hour12: false });
    const h = parseInt(mytHour);
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6 space-y-6">
        {/* Greeting */}

        {/* Attendance Card */}
        {!loading && attWorkingDay && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="attendance-status-card">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-800" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm">Today's Attendance</h3>
                <p className="text-xs text-slate-500">Clock in before 6:00 PM MYT</p>
              </div>
            </div>
            <div className="p-4">
              {!attendance ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">You haven't clocked in today</p>
                    <p className="text-xs text-slate-500 mt-0.5">Click the button to clock in</p>
                  </div>
                  <button
                    data-testid="attendance-clock-in-btn"
                    onClick={handleClockIn}
                    disabled={attLoading}
                    className="bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {attLoading ? 'Clocking in...' : 'Clock In'}
                  </button>
                </div>
              ) : attendance.status === 'working' ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">Clocked in at {attendance.clock_in}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Working duration: <span data-testid="attendance-live-duration" className="font-medium text-blue-700">{liveDuration}</span>
                    </p>
                  </div>
                  <button
                    data-testid="attendance-clock-out-btn"
                    onClick={handleClockOut}
                    disabled={attLoading}
                    className="bg-slate-700 hover:bg-slate-800 text-white rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                  >
                    {attLoading ? 'Clocking out...' : 'Clock Out'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">
                      Clocked in at {attendance.clock_in} — Clocked out at {attendance.clock_out}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Duration: <span className="font-medium text-slate-700">{attendance.working_duration_display}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {attendance.clock_out_reason === 'auto' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Auto Clock Out
                      </span>
                    )}
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Completed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !attWorkingDay && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700" data-testid="attendance-status-card">
            No attendance required today (non-working day)
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {getGreeting()}, {user?.full_name}
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
            <p className="font-semibold text-amber-800">No report required today (non-working day)</p>
            <p className="text-sm text-amber-700 mt-1">Reports are required Monday to Saturday.</p>
          </div>
        ) : todayReport ? (
          /* ── Already submitted ── */
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="report-submitted-card">
            <div className="p-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 text-sm">Report Submitted</h3>
                <p className="text-xs text-slate-500">
                  {formatDate(todayReport.report_date)}
                  {todayReport.original_filename && <span className="ml-2 text-slate-400">· {todayReport.original_filename}</span>}
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={todayReport.review_status} />
                {todayReport.upload_source === 'excel' && (
                  <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">Excel</span>
                )}
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
              <div className="flex gap-4 flex-wrap text-slate-600">
                <span>Calls: <strong className="text-slate-800">{todayReport.calls_made}</strong></span>
                <span>Follow-ups: <strong className="text-slate-800">{todayReport.follow_ups}</strong></span>
                <span>Leads: <strong className="text-slate-800">{todayReport.interested_leads}</strong></span>
              </div>
            </div>
          </div>
        ) : (
          /* ── Upload flow ── */
          <div className="space-y-4">
            {/* Status bar */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">No report submitted today — deadline 6 PM MYT</p>
            </div>

            {/* Upload card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="upload-card">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-4 h-4 text-blue-800" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Upload Daily Report</h3>
                    <p className="text-xs text-slate-500">Upload your completed Excel report (.xlsx)</p>
                  </div>
                </div>
                <button
                  data-testid="download-template-btn"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 text-sm text-blue-800 hover:text-blue-600 border border-blue-200 rounded-md px-3 py-1.5 transition-colors bg-blue-50"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
              </div>

              <div className="p-4 space-y-4">
                {uploadError && (
                  <div data-testid="upload-error" className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                    {uploadError}
                  </div>
                )}

                {!preview ? (
                  /* File picker */
                  <div
                    className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors"
                    onClick={() => fileRef.current?.click()}
                    data-testid="upload-dropzone"
                  >
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-700">
                      {parsing ? 'Parsing file...' : 'Click to select your Excel report'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Accepted: .xlsx only</p>
                    <input
                      ref={fileRef}
                      data-testid="file-input"
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                ) : (
                  /* Preview */
                  <div className="space-y-4" data-testid="preview-section">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="w-4 h-4 text-blue-800" />
                        <h4 className="font-semibold text-slate-900 text-sm">
                          Parsed Preview — {previewFilename}
                        </h4>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {preview.length} row{preview.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button onClick={handleReset} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                        <RotateCcw className="w-3.5 h-3.5" /> Change file
                      </button>
                    </div>
                    <PreviewTable rows={preview} />
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
                      Please review the parsed data above. If everything looks correct, click <strong>Confirm & Submit</strong>.
                    </div>
                    <button
                      data-testid="confirm-submit-btn"
                      onClick={handleConfirm}
                      disabled={confirming}
                      className="w-full bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
                    >
                      {confirming ? 'Submitting...' : 'Confirm & Submit Report'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Manual fallback */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
              <button
                data-testid="manual-toggle"
                className="w-full p-4 flex items-center justify-between text-sm text-slate-600 hover:text-slate-900"
                onClick={() => setShowManual(v => !v)}
              >
                <span className="font-medium">Enter report manually instead</span>
                {showManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showManual && <ManualForm onSuccess={fetchData} />}
            </div>
          </div>
        )}

        {/* Recent Reports */}
        {recentReports.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 text-sm">Recent Reports</h3>
              <button onClick={() => navigate('/my-reports')} className="text-xs text-blue-800 hover:text-blue-600 font-medium">View all</button>
            </div>
            <div className="divide-y divide-slate-100">
              {recentReports.map(r => (
                <div key={r.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{formatDate(r.report_date)}</p>
                    <p className="text-xs text-slate-500">{r.task_category}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.task_status} />
                    <StatusBadge status={r.review_status} />
                    {r.upload_source === 'excel' && (
                      <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded-full">XLS</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Attendance History */}
        {myHistory && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="my-attendance-history">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-800" />
                <h3 className="font-semibold text-slate-900 text-sm">My Attendance History</h3>
              </div>
              <span className="text-xs text-slate-400">This Month</span>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100">
              <div className="text-center">
                <p className="text-xl font-bold text-emerald-600">{myHistory.summary.present_days}</p>
                <p className="text-xs text-slate-500">Days Present</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-red-600">{myHistory.summary.absent_days}</p>
                <p className="text-xs text-slate-500">Days Absent</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-blue-600">{myHistory.summary.avg_working_hours}h</p>
                <p className="text-xs text-slate-500">Avg Hours</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-600">{myHistory.summary.late_count}</p>
                <p className="text-xs text-slate-500">Late Count</p>
              </div>
            </div>
            {myHistory.records.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Date</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Clock In</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Clock Out</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Hours</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Status</th>
                      <th className="text-left px-4 py-2 font-semibold text-slate-500">Late?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHistory.records.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 text-slate-600">{formatDate(r.date)}</td>
                        <td className="px-4 py-2 text-slate-600">{r.clock_in || '—'}</td>
                        <td className="px-4 py-2 text-slate-600">{r.clock_out || '—'}</td>
                        <td className="px-4 py-2 text-slate-600">{r.working_duration_display || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            r.status === 'working' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            r.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            r.clock_out_reason === 'auto' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {r.status === 'completed' && r.clock_out_reason === 'auto' ? 'Auto Out' : r.status}
                          </span>
                        </td>
                        <td className="px-4 py-2">{r.is_late === true ? '🟡' : r.is_late === false ? '—' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">No attendance records this month yet</div>
            )}
          </div>
        )}

        {/* My Reports History */}
        {myReportsHistory && (
          <MyReportsHistoryCard reports={myReportsHistory} today={today} />
        )}
      </main>
    </div>
  );
}

// ─── Manual fallback form ─────────────────────────────────────────
const TASK_CATEGORIES = ['Admin Work', 'Letter Preparation', 'Client Calling', 'Digital Marketing', 'App Testing', 'Follow-up', 'Other'];
const TASK_STATUSES = ['Completed', 'In Progress', 'Pending', 'Delayed'];

function ManualForm({ onSuccess }) {
  const [form, setForm] = useState({
    morning_plan: '', afternoon_plan: '', final_report: '',
    task_category: 'Other', task_status: 'Completed',
    calls_made: 0, follow_ups: 0, interested_leads: 0,
    blockers: '', final_remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await API.post('/reports', form);
      onSuccess();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to submit report');
    } finally { setSubmitting(false); }
  };

  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Morning Planned Tasks <span className="text-red-500">*</span></label>
        <textarea required rows={3} value={form.morning_plan} onChange={e => f('morning_plan', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="9 AM – 12/1 PM tasks..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Afternoon Planned Tasks</label>
        <textarea rows={3} value={form.afternoon_plan} onChange={e => f('afternoon_plan', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="1/2 PM – 6 PM tasks..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Final Completed Work <span className="text-red-500">*</span></label>
        <textarea required rows={4} value={form.final_report} onChange={e => f('final_report', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="What was actually completed..." />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Task Category</label>
          <select value={form.task_category} onChange={e => f('task_category', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TASK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Task Status</label>
          <select value={form.task_status} onChange={e => f('task_status', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TASK_STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[['Calls Made', 'calls_made'], ['Follow-ups', 'follow_ups'], ['Leads', 'interested_leads']].map(([label, key]) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input type="number" min={0} value={form[key]}
              onChange={e => f(key, parseInt(e.target.value) || 0)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Blockers</label>
        <textarea rows={2} value={form.blockers} onChange={e => f('blockers', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Final Remarks</label>
        <textarea rows={2} value={form.final_remarks} onChange={e => f('final_remarks', e.target.value)}
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
      <button type="submit" disabled={submitting}
        className="w-full bg-slate-700 hover:bg-slate-800 text-white rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60">
        {submitting ? 'Submitting...' : 'Submit Manually'}
      </button>
    </form>
  );
}

// ─── My Reports History Card ─────────────────────────────────────
function MyReportsHistoryCard({ reports, today }) {
  const monthPrefix = today.substring(0, 7);
  const monthReports = reports.filter(r => (r.report_date || '').startsWith(monthPrefix));

  const downloadReport = async (reportId) => {
    if (!reportId) return;
    try {
      const res = await API.get(`/reports/${reportId}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: res.headers['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const contentDisposition = res.headers['content-disposition'] || '';
      let filename = `Report_${reportId}.xlsx`;
      const match = contentDisposition.match(/filename="?(.+?)"?$/);
      if (match) filename = match[1];
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download report. Please try again.');
    }
  };

  const submittedCount = monthReports.length;
  const todayDate = new Date(today + 'T00:00:00');
  let workingDays = 0;
  const firstOfMonth = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  const cur = new Date(firstOfMonth);
  while (cur <= todayDate) {
    const dow = cur.getDay();
    if (dow !== 0) workingDays++;
    cur.setDate(cur.getDate() + 1);
  }
  const submissionRate = workingDays > 0 ? Math.round(submittedCount / workingDays * 100) : 0;

  const formatRepDate = (d) => {
    try { return format(new Date(d + 'T00:00:00'), 'dd MMM'); }
    catch { return d; }
  };
  const formatRepDateTime = (dt) => {
    if (!dt) return '—';
    try { return format(new Date(dt), 'dd MMM, HH:mm'); }
    catch { return dt; }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm" data-testid="my-reports-history">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-800" />
          <h3 className="font-semibold text-slate-900 text-sm">My Reports History</h3>
        </div>
        <span className="text-xs text-slate-400">This Month</span>
      </div>
      <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-100">
        <div className="text-center">
          <p className="text-xl font-bold text-emerald-600">{submittedCount}</p>
          <p className="text-xs text-slate-500">Submitted</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-slate-700">{workingDays}</p>
          <p className="text-xs text-slate-500">Working Days</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-blue-600">{submissionRate}%</p>
          <p className="text-xs text-slate-500">Submission Rate</p>
        </div>
      </div>
      {monthReports.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Date</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Task Category</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Task Status</th>
                <th className="text-center px-4 py-2 font-semibold text-slate-500">Calls</th>
                <th className="text-center px-4 py-2 font-semibold text-slate-500">Leads</th>
                <th className="text-left px-4 py-2 font-semibold text-slate-500">Submitted At</th>
                <th className="text-center px-4 py-2 font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {monthReports.slice(0, 10).map((r, i) => (
                <tr key={r.id || i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-600">{formatRepDate(r.report_date)}</td>
                  <td className="px-4 py-2 text-slate-600">{r.task_category}</td>
                  <td className="px-4 py-2"><StatusBadge status={r.task_status} /></td>
                  <td className="px-4 py-2 text-center text-slate-600">{r.calls_made}</td>
                  <td className="px-4 py-2 text-center text-slate-600">{r.interested_leads}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{formatRepDateTime(r.created_at)}</td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => downloadReport(r.id)}
                      className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-600 font-medium"
                      data-testid={`my-report-download-btn-${i}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-center text-slate-500 text-sm">No reports submitted this month yet</div>
      )}
    </div>
  );
}
