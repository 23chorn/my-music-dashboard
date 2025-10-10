const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getArtistInfo(id) {
  const res = await fetch(`${API_BASE_URL}/api/artists/${id}`);
  if (!res.ok) throw new Error('Failed to fetch artist info');
  return await res.json();
}

export async function getArtistTopTracks(id, limit, period) {
  const res = await fetch(`${API_BASE_URL}/api/artists/${id}/top-tracks?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top tracks');
  return await res.json();
}

export async function getArtistTopAlbums(id, limit, period) {
  const res = await fetch(`${API_BASE_URL}/api/artists/${id}/top-albums?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch top albums');
  return await res.json();
}

export async function getArtistRecentPlays(id, limit) {
  const res = await fetch(`${API_BASE_URL}/api/artists/${id}/recent-plays?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch recent plays');
  return await res.json();
}

export async function getArtistStats(id) {
  const res = await fetch(`${API_BASE_URL}/api/artists/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch artist stats');
  return await res.json();
}

export async function getArtistMilestones(id) {
  const res = await fetch(`${API_BASE_URL}/api/artists/${id}/milestones`);
  if (!res.ok) throw new Error('Failed to fetch artist milestones');
  return await res.json();
}

export async function getArtistDailyPlays(id, days) {
  const res = await fetch(`${API_BASE_URL}/api/artists/${id}/daily-plays?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch daily plays');
  return await res.json();
}

export async function getAllArtistsWithPlaycount(options = {}) {
  const { page = 1, limit = 50, sortBy = 'alpha', alphaCategory = null, minPlays = null, maxPlays = null } = options;
  
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', limit.toString());
  params.set('sortBy', sortBy);
  if (alphaCategory) {
    params.set('alphaCategory', alphaCategory);
  }
  if (minPlays !== null) {
    params.set('minPlays', minPlays.toString());
  }
  if (maxPlays !== null) {
    params.set('maxPlays', maxPlays.toString());
  }
  
  const res = await fetch(`${API_BASE_URL}/api/artists/all?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch all artists');
  return await res.json();
}

export const getAllArtists = getAllArtistsWithPlaycount;