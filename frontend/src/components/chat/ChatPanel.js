import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import MessageBubble from './MessageBubble';
import { Send, MessageSquare, Paperclip, X, Loader2 } from 'lucide-react';

const ChatPanel = ({ channel }) => {
  const { user } = useAuth();
  const { messages, sendMessage, uploadAttachment, sendTyping, markAsRead, setActiveChannelId, loadMessages } = useChat();
  const [input, setInput] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const channelMessages = channel ? messages[channel.id] || [] : [];

  const channelName = channel
    ? channel.type === 'dm'
      ? channel.other_user?.full_name || 'Direct Message'
      : channel.name
    : '';

  useEffect(() => {
    if (channel) {
      setActiveChannelId(channel.id);
      loadMessages(channel.id);
      markAsRead(channel.id);
    }
    return () => setActiveChannelId(null);
  }, [channel?.id]);

  useEffect(() => {
    if (channel && channelMessages.length > 0) {
      markAsRead(channel.id);
    }
  }, [channelMessages.length, channel?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages]);

  const handleSend = () => {
    const content = input.trim();
    if (!content && !pendingAttachment) return;
    if (!channel) return;
    sendMessage(channel.id, content, pendingAttachment);
    setInput('');
    setPendingAttachment(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (channel) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(channel.id);
      }, 300);
    }
  };

  const handleEditMessage = async (messageId, newContent) => {
    try {
      await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/messages/${messageId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ content: newContent })
        }
      );
    } catch (e) {}
  };

  const handleDeleteMessage = async (messageId) => {
    try {
      await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/messages/${messageId}`,
        { method: 'DELETE', credentials: 'include' }
      );
    } catch (e) {}
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !channel) return;
    setUploading(true);
    const result = await uploadAttachment(file, channel.id);
    setUploading(false);
    if (result) {
      setPendingAttachment(result);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCancelAttachment = () => {
    setPendingAttachment(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Select a channel or DM to start messaging</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 flex flex-col bg-slate-50 h-full">
      {/* Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200">
        <h3
          className="text-base font-semibold text-slate-900"
          style={{ fontFamily: 'Manrope, sans-serif' }}
          data-testid={`chat-header-${channel.id}`}
        >
          {channel.type === 'dm' ? (
            channel.other_user?.full_name || 'Direct Message'
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-slate-400">#</span>
              {channel.name}
            </span>
          )}
        </h3>
        {channel.type === 'dm' && channel.other_user?.role && (
          <p className="text-xs text-slate-500 capitalize mt-0.5">{channel.other_user.role}</p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {channelMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No messages yet. Start the conversation.
          </div>
        ) : (
          channelMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onEdit={handleEditMessage}
              onDelete={handleDeleteMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-slate-200">
        {uploading && (
          <div className="flex items-center gap-2 mb-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Uploading...
          </div>
        )}
        {pendingAttachment && !uploading && (
          <div className="flex items-center gap-2 mb-2 p-2 border border-slate-200 rounded-md bg-slate-50">
            {pendingAttachment.mime_type?.startsWith('image/') ? (
              <img
                src={pendingAttachment.url}
                alt={pendingAttachment.filename}
                className="h-10 w-10 object-cover rounded"
              />
            ) : (
              <div className="h-10 w-10 bg-slate-200 rounded flex items-center justify-center text-xs text-slate-500">
                <Paperclip className="w-4 h-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{pendingAttachment.filename}</p>
              <p className="text-xs text-slate-400">{formatFileSize(pendingAttachment.file_size)}</p>
            </div>
            <button
              onClick={handleCancelAttachment}
              className="p-1 text-slate-400 hover:text-slate-700"
              data-testid="cancel-attachment-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            data-testid="file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-slate-400 hover:text-slate-700 transition-colors"
            data-testid="attach-file-btn"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ maxHeight: '120px', minHeight: '40px' }}
            data-testid="chat-message-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() && !pendingAttachment}
            className="bg-blue-800 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-md px-3 py-2 text-sm font-medium transition-colors flex items-center gap-1.5"
            data-testid="chat-send-btn"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
