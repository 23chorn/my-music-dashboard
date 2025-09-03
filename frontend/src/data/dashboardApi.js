const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get unique counts and play count
export async function getUniqueCountsFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/unique-counts`);
  if (!res.ok) throw new Error('Failed to fetch unique counts');
  return await res.json();
}

// Get top artists
export async function getTopArtistsFromServer(limit, period) {
  const res = await fetch(`${API_BASE_URL}/api/artist/top?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top artists');
  return await res.json();
}

// Get top tracks
export async function getTopTracksFromServer(limit, period) {
  const res = await fetch(`${API_BASE_URL}/api/track/top?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top tracks');
  return await res.json();
}

// Get top albums
export async function getTopAlbumsFromServer(limit, period) {
  const res = await fetch(`${API_BASE_URL}/api/album/top?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top albums');
  return await res.json();
}

// Get recent tracks
export async function getRecentTracksFromServer(limit) {
  const res = await fetch(`${API_BASE_URL}/api/track/recent?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent tracks');
  return await res.json();
}

// Get user info
export async function getUserInfoFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/user-info`);
  if (!res.ok) throw new Error('Failed to fetch user info');
  return await res.json();
}

// Sync new tracks from Last.fm
export async function syncTracksFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/sync-tracks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Failed to sync tracks');
  return await res.json();
}

// Get daily play counts across all artists
export async function getDailyPlaysFromServer(days = 90) {
  const res = await fetch(`${API_BASE_URL}/api/analytics/daily-plays?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch daily plays');
  return await res.json();
}