import { useEffect, useState } from "react";
import {
  getArtistInfo,
  getArtistTopTracks,
  getArtistTopAlbums,
  getArtistRecentPlays,
  getArtistStats,
  getArtistMilestones,
  getArtistDailyPlays
} from "../data/artistApi";

export default function useArtistViewData(id, {
  initialRecentLimit = 5,
  initialAlbumLimit = 5,
  initialAlbumPeriod = "overall",
  initialTrackLimit = 5,
  initialTrackPeriod = "overall"
} = {}) {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [stats, setStats] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyPlays, setDailyPlays] = useState([]);
  const [recentLimit, setRecentLimit] = useState(initialRecentLimit);
  const [albumLimit, setAlbumLimit] = useState(initialAlbumLimit);
  const [albumPeriod, setAlbumPeriod] = useState(initialAlbumPeriod);
  const [trackLimit, setTrackLimit] = useState(initialTrackLimit);
  const [trackPeriod, setTrackPeriod] = useState(initialTrackPeriod);

  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const [
          artistData,
          statsData,
          milestonesData,
          daily,
          recentPlaysData,
          topAlbumsData,
          topTracksData
        ] = await Promise.all([
          getArtistInfo(id),
          getArtistStats(id),
          getArtistMilestones(id),
          getArtistDailyPlays(id),
          getArtistRecentPlays(id, recentLimit),
          getArtistTopAlbums(id, albumLimit, albumPeriod),
          getArtistTopTracks(id, trackLimit, trackPeriod)
        ]);
        setArtist(artistData);
        setStats(statsData);
        setMilestones(milestonesData);
        setDailyPlays(daily);
        setRecentPlays(recentPlaysData);
        setTopAlbums(topAlbumsData);
        setTopTracks(topTracksData);
      } catch {
        setArtist(null);
        setStats(null);
        setMilestones([]);
        setDailyPlays([]);
        setRecentPlays([]);
        setTopAlbums([]);
        setTopTracks([]);
      }
      setLoading(false);
    }
    if (id) fetchAllData();
  }, [id]);

  // Refetch individual sections when their parameters change
  useEffect(() => {
    async function fetchRecentPlays() {
      if (!artist) return; // Wait until initial data is loaded
      try {
        const plays = await getArtistRecentPlays(id, recentLimit);
        setRecentPlays(plays);
      } catch {
        setRecentPlays([]);
      }
    }
    if (id) fetchRecentPlays();
  }, [recentLimit]); // Removed id dependency to avoid initial refetch

  useEffect(() => {
    async function fetchTopAlbums() {
      if (!artist) return; // Wait until initial data is loaded
      try {
        const albums = await getArtistTopAlbums(id, albumLimit, albumPeriod);
        setTopAlbums(albums);
      } catch {
        setTopAlbums([]);
      }
    }
    if (id) fetchTopAlbums();
  }, [albumLimit, albumPeriod]); // Removed id dependency to avoid initial refetch

  useEffect(() => {
    async function fetchTopTracks() {
      if (!artist) return; // Wait until initial data is loaded
      try {
        const tracks = await getArtistTopTracks(id, trackLimit, trackPeriod);
        setTopTracks(tracks);
      } catch {
        setTopTracks([]);
      }
    }
    if (id) fetchTopTracks();
  }, [trackLimit, trackPeriod]); // Removed id dependency to avoid initial refetch

  return {
    artist,
    topTracks,
    topAlbums,
    recentPlays,
    stats,
    milestones,
    loading,
    dailyPlays,
    recentLimit,
    setRecentLimit,
    albumLimit,
    setAlbumLimit,
    albumPeriod,
    setAlbumPeriod,
    trackLimit,
    setTrackLimit,
    trackPeriod,
    setTrackPeriod
  };
}