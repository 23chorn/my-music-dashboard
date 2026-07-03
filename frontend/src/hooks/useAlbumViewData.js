import { useState, useEffect } from "react";
import {
  getAlbumInfo,
  getAlbumTopTracks,
  getAlbumRecentPlays,
  getAlbumStats,
  getAlbumTracklist
} from "../data/albumApi";
import { DEFAULT_LIMITS, DEFAULT_PERIODS } from "../config/appConfig";

export default function useAlbumViewData(albumId, {
  initialRecentLimit = DEFAULT_LIMITS.albumView.recent,
  initialTrackLimit = DEFAULT_LIMITS.albumView.tracks,
  initialTrackPeriod = DEFAULT_PERIODS.albumView.tracks
} = {}) {
  const [album, setAlbum] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [tracklist, setTracklist] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracklistLoading, setTracklistLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentLimit, setRecentLimit] = useState(initialRecentLimit);
  const [trackLimit, setTrackLimit] = useState(initialTrackLimit);
  const [trackPeriod, setTrackPeriod] = useState(initialTrackPeriod);
  const [tracklistSort, setTracklistSort] = useState('trackNumber');

  // Fetch all data on albumId change
  useEffect(() => {
    async function fetchAllData() {
      setLoading(true);
      try {
        const [albumData, statsData, topTracksData, tracklistData, recentPlaysData] = await Promise.all([
          getAlbumInfo(albumId),
          getAlbumStats(albumId),
          getAlbumTopTracks(albumId, trackLimit, trackPeriod),
          getAlbumTracklist(albumId, tracklistSort),
          getAlbumRecentPlays(albumId, recentLimit)
        ]);
        setAlbum(albumData);
        setStats(statsData);
        setTopTracks(topTracksData);
        setTracklist(tracklistData);
        setRecentPlays(recentPlaysData);
      } catch {
        setAlbum(null);
        setStats(null);
        setTopTracks([]);
        setTracklist([]);
        setRecentPlays([]);
      }
      setLoading(false);
    }
    if (albumId) fetchAllData();
    // Intentionally scoped to `albumId` only: this is the initial full-section
    // load. Limit/period/sort changes are each handled by their own dedicated
    // effect below, so including them here would double-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // `albumId` and `album` intentionally excluded: this effect should only
    // re-fetch when trackLimit/trackPeriod change, not on the initial load handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // `albumId` and `album` intentionally excluded: this effect should only
    // re-fetch when recentLimit changes, not on the initial load handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentLimit]);

  useEffect(() => {
    async function fetchTracklist() {
      if (!album) return; // Wait until initial data is loaded
      setTracklistLoading(true);
      try {
        const tracks = await getAlbumTracklist(albumId, tracklistSort);
        setTracklist(tracks);
      } catch {
        setTracklist([]);
      } finally {
        setTracklistLoading(false);
      }
    }
    if (albumId) fetchTracklist();
    // `albumId` and `album` intentionally excluded: this effect should only
    // re-fetch when tracklistSort changes, not on the initial load handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracklistSort]);

  return {
    album,
    topTracks,
    tracklist,
    recentPlays,
    stats,
    loading,
    recentLimit,
    setRecentLimit,
    trackLimit,
    setTrackLimit,
    trackPeriod,
    setTrackPeriod,
    tracklistSort,
    setTracklistSort,
    tracksLoading,
    tracklistLoading,
    recentLoading
  };
}