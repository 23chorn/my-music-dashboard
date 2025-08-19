// Helper to cache results in localStorage
const ARTIST_CACHE_KEY = 'lastfm_unique_artists';
const TRACK_CACHE_KEY = 'lastfm_unique_tracks';

export async function fetchAllRecentTracks({ from }) {
  let allTracks = [];
  let page = 1;
  let totalPages = 1;
  const limit = 200;

  try {
    do {
      const url = `${BASE_URL}?method=user.getrecenttracks&user=${USERNAME}&api_key=${API_KEY}&format=json&limit=${limit}&page=${page}${from ? `&from=${from}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();
      const tracks = data?.recenttracks?.track ?? [];
      allTracks = allTracks.concat(tracks);
      totalPages = Number(data?.recenttracks?.['@attr']?.totalPages ?? 1);
      page++;
    } while (page <= totalPages);
  } catch (error) {
    return [];
  }

  return allTracks;
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