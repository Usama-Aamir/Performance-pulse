import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

const API_BASE = `${process.env.REACT_APP_BACKEND_URL}/api`;

const buildWsUrl = () => {
  return process.env.REACT_APP_BACKEND_URL
    .replace('https://', 'wss://')
    .replace('http://', 'ws://') + '/ws/chat';
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
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
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        const { type } = data;

        if (type === 'new_message') {
          const msg = data.message;
          const chId = msg.channel_id;
          setMessages(prev => ({
            ...prev,
            [chId]: [...(prev[chId] || []), msg],
          }));
          if (activeChannelIdRef.current !== chId) {
            setUnreadCounts(prev => ({
              ...prev,
              [chId]: (prev[chId] || 0) + 1,
            }));
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
  }, [fetchUnreadCounts]);

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

  const sendMessage = useCallback((channelId, content) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', channel_id: channelId, content }));
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
        return await res.json();
      }
    } catch (e) {
      // silent fail
    }
    return null;
  }, []);

  return (
    <ChatContext.Provider
      value={{
        connected,
        reconnecting,
        unreadCounts,
        messages,
        activeChannelId,
        sendMessage,
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
