import { FaSyncAlt } from "react-icons/fa";
import { useEffect, useState } from "react";
import useDashboardData from "../hooks/useDashboardData";
import TopArtistsSection from "../components/TopArtistsSection";
import TopTracksSection from "../components/TopTracksSection";
import TopAlbumsSection from "../components/TopAlbumsSection";
import RecentTracksSection from "../components/RecentTracksSection";
import StatsSection from "../components/StatsSection";

export default function Dashboard() {
  const {
    topArtists, artistLimit, setArtistLimit, artistPeriod, setArtistPeriod,
    topTracks, trackLimit, setTrackLimit, trackPeriod, setTrackPeriod,
    topAlbums, albumLimit, setAlbumLimit, albumPeriod, setAlbumPeriod,
    recentTracks, recentLimit, setRecentLimit,
    playCount, uniqueArtists, uniqueAlbums, uniqueTracks, uniqueLoading, handleRefresh
  } = useDashboardData();


  useEffect(() => {
    document.title = "Chorn's Music Dashboard";
  }, []);

  return (
    <div className="space-y-10 px-2 sm:px-4 md:px-8 w-full min-w-0">
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h2 className="text-2xl font-bold">Welcome to Chorn's Music Dashboard!</h2>
        <p className="text-sm text-gray-600">Here you can find all your music statistics in one place.</p>
        {/* Refresh button in top right */}
        <button
          className="w-12 h-12 flex items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 transition mt-2 sm:mt-0 self-start sm:self-auto"
          onClick={handleRefresh}
          disabled={uniqueLoading}
          title="Refresh all stats"
          style={{ overflow: "visible" }}
        >
          <FaSyncAlt
            className={uniqueLoading ? "animate-spin" : ""}
            style={{ fontSize: "2.5rem" }}
          />
        </button>
      </section>

      {/* Stats Section */}
      <StatsSection
        playCount={playCount}
        uniqueArtists={uniqueArtists}
        uniqueAlbums={uniqueAlbums}
        uniqueTracks={uniqueTracks}
      />

      {/* Top Artists */}
      <TopArtistsSection
        topArtists={topArtists}
        artistLimit={artistLimit}
        setArtistLimit={setArtistLimit}
        artistPeriod={artistPeriod}
        setArtistPeriod={setArtistPeriod}
      />

      {/* Top Tracks */}
      <TopTracksSection
        topTracks={topTracks}
        trackLimit={trackLimit}
        setTrackLimit={setTrackLimit}
        trackPeriod={trackPeriod}
        setTrackPeriod={setTrackPeriod}
      />

      {/* Top Albums */}
      <TopAlbumsSection
        topAlbums={topAlbums}
        albumLimit={albumLimit}
        setAlbumLimit={setAlbumLimit}
        albumPeriod={albumPeriod}
        setAlbumPeriod={setAlbumPeriod}
      />

      {/* Recent Tracks */}
      <RecentTracksSection
        recentTracks={recentTracks}
        recentLimit={recentLimit}
        setRecentLimit={setRecentLimit}
      />
    </div>
  );
}