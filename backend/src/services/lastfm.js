const axios = require('axios');

const API_KEY = process.env.VITE_LASTFM_API_KEY;
const USERNAME = process.env.VITE_LASTFM_USERNAME;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

async function fetchAllRecentTracks({ from }) {
  try {
    const params = {
      method: "user.getrecenttracks",
      user: USERNAME,
      api_key: API_KEY,
      format: "json",
      limit: 200,
      from
    };
    const response = await axios.get(BASE_URL, { params });
    const tracks = response.data.recenttracks?.track || [];
    // Map to your DB format if needed
    return tracks.map(t => ({
      track: t.name,
      artist: t.artist && (t.artist.name || t.artist['#text']),
      album: t.album && t.album['#text'],
      timestamp: t.date?.uts ? Number(t.date.uts) : null
    })).filter(t => t.timestamp);
  } catch (error) {
    console.error("Error fetching recent tracks from Last.fm:", error);
    return [];
  }
}

module.exports = {
  fetchAllRecentTracks
};