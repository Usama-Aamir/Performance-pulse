import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Activity, Eye, EyeOff } from 'lucide-react';

const DEPARTMENTS = ['Sales', 'Marketing', 'Operations', 'IT', 'HR', 'Management', 'Other'];

const formatError = (err) => {
  const detail = err?.response?.data?.detail;
  if (!detail) return err?.message || 'An error occurred';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(e => e?.msg || JSON.stringify(e)).join(', ');
  return String(detail);
};

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({
    full_name: '', email: '', password: '', confirm_password: '',
    department: '', job_title: ''
  });

  const getRedirectPath = (user) => {
    if (user.status === 'pending') return '/waiting-approval';
    if (user.status === 'rejected' || user.status === 'inactive') return '/access-denied';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'boss') return '/boss';
    return '/dashboard';
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      navigate(getRedirectPath(user), { replace: true });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    if (signupForm.password !== signupForm.confirm_password) {
      setError('Passwords do not match');
      return;
    }
    if (signupForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register({
        full_name: signupForm.full_name,
        email: signupForm.email,
        password: signupForm.password,
        department: signupForm.department,
        job_title: signupForm.job_title
      });
      navigate('/waiting-approval', { replace: true });
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <Activity className="w-7 h-7 text-blue-800" />
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Performance Pulse
            </h1>
          </div>
          <p className="text-sm text-slate-500">Internal Employee Performance Tracking</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              data-testid="tab-login"
              onClick={() => { setTab('login'); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'login'
                  ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign In
            </button>
            <button
              data-testid="tab-signup"
              onClick={() => { setTab('signup'); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === 'signup'
                  ? 'text-blue-800 border-b-2 border-blue-800 bg-blue-50/50'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div data-testid="auth-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    data-testid="login-email"
                    type="email"
                    required
                    value={loginForm.email}
                    onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <div className="relative">
                    <input
                      data-testid="login-password"
                      type={showPass ? 'text' : 'password'}
                      required
                      value={loginForm.password}
                      onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  data-testid="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
                  <input
                    data-testid="signup-fullname"
                    type="text"
                    required
                    value={signupForm.full_name}
                    onChange={e => setSignupForm(p => ({ ...p, full_name: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input
                    data-testid="signup-email"
                    type="email"
                    required
                    value={signupForm.email}
                    onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select
                      data-testid="signup-department"
                      value={signupForm.department}
                      onChange={e => setSignupForm(p => ({ ...p, department: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select...</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                    <input
                      data-testid="signup-jobtitle"
                      type="text"
                      value={signupForm.job_title}
                      onChange={e => setSignupForm(p => ({ ...p, job_title: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Sales Executive"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input
                      data-testid="signup-password"
                      type={showPass ? 'text' : 'password'}
                      required
                      value={signupForm.password}
                      onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))}
                      className="w-full border border-slate-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Min. 8 characters"
                    />
                    <button type="button" onClick={() => setShowPass(p => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password <span className="text-red-500">*</span></label>
                  <input
                    data-testid="signup-confirm-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    value={signupForm.confirm_password}
                    onChange={e => setSignupForm(p => ({ ...p, confirm_password: e.target.value }))}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Repeat password"
                  />
                </div>
                <p className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-md p-2.5">
                  New accounts require admin approval before you can log in.
                </p>
                <button
                  data-testid="signup-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-800 hover:bg-blue-700 text-white rounded-md px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </form>
            )}
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-6">Performance Pulse — Internal Use Only</p>
      </div>
    </div>
  );
}
