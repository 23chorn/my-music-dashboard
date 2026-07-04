import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FaSpotify, FaSpinner, FaChevronDown } from 'react-icons/fa';
import { createPlaylistFromTopTracks } from '../../data/spotifyApi';
import Toast from './Toast';

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function getQuickRanges() {
  const now = new Date();
  const today = toISODate(now);
  const daysAgo = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return toISODate(d);
  };
  const startOfMonth = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const startOfQuarter = toISODate(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1));
  const startOfYear = toISODate(new Date(now.getFullYear(), 0, 1));

  return [
    { label: 'Last 7 Days', startDate: daysAgo(6), endDate: today },
    { label: 'Last 30 Days', startDate: daysAgo(29), endDate: today },
    { label: 'This Month', startDate: startOfMonth, endDate: today },
    { label: 'QTD', startDate: startOfQuarter, endDate: today },
    { label: 'YTD', startDate: startOfYear, endDate: today },
  ];
}

export default function PlaylistButton({ limit, className = '' }) {
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntered(true));
    const handlePointer = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const runCreate = async (range) => {
    if (isCreating) return;
    setOpen(false);
    setIsCreating(true);
    setMessage('');

    try {
      const result = await createPlaylistFromTopTracks(range, limit);

      setMessageType('success');
      setMessage(`Created "${result.playlist.name}" with ${result.tracksAdded}/${result.totalTracks} tracks!`);

      // Open the playlist in Spotify desktop app
      if (result.playlist.uri) {
        window.location.href = result.playlist.uri;
      }
    } catch (error) {
      console.error('Failed to create playlist:', error);
      setMessageType('error');
      setMessage(`Failed to create playlist: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCustomRange = () => {
    if (!customStart || !customEnd) return;
    runCreate({ startDate: customStart, endDate: customEnd, label: `${customStart} to ${customEnd}` });
    setCustomStart('');
    setCustomEnd('');
  };

  const quickRanges = getQuickRanges();

  const renderMenuBody = (compact) => (
    <>
      <div className={`${compact ? 'px-3 py-1' : 'px-4 py-1.5'} font-display text-[10px] uppercase tracking-wide text-surface-500`}>Quick Range</div>
      {quickRanges.map(range => (
        <button
          key={range.label}
          onClick={() => runCreate(range)}
          className={`block w-full text-left font-mono transition-colors text-surface-300 hover:bg-surface-700 hover:text-surface-100 ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-sm'
          }`}
        >
          {range.label}
        </button>
      ))}

      <div className="my-1 border-t border-surface-700" />
      <div className={`${compact ? 'px-3 py-1' : 'px-4 py-1.5'} font-display text-[10px] uppercase tracking-wide text-surface-500`}>Custom Range</div>
      <div className={`flex items-center gap-1.5 py-1.5 ${compact ? 'px-3' : 'px-4'}`}>
        <input
          type="date"
          value={customStart}
          onChange={e => setCustomStart(e.target.value)}
          max={toISODate(new Date())}
          className={`min-w-0 flex-1 bg-surface-900 border border-surface-700 rounded-sm text-surface-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-400/60 ${
            compact ? 'text-[11px] px-1.5 py-1' : 'text-xs px-1.5 py-1.5'
          }`}
        />
        <span className="text-surface-600">–</span>
        <input
          type="date"
          value={customEnd}
          onChange={e => setCustomEnd(e.target.value)}
          max={toISODate(new Date())}
          className={`min-w-0 flex-1 bg-surface-900 border border-surface-700 rounded-sm text-surface-100 font-mono focus:outline-none focus:ring-1 focus:ring-brand-400/60 ${
            compact ? 'text-[11px] px-1.5 py-1' : 'text-xs px-1.5 py-1.5'
          }`}
        />
      </div>
      <div className={`pt-0.5 ${compact ? 'px-3 pb-1.5' : 'px-4 pb-2'}`}>
        <button
          onClick={handleCustomRange}
          disabled={!customStart || !customEnd}
          className={`w-full text-center font-mono rounded-sm bg-brand-600 hover:bg-brand-700 disabled:bg-surface-700 disabled:text-surface-500 text-white transition-colors ${
            compact ? 'px-2 py-1 text-xs' : 'px-2 py-2 text-sm'
          }`}
        >
          Generate
        </button>
      </div>
    </>
  );

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isCreating}
        className="flex items-center gap-1.5 h-full px-2.5 py-1.5 font-mono text-xs text-surface-300 hover:text-surface-100 hover:bg-surface-700/50 disabled:text-surface-600 transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-400/60"
        title={`Create a Spotify playlist from your top ${limit} tracks in any date range`}
      >
        {isCreating ? (
          <FaSpinner className="animate-spin" size={12} />
        ) : (
          <FaSpotify size={12} className="text-success-400" />
        )}
        <span className="hidden sm:inline whitespace-nowrap">{isCreating ? 'Creating…' : 'Playlist'}</span>
        <FaChevronDown size={7} className={`text-surface-500 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Desktop: anchored popover, unchanged */}
      {open && (
        <div className="hidden sm:block absolute right-0 z-30 mt-1 w-64 bg-surface-800 border border-surface-700 rounded shadow-xl py-1.5">
          {renderMenuBody(true)}
        </div>
      )}

      {/* Mobile: bottom sheet, portaled to body so it always spans the full screen width */}
      {open && createPortal(
        <div className="sm:hidden">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${entered ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 max-h-[75vh] overflow-y-auto bg-surface-800 border-t border-surface-700 rounded-t-xl shadow-2xl py-2 transition-transform duration-200 ease-out ${entered ? 'translate-y-0' : 'translate-y-full'}`}
          >
            {renderMenuBody(false)}
          </div>
        </div>,
        document.body
      )}

      {message && (
        <Toast message={message} type={messageType} onDismiss={() => setMessage('')} />
      )}
    </div>
  );
}
