import React, { useState, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/contexts/ChatContext';
import { Edit2, Trash2, File as FileIcon, Download, Smile } from 'lucide-react';

const EmojiReactionPicker = lazy(() => import('./EmojiReactionPicker'));

const QUICK_REACTIONS = ['👍', '❤️', '😂'];

const formatTime = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-MY', {
      timeZone: 'Asia/Kuala_Lumpur',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const MENTION_REGEX = /@([A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)?)/g;

const renderMentionedContent = (content, currentUserFullName) => {
  if (!content) return content;
  const parts = [];
  let lastIndex = 0;
  let match;
  const regex = new RegExp(MENTION_REGEX);
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }
    const mentionText = match[0];
    const mentionName = match[1];
    const isSelf = currentUserFullName && mentionName === currentUserFullName;
    parts.push(
      <span
        key={`mention-${match.index}`}
        className={isSelf ? 'bg-yellow-100 text-yellow-800 rounded px-0.5' : 'font-medium text-blue-700'}
      >
        {mentionText}
      </span>
    );
    lastIndex = match.index + mentionText.length;
  }
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }
  return parts;
};

const AttachmentRenderer = ({ attachment }) => {
  if (!attachment) return null;
  const isImage = attachment.mime_type?.startsWith('image/') || attachment.is_gif;
  if (isImage) {
    return (
      <img
        src={attachment.url}
        alt={attachment.filename || 'image'}
        className="max-h-72 rounded-lg mt-2 cursor-pointer"
        onClick={() => window.open(attachment.url, '_blank')}
        data-testid={`message-attachment-image-${attachment.filename}`}
      />
    );
  }
  return (
    <div className="mt-2 flex items-center gap-2 p-2 border border-slate-200 rounded-lg bg-slate-50">
      <FileIcon className="w-5 h-5 text-slate-400 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-700 truncate">{attachment.filename}</p>
        {attachment.file_size > 0 && (
          <p className="text-xs text-slate-400">{formatFileSize(attachment.file_size)}</p>
        )}
      </div>
      <a
        href={attachment.url}
        download
        className="ml-auto p-1 text-slate-400 hover:text-blue-700"
        data-testid={`message-attachment-download-${attachment.filename}`}
      >
        <Download className="w-4 h-4" />
      </a>
    </div>
  );
};

const MessageBubble = ({ message, onEdit, onDelete }) => {
  const { user } = useAuth();
  const { toggleReaction } = useChat();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isOwn = message.sender_id === user?.id;
  const canDelete = isOwn || user?.role === 'admin' || user?.role === 'boss';
  const reactions = message.reactions || [];

  const handleToggleReaction = (emoji) => {
    toggleReaction(message.id, message.channel_id, emoji);
    setShowEmojiPicker(false);
  };

  const handleSaveEdit = () => {
    const trimmed = editContent.trim();
    if (!trimmed) return;
    onEdit(message.id, trimmed);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content || '');
    setEditing(false);
  };

  if (message.deleted) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`}>
        <div
          className={`max-w-[70%] px-3 py-2 rounded-lg ${
            isOwn ? 'bg-blue-50' : 'bg-white border border-slate-200'
          }`}
          data-testid={`message-bubble-${message.id}`}
        >
          <p className="text-sm italic text-slate-400">This message was deleted</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2 group`} data-testid={`message-bubble-${message.id}`}>
      <div
        className={`max-w-[70%] px-3 py-2 rounded-lg ${
          isOwn ? 'bg-blue-50' : 'bg-white border border-slate-200'
        }`}
      >
        {!isOwn && (
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-slate-800">{message.sender_name}</span>
            {message.sender_role && (
              <span className="text-xs text-slate-400 capitalize">{message.sender_role}</span>
            )}
          </div>
        )}
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              data-testid={`message-edit-input-${message.id}`}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="text-xs font-medium text-blue-700 hover:text-blue-600"
                data-testid={`message-edit-save-${message.id}`}
              >
                Save
              </button>
              <button
                onClick={handleCancelEdit}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
                data-testid={`message-edit-cancel-${message.id}`}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {message.content && (
              <p className="text-sm text-slate-700 break-words whitespace-pre-wrap">
                {renderMentionedContent(message.content, user?.full_name)}
              </p>
            )}
            <AttachmentRenderer attachment={message.attachment} />
            {reactions.filter(r => r.users?.length > 0).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {reactions.filter(r => r.users?.length > 0).map((r) => {
                  const reacted = user?.id && r.users.includes(user.id);
                  return (
                    <button
                      key={r.emoji}
                      onClick={() => handleToggleReaction(r.emoji)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                        reacted
                          ? 'bg-blue-100 border-blue-300 text-blue-700'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                      data-testid={`message-reaction-pill-${message.id}-${r.emoji}`}
                    >
                      <span>{r.emoji}</span>
                      <span>{r.users.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">
                {formatTime(message.created_at)}
                {message.edited_at && <span className="ml-1 italic">(edited)</span>}
              </span>
              <div className={`relative flex gap-1 transition-opacity ${showEmojiPicker ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleToggleReaction(emoji)}
                    className="p-1 text-sm hover:scale-125 transition-transform"
                    data-testid={`quick-reaction-${message.id}-${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                  data-testid={`message-react-btn-${message.id}`}
                >
                  <Smile className="w-3.5 h-3.5" />
                </button>
                {showEmojiPicker && (
                  <Suspense fallback={null}>
                    <EmojiReactionPicker
                      onSelect={handleToggleReaction}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </Suspense>
                )}
                {isOwn && (
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                    data-testid={`message-edit-btn-${message.id}`}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-1 text-slate-400 hover:text-red-600"
                    data-testid={`message-delete-btn-${message.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
