const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Get unique counts and play count
export async function getUniqueCountsFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/unique-counts`);
  if (!res.ok) throw new Error('Failed to fetch unique counts');
  return await res.json();
}

// Get top artists
export async function getTopArtistsFromServer(limit = 5, period = "overall") {
  const res = await fetch(`${API_BASE_URL}/api/top-artists?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top artists');
  return await res.json();
}

// Get top tracks
export async function getTopTracksFromServer(limit = 5, period = "overall") {
  const res = await fetch(`${API_BASE_URL}/api/top-tracks?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top tracks');
  return await res.json();
}

// Get top albums
export async function getTopAlbumsFromServer(limit = 5, period = "overall") {
  const res = await fetch(`${API_BASE_URL}/api/top-albums?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top albums');
  return await res.json();
}

// Get recent tracks
export async function getRecentTracksFromServer(limit = 5) {
  const cacheBust = Date.now();
  const res = await fetch(`${API_BASE_URL}/api/recent-tracks?limit=${limit}&_=${cacheBust}`);
  if (!res.ok) throw new Error('Failed to fetch recent tracks');
  return await res.json();
}

// Get user info
export async function getUserInfoFromServer() {
  const res = await fetch(`${API_BASE_URL}/api/user-info`);
  if (!res.ok) throw new Error('Failed to fetch user info');
  return await res.json();
}