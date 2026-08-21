import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const buildWsUrl = () => {
  return process.env.REACT_APP_BACKEND_URL
    .replace('https://', 'wss://')
    .replace('http://', 'ws://') + '/ws/chat';
};

let _audioCtx = null;
const getAudioContext = () => {
  if (!_audioCtx) {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
};

const playPing = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // AudioContext unavailable or blocked - silent fail
  }
};

const requestNotificationPermission = () => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
};

const isTabHidden = () => document.hidden || document.visibilityState !== 'visible';

const showBrowserNotification = (title, body, onClick) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, icon: '/favicon.ico' });
    n.onclick = () => {
      window.focus();
      onClick?.();
      n.close();
    };
  } catch (e) {
    // silent fail
  }
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [messages, setMessages] = useState({});
  const [activeChannelId, setActiveChannelIdState] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const activeChannelIdRef = useRef(null);
  const mountedRef = useRef(true);
  const userRef = useRef(null);
  const messagesRef = useRef({});
  const channelsMetaRef = useRef({});

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/channels/unread-counts`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCounts(data);
      }
    } catch (e) {
      // silent fail — will retry on next reconnect
    }
  }, []);

  const fetchChannelsMeta = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/channels`, { credentials: 'include' });
      if (res.ok) {
        const channels = await res.json();
        const meta = {};
        for (const ch of channels) {
          meta[ch.id] = {
            name: ch.type === 'dm' ? (ch.other_user?.full_name || 'Direct Message') : ch.name,
            type: ch.type,
          };
        }
        channelsMetaRef.current = { ...channelsMetaRef.current, ...meta };
      }
    } catch (e) {
      // silent fail — notification titles fall back to a generic label
    }
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      setReconnecting(false);
      reconnectAttemptsRef.current = 0;
      fetchUnreadCounts();
      fetchChannelsMeta();
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const { type } = data;

        if (type === 'new_message') {
          const msg = data.message;
          const chId = msg.channel_id;
          const isOwn = msg.sender_id === userRef.current?.id;
          const isViewingChannel = activeChannelIdRef.current === chId;

          setMessages(prev => ({
            ...prev,
            [chId]: [...(prev[chId] || []), msg],
          }));
          if (!isViewingChannel) {
            setUnreadCounts(prev => ({
              ...prev,
              [chId]: (prev[chId] || 0) + 1,
            }));
          }

          if (!isOwn && !isViewingChannel) {
            playPing();
          }
          if (!isOwn && isTabHidden()) {
            const meta = channelsMetaRef.current[chId];
            const title = meta?.type === 'dm' ? (msg.sender_name || 'New message') : `#${meta?.name || 'channel'}`;
            const body = (msg.content || '').slice(0, 100);
            showBrowserNotification(title, body, () => navigate('/messages'));
          }
        } else if (type === 'message_edited') {
          const msg = data.message;
          const chId = msg.channel_id;
          setMessages(prev => {
            const arr = prev[chId] || [];
            return {
              ...prev,
              [chId]: arr.map(m => m.id === msg.id ? msg : m),
            };
          });
        } else if (type === 'message_deleted') {
          const { message_id, channel_id } = data;
          setMessages(prev => {
            const arr = prev[channel_id] || [];
            return {
              ...prev,
              [channel_id]: arr.map(m =>
                m.id === message_id ? { ...m, deleted: true, content: null } : m
              ),
            };
          });
        } else if (type === 'unread_update') {
          const { channel_id, count } = data;
          setUnreadCounts(prev => ({
            ...prev,
            [channel_id]: count,
          }));
        } else if (type === 'reaction_update') {
          const { message_id, channel_id, reactions } = data;
          const prevArr = messagesRef.current[channel_id] || [];
          const existingMsg = prevArr.find(m => m.id === message_id);
          const prevReactions = existingMsg?.reactions || [];
          const isOwnMessage = existingMsg?.sender_id === userRef.current?.id;

          setMessages(prev => {
            const arr = prev[channel_id] || [];
            return {
              ...prev,
              [channel_id]: arr.map(m =>
                m.id === message_id ? { ...m, reactions } : m
              ),
            };
          });

          if (isOwnMessage) {
            let addedEmoji = null;
            for (const r of reactions) {
              const prevEntry = prevReactions.find(pr => pr.emoji === r.emoji);
              const prevCount = prevEntry?.users?.length || 0;
              if ((r.users?.length || 0) > prevCount) {
                addedEmoji = r.emoji;
                break;
              }
            }
            if (addedEmoji) {
              playPing();
              if (isTabHidden()) {
                showBrowserNotification('New reaction', `${addedEmoji} on your message`, () => navigate('/messages'));
              }
            }
          }
        }
      } catch (e) {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      setReconnecting(true);
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectAttemptsRef.current += 1;
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will handle reconnect
    };
  }, [fetchUnreadCounts, fetchChannelsMeta, navigate]);

  useEffect(() => {
    if (!user) {
      setConnected(false);
      setReconnecting(false);
      setUnreadCounts({});
      setMessages({});
      return;
    }

    mountedRef.current = true;
    fetchUnreadCounts();
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user, connect, fetchUnreadCounts]);

  const sendMessage = useCallback((channelId, content, attachment = null) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', channel_id: channelId, content, attachment }));
    }
  }, []);

  const uploadAttachment = useCallback(async (file, channelId) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('channel_id', channelId);
      const res = await fetch(`${API_BASE}/chat/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // silent fail
    }
    return null;
  }, []);

  const toggleReaction = useCallback(async (messageId, channelId, emoji) => {
    try {
      await fetch(`${API_BASE}/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });
    } catch (e) {
      // silent fail — WS reaction_update will not fire, UI stays unchanged
    }
  }, []);

  const sendTyping = useCallback((channelId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', channel_id: channelId }));
    }
  }, []);

  const markAsRead = useCallback(async (channelId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'read', channel_id: channelId }));
    }
    setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
  }, []);

  const loadMessages = useCallback(async (channelId) => {
    try {
      const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => ({ ...prev, [channelId]: data }));
        return data;
      }
    } catch (e) {
      // silent fail
    }
    return [];
  }, []);

  const setActiveChannelId = useCallback((channelId) => {
    activeChannelIdRef.current = channelId;
    setActiveChannelIdState(channelId);
    if (channelId) {
      setUnreadCounts(prev => ({ ...prev, [channelId]: 0 }));
    }
  }, []);

  const startDM = useCallback(async (targetUserId) => {
    try {
      const res = await fetch(`${API_BASE}/dms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: targetUserId }),
      });
      if (res.ok) {
        const dm = await res.json();
        fetchChannelsMeta();
        if (wsRef.current) {
          wsRef.current.onclose = null; // prevent reconnect loop
          wsRef.current.close();
          wsRef.current = null;
        }
        // Trigger a fresh connect after a short delay to allow
        // the close to complete
        setTimeout(() => {
          if (mountedRef.current) connect();
        }, 500);
        return dm;
      }
    } catch (e) {
      // silent fail
    }
    return null;
  }, [fetchChannelsMeta, connect]);

  return (
    <ChatContext.Provider
      value={{
        connected,
        reconnecting,
        unreadCounts,
        messages,
        activeChannelId,
        sendMessage,
        uploadAttachment,
        toggleReaction,
        sendTyping,
        markAsRead,
        loadMessages,
        setActiveChannelId,
        startDM,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
