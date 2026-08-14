import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/contexts/AuthContext';
import { X, Search } from 'lucide-react';

const UserPickerModal = ({ onClose, onSelect }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await API.get('/users/dm-list');
        setUsers((res.data || []).filter((u) => u.id !== user?.id));
      } catch (e) {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [user]);

  const filtered = users.filter((u) => {
    const name = (u.full_name || '').toLowerCase();
    return name.includes(search.toLowerCase());
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
      data-testid="user-picker-modal"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3
            className="text-lg font-semibold text-slate-900"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            Start Direct Message
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700"
            data-testid="user-picker-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              data-testid="user-picker-search"
            />
          </div>

          {loading ? (
            <div className="text-center py-8 text-slate-500 text-sm">Loading users...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No users found</div>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  onClick={() => onSelect(u)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-slate-50 transition-colors text-left"
                  data-testid={`user-picker-item-${u.id}`}
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-blue-800 text-sm font-semibold">
                      {(u.full_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPickerModal;
