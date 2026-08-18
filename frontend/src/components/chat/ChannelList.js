import React, { useState, useEffect } from 'react';
import { useAuth, API } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import UserPickerModal from './UserPickerModal';
import { Hash, Plus, MessageSquare } from 'lucide-react';

const ChannelList = ({ selectedChannelId, onSelectChannel }) => {
  const { user } = useAuth();
  const { unreadCounts, startDM } = useChat();
  const [channels, setChannels] = useState([]);
  const [dms, setDms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('public');
  const [showUserPicker, setShowUserPicker] = useState(false);

  const fetchData = async () => {
    try {
      const [chRes, dmRes] = await Promise.all([
        API.get('/channels'),
        API.get('/dms'),
      ]);
      setChannels((chRes.data || []).filter((c) => c.type !== 'dm'));
      setDms(dmRes.data || []);
    } catch (e) {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateChannel = async () => {
    const name = newChannelName.trim();
    if (!name) return;
    try {
      await API.post('/channels', { name, type: newChannelType, members: [] });
      setNewChannelName('');
      setShowCreate(false);
      fetchData();
    } catch (e) {
      // silent fail
    }
  };

  const handleSelectDMUser = async (targetUser) => {
    setShowUserPicker(false);
    const dm = await startDM(targetUser.id);
    console.log('DM created:', dm);
    console.log('Calling onSelectChannel with:', dm?.id);
    if (dm) {
      fetchData();
      onSelectChannel(dm);
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'boss';

  return (
    <div className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-3 border-b border-slate-200">
        <h2
          className="text-base font-semibold text-slate-900"
          style={{ fontFamily: 'Manrope, sans-serif' }}
        >
          Messages
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* CHANNELS section */}
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Channels
            </span>
            {isAdmin && (
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="p-0.5 text-slate-400 hover:text-slate-700"
                data-testid="create-channel-btn"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {showCreate && (
            <div className="mb-2 p-2 border border-slate-200 rounded-md space-y-2">
              <input
                type="text"
                placeholder="Channel name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="new-channel-name-input"
              />
              <select
                value={newChannelType}
                onChange={(e) => setNewChannelType(e.target.value)}
                className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="new-channel-type-select"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleCreateChannel}
                  className="flex-1 bg-blue-800 hover:bg-blue-700 text-white text-xs font-medium rounded px-2 py-1.5 transition-colors"
                  data-testid="new-channel-create-btn"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700"
                  data-testid="new-channel-cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-xs text-slate-400 py-2">Loading...</div>
          ) : (
            <div className="space-y-0.5">
              {channels.map((ch) => {
                const isActive = selectedChannelId === ch.id;
                const unread = unreadCounts[ch.id] || 0;
                return (
                  <button
                    key={ch.id}
                    onClick={() => onSelectChannel(ch)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-800 font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    data-testid={`channel-item-${ch.id}`}
                  >
                    <Hash className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-800' : 'text-slate-400'}`} />
                    <span className="truncate flex-1 text-left">{ch.name}</span>
                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-amber-400 text-white text-xs font-semibold rounded-full">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* DIRECT MESSAGES section */}
        <div className="px-3 pt-4 pb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
              Direct Messages
            </span>
            <button
              onClick={() => setShowUserPicker(true)}
              className="p-0.5 text-slate-400 hover:text-slate-700"
              data-testid="create-dm-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {dms.length === 0 ? (
            <div className="text-xs text-slate-400 py-2">No conversations yet</div>
          ) : (
            <div className="space-y-0.5">
              {dms.map((dm) => {
                const isActive = selectedChannelId === dm.id;
                const unread = unreadCounts[dm.id] || 0;
                const otherName = dm.other_user?.full_name || 'Unknown';
                return (
                  <button
                    key={dm.id}
                    onClick={() => onSelectChannel(dm)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-800 font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    data-testid={`dm-item-${dm.id}`}
                  >
                    <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-800' : 'text-slate-400'}`} />
                    <span className="truncate flex-1 text-left">{otherName}</span>
                    {unread > 0 && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-amber-400 text-white text-xs font-semibold rounded-full">
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showUserPicker && (
        <UserPickerModal
          onClose={() => setShowUserPicker(false)}
          onSelect={handleSelectDMUser}
        />
      )}
    </div>
  );
};

export default ChannelList;
