import { useState } from 'react';
import { FaSpotify, FaSpinner } from 'react-icons/fa';
import { createPlaylistFromTopTracks } from '../../data/spotifyApi';

export default function PlaylistButton({ period, limit, className = '' }) {
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');

  const handleCreatePlaylist = async () => {
    if (isCreating) return;

    setIsCreating(true);
    setMessage('');

    try {
      const result = await createPlaylistFromTopTracks(period, limit);

      setMessageType('success');
      setMessage(`Created "${result.playlist.name}" with ${result.tracksAdded}/${result.totalTracks} tracks!`);

      // Open the playlist in Spotify desktop app
      if (result.playlist.uri) {
        window.location.href = result.playlist.uri;
      }

      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);

    } catch (error) {
      console.error('Failed to create playlist:', error);
      setMessageType('error');
      setMessage(`Failed to create playlist: ${error.message}`);

      // Clear error message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsCreating(false);
    }
  };

  // Generate descriptive button text
  const getPeriodText = (period) => {
    const periodMap = {
      '7day': '7 Days',
      '1month': '1 Month',
      '3month': '3 Months',
      '6month': '6 Months',
      '12month': '1 Year',
      'overall': 'All Time'
    };
    return periodMap[period] || period;
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleCreatePlaylist}
        disabled={isCreating}
        className={`flex items-center gap-2 px-3 py-2 bg-highlight-600 hover:bg-highlight-700 disabled:bg-surface-600 text-white rounded-md font-medium transition-colors ${className}`}
        title={`Create Spotify playlist with top ${limit} tracks from ${getPeriodText(period)}`}
      >
        {isCreating ? (
          <>
            <FaSpinner className="animate-spin" size={14} />
            Creating...
          </>
        ) : (
          <>
            <FaSpotify size={14} />
            Create Playlist
          </>
        )}
      </button>

      {message && (
        <div className={`text-xs max-w-xs text-right ${
          messageType === 'success' ? 'text-success-400' : 'text-danger-400'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}