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

async function getTopArtists(limit = 10, period = "overall") {
  try {
    const params = {
      method: "user.getTopArtists",
      user: USERNAME,
      api_key: API_KEY,
      format: "json",
      limit,
      period
    };
    const response = await axios.get(BASE_URL, { params });
    const artists = response.data.topartists?.artist || [];
    return artists.map(artist => ({
      name: artist.name,
      playcount: artist.playcount,
      image: artist.image?.[1]?.["#text"] || "" // second smallest image
    }));
  } catch (error) {
    console.error("Error fetching top artists from Last.fm:", error);
    return [];
  }
}

async function getTopTracks(limit = 10, period = "overall") {
  try {
    const params = {
      method: "user.getTopTracks",
      user: USERNAME,
      api_key: API_KEY,
      format: "json",
      limit,
      period
    };
    const response = await axios.get(BASE_URL, { params });
    const tracks = response.data.toptracks?.track || [];
    return tracks.map(track => ({
      name: track.name,
      artist: typeof track.artist === "string" ? track.artist : track.artist?.name || "",
      playcount: track.playcount,
      image: track.image?.[1]?.["#text"] || ""
    }));
  } catch (error) {
    console.error("Error fetching top tracks from Last.fm:", error);
    return [];
  }
}

async function getTopAlbums(limit = 10, period = "overall") {
  try {
    const params = {
      method: "user.getTopAlbums",
      user: USERNAME,
      api_key: API_KEY,
      format: "json",
      limit,
      period
    };
    const response = await axios.get(BASE_URL, { params });
    const albums = response.data.topalbums?.album || [];
    return albums.map(album => ({
      name: album.name,
      artist: typeof album.artist === "string" ? album.artist : album.artist?.name || "",
      playcount: album.playcount,
      image: album.image?.[1]?.["#text"] || ""
    }));
  } catch (error) {
    console.error("Error fetching top albums from Last.fm:", error);
    return [];
  }
}

async function getRecentTracks(limit = 10) {
  try {
    const params = {
      method: "user.getrecenttracks",
      user: USERNAME,
      api_key: API_KEY,
      format: "json",
      limit
    };
    const response = await axios.get(BASE_URL, { params });
    const tracks = response.data.recenttracks?.track || [];
    return tracks.map(track => ({
      name: track.name,
      artist: track.artist && (track.artist.name || track.artist['#text']),
      album: track.album && track.album['#text'],
      timestamp: track.date?.uts ? Number(track.date.uts) : null, // null if "now playing"
    }));
  } catch (error) {
    console.error("Error fetching recent tracks from Last.fm:", error);
    return [];
  }
}

async function getUserInfo() {
  try {
    const params = {
      method: "user.getInfo",
      user: USERNAME,
      api_key: API_KEY,
      format: "json"
    };
    const response = await axios.get(BASE_URL, { params });
    const user = response.data.user;
    return {
      name: user.name,
      playcount: user.playcount,
      registered: user.registered?.unixtime,
      image: user.image?.[1]?.["#text"] || ""
    };
  } catch (error) {
    console.error("Error fetching user info from Last.fm:", error);
    return null;
  }
}

module.exports = {
  fetchAllRecentTracks,
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getRecentTracks,
  getUserInfo
};