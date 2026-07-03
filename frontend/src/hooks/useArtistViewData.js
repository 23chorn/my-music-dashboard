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
import { DEFAULT_LIMITS, DEFAULT_PERIODS } from "../config/appConfig";

export default function useArtistViewData(id, {
  initialRecentLimit = DEFAULT_LIMITS.artistView.recent,
  initialAlbumLimit = DEFAULT_LIMITS.artistView.albums,
  initialAlbumPeriod = DEFAULT_PERIODS.artistView.albums,
  initialTrackLimit = DEFAULT_LIMITS.artistView.tracks,
  initialTrackPeriod = DEFAULT_PERIODS.artistView.tracks
} = {}) {
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [stats, setStats] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentLoading, setRecentLoading] = useState(false);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [tracksLoading, setTracksLoading] = useState(false);
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
    // Intentionally scoped to `id` only: this is the initial full-section
    // load. Limit/period changes are each handled by their own dedicated
    // effect below, so including them here would double-fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Refetch individual sections when their parameters change
  useEffect(() => {
    async function fetchRecentPlays() {
      if (!artist) return; // Wait until initial data is loaded
      setRecentLoading(true);
      try {
        const plays = await getArtistRecentPlays(id, recentLimit);
        setRecentPlays(plays);
      } catch {
        setRecentPlays([]);
      } finally {
        setRecentLoading(false);
      }
    }
    if (id) fetchRecentPlays();
    // `id` and `artist` intentionally excluded: this effect should only
    // re-fetch when recentLimit changes, not on the initial load handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentLimit]);

  useEffect(() => {
    async function fetchTopAlbums() {
      if (!artist) return; // Wait until initial data is loaded
      setAlbumsLoading(true);
      try {
        const albums = await getArtistTopAlbums(id, albumLimit, albumPeriod);
        setTopAlbums(albums);
      } catch {
        setTopAlbums([]);
      } finally {
        setAlbumsLoading(false);
      }
    }
    if (id) fetchTopAlbums();
    // `id` and `artist` intentionally excluded: this effect should only
    // re-fetch when albumLimit/albumPeriod change, not on the initial load handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [albumLimit, albumPeriod]);

  useEffect(() => {
    async function fetchTopTracks() {
      if (!artist) return; // Wait until initial data is loaded
      setTracksLoading(true);
      try {
        const tracks = await getArtistTopTracks(id, trackLimit, trackPeriod);
        setTopTracks(tracks);
      } catch {
        setTopTracks([]);
      } finally {
        setTracksLoading(false);
      }
    }
    if (id) fetchTopTracks();
    // `id` and `artist` intentionally excluded: this effect should only
    // re-fetch when trackLimit/trackPeriod change, not on the initial load handled above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackLimit, trackPeriod]);

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
    setTrackPeriod,
    recentLoading,
    albumsLoading,
    tracksLoading
  };
}