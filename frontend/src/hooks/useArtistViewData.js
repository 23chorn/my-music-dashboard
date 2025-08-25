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
    async function fetchInitialData() {
      setLoading(true);
      try {
        const [
          artistData,
          statsData,
          milestonesData,
          daily
        ] = await Promise.all([
          getArtistInfo(id),
          getArtistStats(id),
          getArtistMilestones(id),
          getArtistDailyPlays(id)
        ]);
        setArtist(artistData);
        setStats(statsData);
        setMilestones(milestonesData);
        setDailyPlays(daily);
      } catch {
        setArtist(null);
        setStats(null);
        setMilestones([]);
        setDailyPlays([]);
      }
      setLoading(false);
    }
    if (id) fetchInitialData();
  }, [id]);

  useEffect(() => {
    async function fetchRecentPlays() {
      try {
        const plays = await getArtistRecentPlays(id, recentLimit);
        setRecentPlays(plays);
      } catch {
        setRecentPlays([]);
      }
    }
    if (id) fetchRecentPlays();
  }, [id, recentLimit]);

  useEffect(() => {
    async function fetchTopAlbums() {
      try {
        const albums = await getArtistTopAlbums(id, albumLimit, albumPeriod);
        setTopAlbums(albums);
      } catch {
        setTopAlbums([]);
      }
    }
    if (id) fetchTopAlbums();
  }, [id, albumLimit, albumPeriod]);

  useEffect(() => {
    async function fetchTopTracks() {
      try {
        const tracks = await getArtistTopTracks(id, trackLimit, trackPeriod);
        setTopTracks(tracks);
      } catch {
        setTopTracks([]);
      }
    }
    if (id) fetchTopTracks();
  }, [id, trackLimit, trackPeriod]);

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