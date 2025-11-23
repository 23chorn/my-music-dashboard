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

  // Detect if device is mobile (disable context menu on mobile)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0);

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

  // Handle right-click (desktop only)
  const handleContextMenu = async (e) => {
    // Only allow context menu on desktop browsers, not mobile
    if (isMobile) {
      return; // Don't prevent default on mobile, allow normal behavior
    }

    e.preventDefault();
    e.stopPropagation();
    showContextMenu(e.clientX, e.clientY);
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
        // Touch handlers removed for mobile - no long press
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