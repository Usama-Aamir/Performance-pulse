import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Calendar, CheckCircle, XCircle, Clock, AlertCircle, Filter, ChevronDown, MessageSquare } from 'lucide-react';

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

const LeaveManagementPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'all'
  
  const [filters, setFilters] = useState({
    employee_id: '',
    status: '',
    date_from: '',
    date_to: ''
  });
  
  const [employees, setEmployees] = useState([]);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [submitting, setSubmitting] = useState(false);

  const fetchEmployees = async () => {
    try {
      const res = await API.get('/users?role=employee&status=active');
      setEmployees(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPending = async () => {
    try {
      const res = await API.get('/leave-requests/pending');
      setPendingRequests(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.employee_id) params.employee_id = filters.employee_id;
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      
      const res = await API.get('/leave-requests', { params });
      setRequests(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchPending();
  }, []);

  useEffect(() => {
    if (activeTab === 'all') {
      fetchAllRequests();
    }
  }, [activeTab, filters]);

  const handleApprove = (req) => {
    setSelectedRequest(req);
    setRemarks('');
    setActionType('approve');
    setShowRemarksModal(true);
  };

  const handleReject = (req) => {
    setSelectedRequest(req);
    setRemarks('');
    setActionType('reject');
    setShowRemarksModal(true);
  };

  const submitAction = async () => {
    setSubmitting(true);
    try {
      const endpoint = `/leave-requests/${selectedRequest.id}/${actionType}`;
      await API.put(endpoint, { boss_remarks: remarks });
      setShowRemarksModal(false);
      fetchPending();
      if (activeTab === 'all') {
        fetchAllRequests();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      return format(new Date(dateStr), 'dd MMM yyyy');
    } catch {
      return dateStr;
    }
  };

  const displayRequests = activeTab === 'pending' ? pendingRequests : requests;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Leave Management</h1>
          <p className="text-slate-600 text-sm mt-1">Review and manage employee leave requests</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            Pending {pendingRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            All Requests
          </button>
        </div>

        {/* Filters for All Requests */}
        {activeTab === 'all' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-slate-700 mb-1">Employee</label>
                <select
                  value={filters.employee_id}
                  onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Employees</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setFilters({ employee_id: '', status: '', date_from: '', date_to: '' })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Requests Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : displayRequests.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
              <p>No leave requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Employee</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">From</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">To</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Reason</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-700">Submitted</th>
                    {activeTab === 'pending' && (
                      <th className="px-4 py-3 text-left font-medium text-slate-700">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayRequests.map((req) => {
                    const StatusIcon = STATUS_ICONS[req.status];
                    return (
                      <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium">{req.employee_name}</td>
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
                        {activeTab === 'pending' && (
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(req)}
                                className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(req)}
                                className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Remarks Modal */}
        {showRemarksModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-900">
                  {actionType === 'approve' ? 'Approve' : 'Reject'} Leave Request
                </h3>
              </div>
              <div className="p-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (optional)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder={actionType === 'approve' ? 'Add any notes for approval...' : 'Add reason for rejection...'}
                />
              </div>
              <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowRemarksModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={submitting}
                  className={`px-4 py-2 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${
                    actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeaveManagementPage;
