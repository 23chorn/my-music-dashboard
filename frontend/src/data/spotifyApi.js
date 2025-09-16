const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Create playlist from top tracks
export async function createPlaylistFromTopTracks(period, limit) {
  const res = await fetch(`${API_BASE_URL}/api/spotify/create-playlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      period,
      limit
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create playlist');
  }

  return await res.json();
}

// Sync new tracks from Spotify
export async function syncNewTracksFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/spotify/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      force: false
    }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to sync tracks');
  }

  return await res.json();
}

// Get Spotify sync status
export async function getSpotifyStatusFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/spotify/status`);
  if (!res.ok) throw new Error('Failed to fetch Spotify status');
  return await res.json();
}