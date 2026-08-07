import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API } from '@/contexts/AuthContext';
import { Activity, LogOut, FileText, Save, User, Calendar } from 'lucide-react';

const DEPARTMENTS = ['Sales', 'Marketing', 'Operations', 'IT', 'HR', 'Management', 'Other'];

export default function MyProfile() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const [form, setForm] = useState({
    full_name: '', department: '', job_title: '', phone: '', profile_remarks: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name || '',
        department: user.department || '',
        job_title: user.job_title || '',
        phone: user.phone || '',
        profile_remarks: user.profile_remarks || '',
      });
      setLoading(false);
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setMessage({ type: 'error', text: 'Full name is required.' });
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      await API.put(`/users/${user.id}`, form);
      // Refresh user state
      const res = await API.get('/auth/me');
      setUser(res.data);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : 'Failed to update profile.' });
    } finally { setSaving(false); }
  };

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
          <span className="text-sm text-slate-600 font-medium">My Profile</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-sm text-slate-600 hover:text-slate-900">Dashboard</button>
          <button onClick={() => navigate('/my-reports')} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <FileText className="w-4 h-4" /><span className="hidden sm:inline">My Reports</span>
          </button>
          <button onClick={() => navigate('/leave-requests')} className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
            <Calendar className="w-4 h-4" /><span className="hidden sm:inline">Leave Requests</span>
          </button>
          <button data-testid="nav-logout" onClick={handleLogout} className="text-slate-500 hover:text-slate-700">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto p-4 md:p-6">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Update your personal details</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">Loading...</div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
            {/* Avatar + read-only info */}
            <div className="p-5 border-b border-slate-200 flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-blue-800 text-xl font-bold">{(user?.full_name || 'U')[0].toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-slate-900">{user?.full_name}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
                  <span className="text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full capitalize">{user?.status}</span>
                </div>
              </div>
            </div>

            {/* Read-only notice */}
            <div className="px-5 pt-4">
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-2.5 mb-4">
                Email, role, and status cannot be changed. Contact your admin if you need these updated.
              </div>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4" data-testid="profile-form">
              {message.text && (
                <div data-testid="profile-message"
                  className={`p-3 rounded-md text-sm ${message.type === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border border-red-200 text-red-700'}`}>
                  {message.text}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  data-testid="profile-fullname"
                  type="text"
                  required
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    data-testid="profile-department"
                    value={form.department}
                    onChange={e => setForm(p => ({ ...p, department: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                  <input
                    data-testid="profile-jobtitle"
                    type="text"
                    value={form.job_title}
                    onChange={e => setForm(p => ({ ...p, job_title: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Sales Executive"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone Number <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  data-testid="profile-phone"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+60 12-345 6789"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Profile Remarks <span className="text-slate-400 font-normal text-xs">(optional)</span>
                </label>
                <textarea
                  data-testid="profile-remarks"
                  rows={3}
                  value={form.profile_remarks}
                  onChange={e => setForm(p => ({ ...p, profile_remarks: e.target.value }))}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Brief about yourself, skills, focus area..."
                />
              </div>

              {/* Read-only fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email (read-only)</label>
                  <div className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 bg-slate-50">
                    {user?.email}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Role (read-only)</label>
                  <div className="border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-500 bg-slate-50 capitalize">
                    {user?.role}
                  </div>
                </div>
              </div>

              <button
                data-testid="profile-save-btn"
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
