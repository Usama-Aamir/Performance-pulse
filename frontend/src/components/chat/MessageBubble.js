import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Edit2, Trash2, File as FileIcon, Download } from 'lucide-react';

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
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const isOwn = message.sender_id === user?.id;
  const canDelete = isOwn || user?.role === 'admin' || user?.role === 'boss';

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
              <p className="text-sm text-slate-700 break-words whitespace-pre-wrap">{message.content}</p>
            )}
            <AttachmentRenderer attachment={message.attachment} />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-slate-400">
                {formatTime(message.created_at)}
                {message.edited_at && <span className="ml-1 italic">(edited)</span>}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
