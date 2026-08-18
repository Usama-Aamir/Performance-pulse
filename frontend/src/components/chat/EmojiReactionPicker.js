import React, { useEffect, useRef } from 'react';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

const EmojiReactionPicker = ({ onSelect, onClose }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleEmojiSelect = (emoji) => {
    onSelect(emoji.native);
  };

  return (
    <div ref={containerRef} className="absolute z-50" data-testid="emoji-reaction-picker">
      <Picker
        data={data}
        onEmojiSelect={handleEmojiSelect}
        theme="light"
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  );
};

export default EmojiReactionPicker;
