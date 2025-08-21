import { useState, useEffect } from "react";
import {
  getTopArtistsFromServer,
  getTopTracksFromServer,
  getRecentTracksFromServer,
  getTopAlbumsFromServer,
  getUniqueCountsFromServer,
} from "../data/dashboardApi";

export default function useDashboardData() {
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [artistPeriod, setArtistPeriod] = useState("overall");
  const [trackPeriod, setTrackPeriod] = useState("overall");
  const [topAlbums, setTopAlbums] = useState([]);
  const [albumPeriod, setAlbumPeriod] = useState("overall");
  const [uniqueArtists, setUniqueArtists] = useState(null);
  const [uniqueTracks, setUniqueTracks] = useState(null);
  const [uniqueAlbums, setUniqueAlbums] = useState(null);
  const [playCount, setPlayCount] = useState(null);
  const [uniqueLoading, setUniqueLoading] = useState(false);
  const [artistLimit, setArtistLimit] = useState(10);
  const [trackLimit, setTrackLimit] = useState(10);
  const [albumLimit, setAlbumLimit] = useState(10);
  const [recentLimit, setRecentLimit] = useState(10);

  async function fetchUniqueCounts() {
    try {
      const data = await getUniqueCountsFromServer();
      setUniqueArtists(data.uniqueArtistCount);
      setUniqueTracks(data.uniqueTrackCount);
      setUniqueAlbums(data.uniqueAlbumCount);
      setPlayCount(data.playCount);
    } catch (e) {
      setUniqueArtists("-");
      setUniqueTracks("-");
      setUniqueAlbums("-");
      setPlayCount("-");
    }
  }

  async function handleRefresh() {
    setUniqueLoading(true);
    try {
      await Promise.all([
        fetchUniqueCounts(),
        (async () => {
          setTopArtists(await getTopArtistsFromServer(artistLimit, artistPeriod));
          setTopAlbums(await getTopAlbumsFromServer(albumLimit, albumPeriod));
          setTopTracks(await getTopTracksFromServer(trackLimit, trackPeriod));
          setRecentTracks(await getRecentTracksFromServer(recentLimit));
        })(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setUniqueLoading(false);
    }
  }

  useEffect(() => {
    fetchUniqueCounts();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setTopArtists(await getTopArtistsFromServer(artistLimit, artistPeriod));
    }
    fetchData();
  }, [artistPeriod, artistLimit]);

  useEffect(() => {
    async function fetchData() {
      setTopTracks(await getTopTracksFromServer(trackLimit, trackPeriod));
    }
    fetchData();
  }, [trackPeriod, trackLimit]);

  useEffect(() => {
    async function fetchRecentTracks() {
      setRecentTracks(await getRecentTracksFromServer(recentLimit));
    }
    fetchRecentTracks();
  }, [recentLimit]);

  useEffect(() => {
    async function fetchTopAlbums() {
      setTopAlbums(await getTopAlbumsFromServer(albumLimit, albumPeriod));
    }
    fetchTopAlbums();
  }, [albumPeriod, albumLimit]);

  return {
    topArtists, setTopArtists, artistLimit, setArtistLimit, artistPeriod, setArtistPeriod,
    topTracks, setTopTracks, trackLimit, setTrackLimit, trackPeriod, setTrackPeriod,
    topAlbums, setTopAlbums, albumLimit, setAlbumLimit, albumPeriod, setAlbumPeriod,
    recentTracks, setRecentTracks, recentLimit, setRecentLimit,
    playCount, uniqueArtists, uniqueAlbums, uniqueTracks, uniqueLoading, handleRefresh
  };
}