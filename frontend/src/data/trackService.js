const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

class TrackService {
  
  async getTrackInfo(trackId) {
    const response = await fetch(`${API_BASE_URL}/api/track/${trackId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch track info: ${response.statusText}`);
    }
    return response.json();
  }

  async getTrackRecentPlays(trackId, limit = 10) {
    const response = await fetch(`${API_BASE_URL}/api/track/${trackId}/recent-plays?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch track recent plays: ${response.statusText}`);
    }
    return response.json();
  }

  async getTrackStats(trackId) {
    const response = await fetch(`${API_BASE_URL}/api/track/${trackId}/stats`);
    if (!response.ok) {
      throw new Error(`Failed to fetch track stats: ${response.statusText}`);
    }
    return response.json();
  }

  async getTrackDailyPlays(trackId, days = 90) { // Default maintained for backwards compatibility
    const response = await fetch(`${API_BASE_URL}/api/track/${trackId}/daily-plays?days=${days}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch track daily plays: ${response.statusText}`);
    }
    return response.json();
  }
}

export const trackService = new TrackService();