const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export async function getAlbumInfo(id) {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}`);
  if (!res.ok) throw new Error('Failed to fetch album info');
  return await res.json();
}

export async function getAlbumTopTracks(id, limit = 5, period = 'overall') {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}/top-tracks?limit=${limit}&period=${period}`);
  if (!res.ok) throw new Error('Failed to fetch album top tracks');
  return await res.json();
}

export async function getAlbumRecentPlays(id, limit = 5) {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}/recent-plays?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch album recent plays');
  return await res.json();
}

export async function getAlbumStats(id) {
  const res = await fetch(`${API_BASE_URL}/api/album/${id}/stats`);
  if (!res.ok) throw new Error('Failed to fetch album stats');
  return await res.json();
}