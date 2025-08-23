const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getArtistInfo(id) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}`);
  if (!res.ok) throw new Error('Failed to fetch artist info');
  return await res.json();
}

export async function getArtistTopTracks(id, limit = 5, period = 'overall') {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/top-tracks?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top tracks');
  return await res.json();
}

export async function getArtistTopAlbums(id, limit = 5, period = 'overall') {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/top-albums?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top albums');
  return await res.json();
}

export async function getArtistRecentPlays(id, limit = 5) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/recent-plays?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent plays');
  return await res.json();
}

export async function getArtistStats(id) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch artist stats');
  return await res.json();
}

export async function getArtistMilestones(id) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/milestones`);
  if (!res.ok) throw new Error('Failed to fetch artist milestones');
  return await res.json();
}

export async function getArtistDailyPlays(id, days = 30) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/daily-plays?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch daily plays');
  return await res.json();
}

export async function getAllArtistsWithPlaycount() {
  const res = await fetch(`${API_BASE_URL}/api/artist/all`);
  if (!res.ok) throw new Error('Failed to fetch all artists');
  return await res.json();
}