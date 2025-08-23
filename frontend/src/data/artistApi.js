const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getArtistInfo(id) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}`);
  if (!res.ok) throw new Error('Failed to fetch artist info');
  return await res.json();
}

export async function getArtistTopTracks(id) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/top-tracks`);
  if (!res.ok) throw new Error('Failed to fetch top tracks');
  return await res.json();
}

export async function getArtistTopAlbums(id) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/top-albums`);
  if (!res.ok) throw new Error('Failed to fetch top albums');
  return await res.json();
}

export async function getArtistRecentPlays(id) {
  const res = await fetch(`${API_BASE_URL}/api/artist/${id}/recent-plays`);
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