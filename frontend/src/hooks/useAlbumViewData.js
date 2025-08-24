import { useState, useEffect } from "react";
import {
  getAlbumInfo,
  getAlbumTopTracks,
  // getAlbumRecentPlays, // <-- Commented out for debugging
  getAlbumStats
} from "../data/albumApi";

export default function useAlbumViewData(albumId) {
  const [album, setAlbum] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  // const [recentPlays, setRecentPlays] = useState([]); // <-- Commented out for debugging
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Controls for limits and period
  // const [recentLimit, setRecentLimit] = useState(10); // <-- Commented out for debugging
  const [trackLimit, setTrackLimit] = useState(10);
  const [trackPeriod, setTrackPeriod] = useState("overall");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [
          albumData,
          tracks,
          // plays, // <-- Commented out for debugging
          statsData
        ] = await Promise.all([
          getAlbumInfo(albumId),
          getAlbumTopTracks(albumId, trackLimit, trackPeriod),
          // getAlbumRecentPlays(albumId, recentLimit), // <-- Commented out for debugging
          getAlbumStats(albumId)
        ]);
        setAlbum(albumData);
        setTopTracks(tracks);
        // setRecentPlays(plays); // <-- Commented out for debugging
        setStats(statsData);
      } catch {
        setAlbum(null);
        setTopTracks([]);
        // setRecentPlays([]); // <-- Commented out for debugging
        setStats(null);
      }
      setLoading(false);
    }
    if (albumId) fetchData();
  }, [albumId, trackLimit, trackPeriod /*, recentLimit*/]);

  return {
    album,
    topTracks,
    // recentPlays, // <-- Commented out for debugging
    stats,
    loading,
    // recentLimit,
    // setRecentLimit,
    trackLimit,
    setTrackLimit,
    trackPeriod,
    setTrackPeriod
  };
}