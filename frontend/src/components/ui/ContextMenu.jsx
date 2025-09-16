import { useState, useEffect, useRef } from 'react';
import { FaSpotify, FaExternalLinkAlt } from 'react-icons/fa';

export default function ContextMenu({
  children,
  entityId,
  entityType = 'track',
  entityName = '',
  className = ''
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [spotifyData, setSpotifyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);
  const touchTimeoutRef = useRef(null);

  // Show context menu at given position
  const showContextMenu = async (x, y) => {
    // Adjust position to keep menu visible
    const menuWidth = 200;
    const menuHeight = 100;
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

    setMenuPos({ x: adjustedX, y: adjustedY });
    setShowMenu(true);

    // Fetch Spotify URL if we have an entity ID
    if (entityId) {
      setLoading(true);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
        const response = await fetch(`${API_BASE_URL}/api/spotify/entity-url?id=${entityId}&type=${entityType}`);
        if (response.ok) {
          const data = await response.json();
          setSpotifyData(data);
        } else {
          // Handle 404 or other errors - set empty data to show "not available"
          setSpotifyData({ error: true });
        }
      } catch (error) {
        console.error('Failed to fetch Spotify URL:', error);
      }
      setLoading(false);
    }
  };

  // Handle right-click (desktop)
  const handleContextMenu = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY);
  };

  // Handle touch start (mobile long press)
  const handleTouchStart = (e) => {
    // Clear any existing timeout
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }

    // Set timeout for long press (500ms)
    touchTimeoutRef.current = setTimeout(() => {
      const touch = e.touches[0];
      if (touch) {
        // Prevent default touch behavior and show context menu
        e.preventDefault();
        showContextMenu(touch.clientX, touch.clientY);
      }
    }, 500);
  };

  // Handle touch end/cancel - clear timeout if touch released early
  const handleTouchEnd = () => {
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
      touchTimeoutRef.current = null;
    }
  };

  // Handle click outside to close menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenSpotify = () => {
    if (spotifyData) {
      // Use Spotify URI to open in desktop app instead of web browser
      window.location.href = spotifyData.spotifyUri;
    }
    setShowMenu(false);
  };

  const handleCopyName = () => {
    if (entityName) {
      navigator.clipboard.writeText(entityName);
    }
    setShowMenu(false);
  };

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`${className}`}
      >
        {children}
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-50 py-1 min-w-[180px]"
          style={{ left: menuPos.x, top: menuPos.y }}
        >
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Checking Spotify...
            </div>
          ) : spotifyData && !spotifyData.error ? (
            <button
              onClick={handleOpenSpotify}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              <FaSpotify className="text-green-500" size={14} />
              Open in Spotify
            </button>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
              Not available on Spotify
            </div>
          )}

          {entityName && (
            <button
              onClick={handleCopyName}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-600"
            >
              <FaExternalLinkAlt size={12} />
              Copy "{entityName.length > 20 ? entityName.substring(0, 20) + '...' : entityName}"
            </button>
          )}
        </div>
      )}
    </>
  );
}