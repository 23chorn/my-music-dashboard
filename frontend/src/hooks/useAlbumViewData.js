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
  const [tracksLoading, setTracksLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentLimit, setRecentLimit] = useState(initialRecentLimit);
  const [trackLimit, setTrackLimit] = useState(initialTrackLimit);
  const [trackPeriod, setTrackPeriod] = useState(initialTrackPeriod);

  // Fetch all data on albumId change
  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const [albumData, statsData, topTracksData, recentPlaysData] = await Promise.all([
          getAlbumInfo(albumId),
          getAlbumStats(albumId),
          getAlbumTopTracks(albumId, trackLimit, trackPeriod),
          getAlbumRecentPlays(albumId, recentLimit)
        ]);
        setAlbum(albumData);
        setStats(statsData);
        setTopTracks(topTracksData);
        setRecentPlays(recentPlaysData);
      } catch {
        setAlbum(null);
        setStats(null);
        setTopTracks([]);
        setRecentPlays([]);
      }
      setLoading(false);
    }
    if (albumId) fetchAllData();
  }, [albumId]);

  // Refetch individual sections when their parameters change
  useEffect(() => {
    async function fetchTopTracks() {
      if (!album) return; // Wait until initial data is loaded
      setTracksLoading(true);
      try {
        const tracks = await getAlbumTopTracks(albumId, trackLimit, trackPeriod);
        setTopTracks(tracks);
      } catch {
        setTopTracks([]);
      } finally {
        setTracksLoading(false);
      }
    }
    if (albumId) fetchTopTracks();
  }, [trackLimit, trackPeriod]);

  useEffect(() => {
    async function fetchRecentPlays() {
      if (!album) return; // Wait until initial data is loaded
      setRecentLoading(true);
      try {
        const plays = await getAlbumRecentPlays(albumId, recentLimit);
        setRecentPlays(plays);
      } catch {
        setRecentPlays([]);
      } finally {
        setRecentLoading(false);
      }
    }
    if (albumId) fetchRecentPlays();
  }, [recentLimit]);

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
    setTrackPeriod,
    tracksLoading,
    recentLoading
  };
}