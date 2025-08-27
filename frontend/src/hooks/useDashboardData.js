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
  const [loading, setLoading] = useState(true);
  const [artistLimit, setArtistLimit] = useState(5);
  const [trackLimit, setTrackLimit] = useState(5);
  const [albumLimit, setAlbumLimit] = useState(5);
  const [recentLimit, setRecentLimit] = useState(5);

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

  async function fetchAllData() {
    setLoading(true);
    try {
      const [artists, tracks, albums, recent, uniqueCounts] = await Promise.all([
        getTopArtistsFromServer(artistLimit, artistPeriod),
        getTopTracksFromServer(trackLimit, trackPeriod),
        getTopAlbumsFromServer(albumLimit, albumPeriod),
        getRecentTracksFromServer(recentLimit),
        getUniqueCountsFromServer()
      ]);
      
      setTopArtists(artists);
      setTopTracks(tracks);
      setTopAlbums(albums);
      setRecentTracks(recent);
      setUniqueArtists(uniqueCounts.uniqueArtistCount);
      setUniqueTracks(uniqueCounts.uniqueTrackCount);
      setUniqueAlbums(uniqueCounts.uniqueAlbumCount);
      setPlayCount(uniqueCounts.playCount);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set fallback values on error
      setTopArtists([]);
      setTopTracks([]);
      setTopAlbums([]);
      setRecentTracks([]);
      setUniqueArtists("-");
      setUniqueTracks("-");
      setUniqueAlbums("-");
      setPlayCount("-");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [artistPeriod, artistLimit, trackPeriod, trackLimit, albumPeriod, albumLimit, recentLimit]);

  return {
    topArtists, setTopArtists, artistLimit, setArtistLimit, artistPeriod, setArtistPeriod,
    topTracks, setTopTracks, trackLimit, setTrackLimit, trackPeriod, setTrackPeriod,
    topAlbums, setTopAlbums, albumLimit, setAlbumLimit, albumPeriod, setAlbumPeriod,
    recentTracks, setRecentTracks, recentLimit, setRecentLimit,
    playCount, uniqueArtists, uniqueAlbums, uniqueTracks, uniqueLoading,
    loading, handleRefresh: fetchAllData
  };
}