import { useEffect, useState } from "react";
import useDashboardData from "../hooks/useDashboardData";
import GroupedSection from "../components/GroupedSection";

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

      <GroupedSection
        title="Your Stats"
        items={dashboardTiles}
        showPeriod={false}
        showLimit={false}
        mapper={tile => tile}
        layout="grid"
      />

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
          label: artist.artist,
          value: `${artist.playcount ?? 0} plays`,
          link: artist.artistId ? `/artist/${artist.artistId}` : undefined
        })}
        layout='grid'
        collapsible={true}
      />

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
          label: track.track,
          value: track.artist,
          sub: `${track.playcount ?? 0} plays`
        })}
        layout='grid'
        collapsible={true}
      />

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
          sub: `${album.playcount ?? 0} plays`
        })}
        layout='grid'
        collapsible={true}
      />

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
          sub: track.timestamp
            ? new Date(track.timestamp * 1000).toLocaleString()
            : "Now Playing"
        })}
        collapsible={true}
      />
    </div>
  );
}