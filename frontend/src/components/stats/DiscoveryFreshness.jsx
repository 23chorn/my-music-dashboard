import { useState } from 'react';
import StatCard from "./StatCard";
import StatPopup from "../common/StatPopup";

export default function DiscoveryFreshness({ discoveryData }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupType, setPopupType] = useState('');
  const [popupData, setPopupData] = useState([]);
  const [loading, setLoading] = useState(false);

  const {
    hoursSinceNewTrack,
    hoursSinceNewArtist,
    hoursSinceNewAlbum
  } = discoveryData;

  // Format time display function
  const formatTime = (hours) => {
    if (hours === null || hours === undefined) return 'N/A';
    
    if (hours < 1) {
      return '0h';
    } else if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = (hours / 24);
      return `${days.toFixed(1)}d`;
    }
  };

  // Get color based on time since discovery
  const getColor = (hours) => {
    if (hours === null || hours === undefined) return 'text-surface-400';
    
    const days = hours / 24;
    if (days < 5) return 'text-success-400';
    if (days <= 14) return 'text-amber-400';
    return 'text-danger-400';
  };

  const handleCardClick = async (type) => {
    setPopupType(type);
    setPopupOpen(true);
    setLoading(true);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${API_BASE_URL}/api/recent-discoveries/${type}?limit=5`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setPopupData(data);
    } catch (error) {
      console.error(`Failed to fetch recent ${type}s:`, error);
      setPopupData([]);
    } finally {
      setLoading(false);
    }
  };

  const closePopup = () => {
    setPopupOpen(false);
    setPopupData([]);
    setPopupType('');
  };

  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Discovery Freshness</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="New Track" 
          value={formatTime(hoursSinceNewTrack)} 
          subtitle="time since last discovered"
          color={getColor(hoursSinceNewTrack)}
          onClick={() => handleCardClick('tracks')}
          clickable={true}
        />
        <StatCard 
          title="New Artist" 
          value={formatTime(hoursSinceNewArtist)} 
          subtitle="time since last discovered"
          color={getColor(hoursSinceNewArtist)}
          onClick={() => handleCardClick('artists')}
          clickable={true}
        />
        <StatCard 
          title="New Album" 
          value={formatTime(hoursSinceNewAlbum)} 
          subtitle="time since last discovered"
          color={getColor(hoursSinceNewAlbum)}
          onClick={() => handleCardClick('albums')}
          clickable={true}
        />
      </div>

      <StatPopup 
        isOpen={popupOpen} 
        onClose={closePopup}
        title={`Recent ${popupType === 'tracks' ? 'Track' : popupType === 'artists' ? 'Artist' : 'Album'} Discoveries`}
        type={popupType === 'tracks' ? 'track' : popupType === 'artists' ? 'artist' : 'album'}
      >
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-pulse text-surface-400">Loading recent discoveries...</div>
          </div>
        ) : popupData.length > 0 ? (
          popupData.map((item, index) => (
            <div key={item.id || index} className="bg-surface-800 rounded p-3 border border-surface-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-white mb-1">
                    {popupType === 'tracks' ? item.track_name : 
                     popupType === 'artists' ? item.artist_name : 
                     item.album_name}
                  </h4>
                  {popupType === 'tracks' && (
                    <p className="text-sm text-surface-400">
                      by {item.artist_name}
                      {item.album_name && ` • ${item.album_name}`}
                    </p>
                  )}
                  {popupType === 'albums' && item.artist_name && (
                    <p className="text-sm text-surface-400">by {item.artist_name}</p>
                  )}
                  <p className="text-xs text-surface-500 mt-1">
                    First played: {new Date(item.first_played_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-4 text-surface-400">
            No recent discoveries found
          </div>
        )}
      </StatPopup>
    </div>
  );
}