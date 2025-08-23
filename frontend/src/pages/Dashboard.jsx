import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useDashboardData from "../hooks/useDashboardData";
import TopArtistsSection from "../components/TopArtistsSection";
import TopTracksSection from "../components/TopTracksSection";
import TopAlbumsSection from "../components/TopAlbumsSection";
import RecentTracksSection from "../components/RecentTracksSection";
import TilesSection from "../components/TilesSection";

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

  const dashboardTiles = [
    { label: "Total Plays", value: playCount ?? "N/A" },
    { label: "Unique Artists", value: uniqueArtists ?? "N/A" },
    { label: "Unique Albums", value: uniqueAlbums ?? "N/A" },
    { label: "Unique Tracks", value: uniqueTracks ?? "N/A" },
  ];

  return (
    <div className="space-y-10 px-2 sm:px-4 md:px-8 w-full min-w-0">
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h2 className="text-2xl font-bold">Welcome to Chorn's Music Dashboard!</h2>
        <p className="text-sm text-gray-600">Here you can find all your music statistics in one place.</p>
      </section>

      <TilesSection tiles={dashboardTiles} title="Your Stats" />

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