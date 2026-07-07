import React from 'react';

const configs = {
  // User status
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  // Report review status
  submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  reviewed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  needs_correction: 'bg-red-100 text-red-800 border-red-200',
  // Task status
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'in progress': 'bg-blue-100 text-blue-800 border-blue-200',
  'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
  delayed: 'bg-red-100 text-red-800 border-red-200',
  // Roles
  employee: 'bg-slate-100 text-slate-700 border-slate-200',
  admin: 'bg-purple-100 text-purple-800 border-purple-200',
  boss: 'bg-blue-100 text-blue-800 border-blue-200',
};

const labels = {
  needs_correction: 'Needs Correction',
  in_progress: 'In Progress',
};

const StatusBadge = ({ status, className = '' }) => {
  if (!status) return null;
  const key = status.toLowerCase().replace(/ /g, '_');
  const cls = configs[key] || configs[status.toLowerCase()] || 'bg-slate-100 text-slate-700 border-slate-200';
  const label = labels[key] || status.replace(/_/g, ' ');

  return (
    <span
      data-testid={`status-badge-${key}`}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize ${cls} ${className}`}
    >
      {label}
    </span>
  );
};

export default StatusBadge;
