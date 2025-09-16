import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useDashboardData from "../hooks/useDashboardData";
import GroupedSection from "../components/sections/GroupedSection";
import DashboardHeatmap from "../components/charts/DashboardHeatmap";
import PageLayout from "../components/layout/PageLayout";
import SectionLoader from "../components/ui/SectionLoader";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import StatCard from "../components/stats/StatCard";
import PlaylistButton from "../components/ui/PlaylistButton";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime } from "../utils/dateFormatter";

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    topArtists, artistLimit, setArtistLimit, artistPeriod, setArtistPeriod,
    topTracks, trackLimit, setTrackLimit, trackPeriod, setTrackPeriod,
    topAlbums, albumLimit, setAlbumLimit, albumPeriod, setAlbumPeriod,
    recentTracks, recentLimit, setRecentLimit,
    playCount, uniqueArtists, uniqueAlbums, uniqueTracks, handleRefresh,
    loading, artistsLoading, tracksLoading, albumsLoading, recentLoading,
    syncing, syncNewTracks
  } = useDashboardData();

  const [syncMessage, setSyncMessage] = useState("");
  const heatmapRef = useRef();

  useEffect(() => {
    document.title = "Chorn's Music Dashboard";
  }, []);

  // Format listening time from milliseconds to days
  const formatListeningTime = (timeMs) => {
    if (!timeMs) return "N/A";
    
    const totalDays = timeMs / (1000 * 60 * 60 * 24);
    const days = Math.floor(totalDays);
    const hours = Math.floor((totalDays - days) * 24);
    
    let formatted = "";
    if (days > 0) {
      formatted += `${days}d`;
      if (hours > 0) formatted += ` ${hours}h`;
    } else if (hours > 0) {
      formatted = `${hours}h`;
    } else {
      const minutes = Math.floor((timeMs / (1000 * 60)) % 60);
      formatted = `${minutes}m`;
    }
    
    return formatted;
  };


  const imageUrl =
    process.env.NODE_ENV === "production"
      ? "https://jstjcx5dxzpncbjg.public.blob.vercel-storage.com/pfp.jpeg"
      : "/pfp.jpeg";

  return (
    <PageLayout
      loading={loading}
      image={imageUrl}
      title="Welcome to Chorn's Music Dashboard!"
      subheader="An app for me to track and map out my personal journey with music!"
    >

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div></div>
          <button
            onClick={async () => {
              try {
                const result = await syncNewTracks();
                setSyncMessage(`Synced ${result.addedPlays} new plays!`);
                
                // Refresh the heatmap data if new plays were added
                if (result.addedPlays > 0 && heatmapRef.current) {
                  heatmapRef.current.refresh();
                }
                
                setTimeout(() => setSyncMessage(""), 3000);
              } catch (error) {
                setSyncMessage("Sync failed. Please try again.");
                setTimeout(() => setSyncMessage(""), 3000);
              }
            }}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition"
          >
            {syncing ? (
              <>
                <LoadingSpinner size="sm" />
                Syncing...
              </>
            ) : (
              "Sync New Tracks"
            )}
          </button>
        </div>
        {syncMessage && (
          <div className="text-green-400 text-sm font-medium">
            {syncMessage}
          </div>
        )}
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-2xl font-semibold text-blue-400">My Stats</h2>
            <button
              onClick={() => navigate('/stats')}
              className="text-sm px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded transition"
            >
              View Details →
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="Total Plays"
              value={formatValue(playCount) ?? "N/A"}
              subtitle="all time"
              color="text-blue-400"
            />
            <StatCard
              title="Unique Artists"
              value={formatValue(uniqueArtists) ?? "N/A"}
              subtitle="discovered"
              color="text-green-400"
            />
            <StatCard
              title="Unique Albums"
              value={formatValue(uniqueAlbums) ?? "N/A"}
              subtitle="collected"
              color="text-purple-400"
            />
            <StatCard
              title="Unique Tracks"
              value={formatValue(uniqueTracks) ?? "N/A"}
              subtitle="in library"
              color="text-orange-400"
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-6">
        <SectionLoader loading={artistsLoading}>
          <GroupedSection
            title="Top Artists"
            items={topArtists}
            period={artistPeriod}
            setPeriod={setArtistPeriod}
            showPeriod={true}
            showLimit={true}
            limit={artistLimit}
            setLimit={setArtistLimit}
            mapper={artist => ({
              value: artist.artist,
              sub: formatValue(`${artist.playcount ?? 0} plays`),
              link: artist.artistId ? `/artist/${artist.artistId}` : undefined,
              image: artist.image,
              entityId: artist.artistId,
              entityType: 'artist'
            })}
            layout='grid'
            collapsible={true}
          />
        </SectionLoader>
      </div>

      <div className="bg-gray-900 rounded-lg p-6">
        <SectionLoader loading={albumsLoading}>
          <GroupedSection
            title="Top Albums"
            items={topAlbums}
            period={albumPeriod}
            setPeriod={setAlbumPeriod}
            showPeriod={true}
            showLimit={true}
            limit={albumLimit}
            setLimit={setAlbumLimit}
            mapper={album => ({
              label: album.artist,
              value: album.album,
              sub: formatValue(`${album.playcount ?? 0} plays`),
              link: album.albumId ? `/album/${album.albumId}` : undefined,
              image: album.image,
              entityId: album.albumId,
              entityType: 'album'
            })}
            layout='grid'
            collapsible={true}
          />
        </SectionLoader>
      </div>

      <div className="bg-gray-900 rounded-lg p-6">
        <SectionLoader loading={tracksLoading}>
          <GroupedSection
            title="Top Tracks"
            items={topTracks}
            period={trackPeriod}
            setPeriod={setTrackPeriod}
            showPeriod={true}
            showLimit={true}
            limit={trackLimit}
            setLimit={setTrackLimit}
            mapper={track => ({
              label: track.artist,
              value: track.track,
              album: track.album,
              image: track.albumImage,
              sub: formatValue(`${track.playcount ?? 0} plays`),
              link: track.id ? `/track/${track.id}` : undefined,
              entityId: track.id,
              entityType: 'track'
            })}
            layout='grid'
            collapsible={true}
            actionButton={
              <PlaylistButton
                period={trackPeriod}
                limit={trackLimit}
                className="text-sm"
              />
            }
          />
        </SectionLoader>
      </div>

      <div className="bg-gray-900 rounded-lg p-6">
        <SectionLoader loading={recentLoading}>
          <GroupedSection
            title="Recent Plays"
            items={recentTracks}
            limit={recentLimit}
            setLimit={setRecentLimit}
            showLimit={true}
            mapper={track => ({
              label: track.track,
              value: track.artist,
              album: track.album,
              sub: formatDateTime(track.timestamp),
              link: track.id ? `/track/${track.id}` : undefined,
              entityId: track.id,
              entityType: 'track'
            })}
            collapsible={true}
          />
        </SectionLoader>
      </div>

      <DashboardHeatmap ref={heatmapRef} />
    </PageLayout>
  );
}