const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getAlbumInfo(id) {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}`);
  if (!res.ok) throw new Error('Failed to fetch album info');
  return await res.json();
}

export async function getAlbumTopTracks(id, limit, period) {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}/top-tracks?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch album top tracks');
  return await res.json();
}

export async function getAlbumRecentPlays(id, limit) {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}/recent-plays?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch album recent plays');
  return await res.json();
}

export async function getAlbumStats(id) {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch album stats');
  return await res.json();
}

export async function getAlbumTracklist(id, sortBy = 'trackNumber') {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}/tracklist?sortBy=${sortBy}`);
  if (!res.ok) throw new Error('Failed to fetch album tracklist');
  return await res.json();
}

export async function getAllAlbumsWithPlaycount(options = {}) {
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
  
  const res = await fetch(`${API_BASE_URL}/api/album/all?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch all albums');
  return await res.json();
}