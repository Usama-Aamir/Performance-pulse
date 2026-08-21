import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../contexts/AuthContext';
import Sidebar from '@/components/Sidebar';
import { format } from 'date-fns';
import { Calendar, Plus, FileText, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800'
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle
};

const LeaveRequestsPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    date_from: '',
    date_to: '',
    reason: ''
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await API.get('/leave-requests/my');
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await API.post('/leave-requests', formData);
      setShowForm(false);
      setFormData({ date_from: '', date_to: '', reason: '' });
      fetchRequests();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr + 'T00:00:00'), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 md:ml-60 p-4 md:p-6 pt-16 md:pt-6">
        <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Leave Requests</h1>
            <p className="text-slate-600 text-sm mt-1">Manage your leave requests</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        </div>

        {showForm && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Submit Leave Request</h2>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-800 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={formData.date_from}
                    onChange={(e) => setFormData({ ...formData, date_from: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={formData.date_to}
                    onChange={(e) => setFormData({ ...formData, date_to: e.target.value })}
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : requests.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">From</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">To</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Reason</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Submitted</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const StatusIcon = STATUS_ICONS[req.status];
                    return (
                      <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3">{formatDate(req.date_from)}</td>
                        <td className="px-4 py-3">{formatDate(req.date_to)}</td>
                        <td className="px-4 py-3 max-w-xs truncate">{req.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                            <StatusIcon className="w-3 h-3" />
                            {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">{formatDate(req.requested_at)}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">{req.boss_remarks || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      </main>
    </div>
  );
};

export default LeaveRequestsPage;
