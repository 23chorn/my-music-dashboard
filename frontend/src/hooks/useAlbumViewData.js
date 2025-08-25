import { useState, useEffect } from "react";
import {
  getAlbumInfo,
  getAlbumTopTracks,
  getAlbumRecentPlays,
  getAlbumStats
} from "../data/albumApi";

export default function useAlbumViewData(albumId, {
  initialRecentLimit = 5,
  initialTrackLimit = 5,
  initialTrackPeriod = "overall"
} = {}) {
  const [album, setAlbum] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLimit, setRecentLimit] = useState(initialRecentLimit);
  const [trackLimit, setTrackLimit] = useState(initialTrackLimit);
  const [trackPeriod, setTrackPeriod] = useState(initialTrackPeriod);

  // Fetch album info and stats on albumId change
  useEffect(() => {
    async function fetchInfoAndStats() {
      setLoading(true);
      try {
        const [albumData, statsData] = await Promise.all([
          getAlbumInfo(albumId),
          getAlbumStats(albumId)
        ]);
        setAlbum(albumData);
        setStats(statsData);
      } catch {
        setAlbum(null);
        setStats(null);
      }
      setLoading(false);
    }
    if (albumId) fetchInfoAndStats();
  }, [albumId]);

  // Fetch top tracks when albumId, trackLimit, or trackPeriod change
  useEffect(() => {
    async function fetchTopTracks() {
      try {
        const tracks = await getAlbumTopTracks(albumId, trackLimit, trackPeriod);
        setTopTracks(tracks);
      } catch {
        setTopTracks([]);
      }
    }
    if (albumId) fetchTopTracks();
  }, [albumId, trackLimit, trackPeriod]);

  // Fetch recent plays when albumId or recentLimit change
  useEffect(() => {
    async function fetchRecentPlays() {
      try {
        const plays = await getAlbumRecentPlays(albumId, recentLimit);
        setRecentPlays(plays);
      } catch {
        setRecentPlays([]);
      }
    }
    if (albumId) fetchRecentPlays();
  }, [albumId, recentLimit]);

  return {
    album,
    topTracks,
    recentPlays,
    stats,
    loading,
    recentLimit,
    setRecentLimit,
    trackLimit,
    setTrackLimit,
    trackPeriod,
    setTrackPeriod
  };
}