import axios from "axios";

const API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
const USERNAME = import.meta.env.VITE_LASTFM_USERNAME;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";


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

    const artists = response.data.topartists.artist;

    return artists.map(artist => ({
      name: artist.name,
      playcount: artist.playcount,
      image: artist.image?.[2]?.["#text"] || "",
    }));
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

export async function getTopAlbums(limit = 10, period = "overall") {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        method: "user.getTopAlbums",
        user: USERNAME,
        api_key: API_KEY,
        format: "json",
        limit,
        period
      }
    });
    const albums = response.data.topalbums.album;
    // When mapping albums, ensure artist is a string:
    return albums.map(album => ({
      name: album.name,
      artist: typeof album.artist === "string" ? album.artist : album.artist?.name || "",
      playcount: album.playcount,
      image: album.image?.[2]?.["#text"] || "", 
    }));
  } catch (error) {
    console.error("Error fetching top albums:", error);
    return [];
  }
}