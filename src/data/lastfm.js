// Helper to cache results in localStorage
const ARTIST_CACHE_KEY = 'lastfm_unique_artists';
const TRACK_CACHE_KEY = 'lastfm_unique_tracks';

export async function fetchAllRecentTracks({ refresh = false } = {}) {
  if (!refresh) {
    const cachedArtists = localStorage.getItem(ARTIST_CACHE_KEY);
    const cachedTracks = localStorage.getItem(TRACK_CACHE_KEY);
    if (cachedArtists && cachedTracks) {
      return {
        uniqueArtists: JSON.parse(cachedArtists),
        uniqueTracks: JSON.parse(cachedTracks),
        fromCache: true,
      };
    }
  }

  let page = 1;
  let totalPages = 1;
  const uniqueArtistsSet = new Set();
  const uniqueTracksSet = new Set();

  do {
    const response = await axios.get(BASE_URL, {
      params: {
        method: "user.getRecentTracks",
        user: USERNAME,
        api_key: API_KEY,
        format: "json",
        limit: 200,
        page,
      },
    });
    const tracks = response.data.recenttracks.track;
    tracks.forEach(track => {
      if (track.artist && track.artist['#text']) {
        uniqueArtistsSet.add(track.artist['#text']);
      }
      if (track.name) {
        uniqueTracksSet.add(track.name + '|' + (track.artist ? track.artist['#text'] : ''));
      }
    });
    totalPages = parseInt(response.data.recenttracks['@attr']?.totalPages || '1', 10);
    page++;
  } while (page <= totalPages);

  const uniqueArtists = Array.from(uniqueArtistsSet);
  const uniqueTracks = Array.from(uniqueTracksSet);
  localStorage.setItem(ARTIST_CACHE_KEY, JSON.stringify(uniqueArtists));
  localStorage.setItem(TRACK_CACHE_KEY, JSON.stringify(uniqueTracks));
  return {
    uniqueArtists,
    uniqueTracks,
    fromCache: false,
  };
}
import axios from "axios";

// Replace with your Last.fm API key and username
const API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
const USERNAME = import.meta.env.VITE_LASTFM_USERNAME;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export async function getTopArtists(limit = 10, period = "overall") {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        method: "user.getTopArtists",
        user: USERNAME,
        api_key: API_KEY,
        format: "json",
        limit,
        period,
      },
    });

    return response.data.topartists.artist;
  } catch (error) {
    console.error("Error fetching top artists:", error);
    return [];
  }
}

export async function getUserInfo() {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        method: "user.getInfo",
        user: USERNAME,
        api_key: API_KEY,
        format: "json",
      },
    });
    return response.data.user;
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}
export async function getTopTracks(limit = 10, period = "overall") {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        method: "user.getTopTracks",
        user: USERNAME,
        api_key: API_KEY,
        format: "json",
        limit,
        period,
      },
    });
    return response.data.toptracks.track;
  } catch (error) {
    console.error("Error fetching top tracks:", error);
    return [];
  }
}

export async function getRecentTracks(limit = 10) {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        method: "user.getRecentTracks",
        user: USERNAME,
        api_key: API_KEY,
        format: "json",
        limit,
      },
    });
    return response.data.recenttracks.track;
  } catch (error) {
    console.error("Error fetching recent tracks:", error);
    return [];
  }
}