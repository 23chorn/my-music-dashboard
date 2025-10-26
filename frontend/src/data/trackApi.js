const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getTrackInfo(id) {
  const res = await fetch(`${API_BASE_URL}/api/tracks/${id}`);
  if (!res.ok) throw new Error('Failed to fetch track info');
  return await res.json();
}

export async function getTrackRecentPlays(id, limit) {
  const res = await fetch(`${API_BASE_URL}/api/tracks/${id}/recent-plays?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch track recent plays');
  return await res.json();
}

export async function getTrackStats(id) {
  const res = await fetch(`${API_BASE_URL}/api/tracks/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch track stats');
  return await res.json();
}

export async function getTrackDailyPlays(id, days) {
  const res = await fetch(`${API_BASE_URL}/api/tracks/${id}/daily-plays?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch track daily plays');
  return await res.json();
}

export async function getAllTracksWithPlaycount(options = {}) {
  const {
    page = 1,
    limit = 50,
    sortBy = 'alpha',
    alphaCategory = null,
    minPlays = null,
    maxPlays = null,
    releaseYearStart = null,
    releaseYearEnd = null
  } = options;

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
  if (releaseYearStart !== null) {
    params.set('releaseYearStart', releaseYearStart.toString());
  }
  if (releaseYearEnd !== null) {
    params.set('releaseYearEnd', releaseYearEnd.toString());
  }

  const res = await fetch(`${API_BASE_URL}/api/tracks/all?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch all tracks');
  return await res.json();
}

export const getAllTracks = getAllTracksWithPlaycount;