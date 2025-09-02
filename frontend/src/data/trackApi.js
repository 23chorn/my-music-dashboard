const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getTrackInfo(id) {
  const res = await fetch(`${API_BASE_URL}/api/track/${id}`);
  if (!res.ok) throw new Error('Failed to fetch track info');
  return await res.json();
}

export async function getTrackRecentPlays(id, limit) {
  const res = await fetch(`${API_BASE_URL}/api/track/${id}/recent-plays?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch track recent plays');
  return await res.json();
}

export async function getTrackStats(id) {
  const res = await fetch(`${API_BASE_URL}/api/track/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch track stats');
  return await res.json();
}

export async function getTrackDailyPlays(id, days) {
  const res = await fetch(`${API_BASE_URL}/api/track/${id}/daily-plays?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch track daily plays');
  return await res.json();
}

export async function getAllTracksWithPlaycount() {
  const res = await fetch(`${API_BASE_URL}/api/track/all`);
  if (!res.ok) throw new Error('Failed to fetch all tracks');
  return await res.json();
}