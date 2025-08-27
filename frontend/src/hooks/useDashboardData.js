import { useState, useEffect } from "react";
import {
  getTopArtistsFromServer,
  getTopTracksFromServer,
  getRecentTracksFromServer,
  getTopAlbumsFromServer,
  getUniqueCountsFromServer,
  syncTracksFromServer,
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
  const [loading, setLoading] = useState(true);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [artistLimit, setArtistLimit] = useState(5);
  const [trackLimit, setTrackLimit] = useState(5);
  const [albumLimit, setAlbumLimit] = useState(5);
  const [recentLimit, setRecentLimit] = useState(5);


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

  async function syncNewTracks() {
    setSyncing(true);
    try {
      const result = await syncTracksFromServer();
      console.log('Sync result:', result);
      // Refresh data after sync
      if (result.addedPlays > 0) {
        // Refresh unique counts since new data was added
        const uniqueCounts = await getUniqueCountsFromServer();
        setUniqueArtists(uniqueCounts.uniqueArtistCount);
        setUniqueTracks(uniqueCounts.uniqueTrackCount);
        setUniqueAlbums(uniqueCounts.uniqueAlbumCount);
        setPlayCount(uniqueCounts.playCount);
        
        // Refresh recent plays to show the latest tracks
        await fetchRecent();
      }
      return result;
    } catch (error) {
      console.error('Error syncing tracks:', error);
      throw error;
    } finally {
      setSyncing(false);
    }
  }

  // Individual section fetch functions
  async function fetchArtists() {
    setArtistsLoading(true);
    try {
      const artists = await getTopArtistsFromServer(artistLimit, artistPeriod);
      setTopArtists(artists);
    } catch (error) {
      console.error('Error fetching artists:', error);
      setTopArtists([]);
    } finally {
      setArtistsLoading(false);
    }
  }

  async function fetchTracks() {
    setTracksLoading(true);
    try {
      const tracks = await getTopTracksFromServer(trackLimit, trackPeriod);
      setTopTracks(tracks);
    } catch (error) {
      console.error('Error fetching tracks:', error);
      setTopTracks([]);
    } finally {
      setTracksLoading(false);
    }
  }

  async function fetchAlbums() {
    setAlbumsLoading(true);
    try {
      const albums = await getTopAlbumsFromServer(albumLimit, albumPeriod);
      setTopAlbums(albums);
    } catch (error) {
      console.error('Error fetching albums:', error);
      setTopAlbums([]);
    } finally {
      setAlbumsLoading(false);
    }
  }

  async function fetchRecent() {
    setRecentLoading(true);
    try {
      const recent = await getRecentTracksFromServer(recentLimit);
      setRecentTracks(recent);
    } catch (error) {
      console.error('Error fetching recent tracks:', error);
      setRecentTracks([]);
    } finally {
      setRecentLoading(false);
    }
  }

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  useEffect(() => {
    fetchAllData().finally(() => setInitialLoadComplete(true));
  }, []);

  // Individual section updates when filters change
  useEffect(() => {
    if (initialLoadComplete) fetchArtists(); // Don't refetch during initial load
  }, [artistPeriod, artistLimit]);

  useEffect(() => {
    if (initialLoadComplete) fetchTracks();
  }, [trackPeriod, trackLimit]);

  useEffect(() => {
    if (initialLoadComplete) fetchAlbums();
  }, [albumPeriod, albumLimit]);

  useEffect(() => {
    if (initialLoadComplete) fetchRecent();
  }, [recentLimit]);

  return {
    topArtists, setTopArtists, artistLimit, setArtistLimit, artistPeriod, setArtistPeriod,
    topTracks, setTopTracks, trackLimit, setTrackLimit, trackPeriod, setTrackPeriod,
    topAlbums, setTopAlbums, albumLimit, setAlbumLimit, albumPeriod, setAlbumPeriod,
    recentTracks, setRecentTracks, recentLimit, setRecentLimit,
    playCount, uniqueArtists, uniqueAlbums, uniqueTracks,
    loading, handleRefresh: fetchAllData,
    artistsLoading, tracksLoading, albumsLoading, recentLoading,
    syncing, syncNewTracks
  };
}