import { useEffect, useState, useRef } from "react";
import useDashboardData from "../hooks/useDashboardData";
import GroupedSection from "../components/GroupedSection";
import DashboardHeatmap from "../components/DashboardHeatmap";
import PageLayout from "../components/layout/PageLayout";
import SectionLoader from "../components/ui/SectionLoader";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime } from "../utils/dateFormatter";

export default function Dashboard() {
  const {
    topArtists, artistLimit, setArtistLimit, artistPeriod, setArtistPeriod,
    topTracks, trackLimit, setTrackLimit, trackPeriod, setTrackPeriod,
    topAlbums, albumLimit, setAlbumLimit, albumPeriod, setAlbumPeriod,
    recentTracks, recentLimit, setRecentLimit,
    playCount, uniqueArtists, uniqueAlbums, uniqueTracks, totalListeningTime, playsWithoutDuration, repeatFactor, diversityScore, handleRefresh,
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

  const dashboardTiles = [
    { label: "Total Plays", value: formatValue(playCount) ?? "N/A" },
    { label: "Unique Artists", value: formatValue(uniqueArtists) ?? "N/A" },
    { label: "Unique Albums", value: formatValue(uniqueAlbums) ?? "N/A" },
    { label: "Unique Tracks", value: formatValue(uniqueTracks) ?? "N/A" },
    { 
      label: "Listening Time", 
      value: formatListeningTime(totalListeningTime),
      tooltip: playsWithoutDuration > 0 
        ? `${formatValue(playsWithoutDuration)} plays missing duration data`
        : "All plays have duration data"
    },
    {
      label: "Repeat Factor",
      value: repeatFactor ? `${repeatFactor}x` : "N/A",
      tooltip: "Average plays per unique track - higher means you replay tracks more"
    },
    {
      label: "Diversity Score",
      value: diversityScore ? `${diversityScore}%` : "N/A",
      tooltip: "How evenly you listen across different artists - 100% = perfectly diverse, 0% = only one artist"
    }
  ];

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
          <h2 className="text-lg sm:text-2xl font-semibold text-blue-400">My Stats</h2>
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
        <GroupedSection
          title=""
          items={dashboardTiles}
          showPeriod={false}
          showLimit={false}
          mapper={tile => tile}
          layout="grid"
        />
      </div>

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
            image: artist.image
          })}
          layout='grid'
          collapsible={true}
        />
      </SectionLoader>

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
            image: album.image
          })}
          layout='grid'
          collapsible={true}
        />
      </SectionLoader>

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
            sub: formatValue(`${track.playcount ?? 0} plays`)
          })}
          layout='grid'
          collapsible={true}
        />
      </SectionLoader>

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
            sub: formatDateTime(track.timestamp)
          })}
          collapsible={true}
        />
      </SectionLoader>

      <DashboardHeatmap ref={heatmapRef} />
    </PageLayout>
  );
}