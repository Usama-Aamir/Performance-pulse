import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, X } from 'lucide-react';

const GIPHY_API_KEY = process.env.REACT_APP_GIPHY_API_KEY;
const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';

const GifPicker = ({ onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      if (!res.ok) throw new Error('Failed to fetch trending GIFs');
      const data = await res.json();
      setGifs(data.data || []);
    } catch (e) {
      setError('Failed to load GIFs');
    }
    setLoading(false);
  }, []);

  const fetchSearch = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${GIPHY_BASE}/search?q=${encodeURIComponent(q)}&api_key=${GIPHY_API_KEY}&limit=20&rating=g`
      );
      if (!res.ok) throw new Error('Failed to search GIFs');
      const data = await res.json();
      setGifs(data.data || []);
    } catch (e) {
      setError('Failed to search GIFs');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      fetchTrending();
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetchSearch(query.trim());
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchTrending, fetchSearch]);

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

  const handleGifClick = (gif) => {
    onSelect({
      url: gif.images.original.url,
      filename: gif.title || 'gif.gif',
      file_size: 0,
      mime_type: 'image/gif',
      storage_path: null,
      is_gif: true,
    });
  };

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 flex flex-col"
      style={{ maxHeight: '320px' }}
      data-testid="gif-picker"
    >
      <div className="flex items-center gap-2 p-2 border-b border-slate-200">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="flex-1 text-sm outline-none bg-transparent"
          data-testid="gif-search-input"
          autoFocus
        />
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700"
          data-testid="gif-picker-close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <p className="text-center py-8 text-sm text-slate-400">{error}</p>
        ) : gifs.length === 0 ? (
          <p className="text-center py-8 text-sm text-slate-400">No GIFs found</p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => handleGifClick(gif)}
                className="relative overflow-hidden rounded hover:opacity-80 transition-opacity"
                data-testid={`gif-item-${gif.id}`}
              >
                <img
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title || 'GIF'}
                  className="w-full h-20 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GifPicker;
