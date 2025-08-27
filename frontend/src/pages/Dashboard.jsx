import { useEffect } from "react";
import useDashboardData from "../hooks/useDashboardData";
import GroupedSection from "../components/GroupedSection";
import PageLayout from "../components/layout/PageLayout";
import SectionLoader from "../components/ui/SectionLoader";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime } from "../utils/dateFormatter";

export default function Dashboard() {
  const {
    topArtists, artistLimit, setArtistLimit, artistPeriod, setArtistPeriod,
    topTracks, trackLimit, setTrackLimit, trackPeriod, setTrackPeriod,
    topAlbums, albumLimit, setAlbumLimit, albumPeriod, setAlbumPeriod,
    recentTracks, recentLimit, setRecentLimit,
    playCount, uniqueArtists, uniqueAlbums, uniqueTracks, uniqueLoading, handleRefresh,
    loading, artistsLoading, tracksLoading, albumsLoading, recentLoading
  } = useDashboardData();

  useEffect(() => {
    document.title = "Chorn's Music Dashboard";
  }, []);

  const dashboardTiles = [
    { label: "Total Plays", value: formatValue(playCount) ?? "N/A" },
    { label: "Unique Artists", value: formatValue(uniqueArtists) ?? "N/A" },
    { label: "Unique Albums", value: formatValue(uniqueAlbums) ?? "N/A" },
    { label: "Unique Tracks", value: formatValue(uniqueTracks) ?? "N/A" },
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

      <GroupedSection
        title="My Stats"
        items={dashboardTiles}
        showPeriod={false}
        showLimit={false}
        mapper={tile => tile}
        layout="grid"
      />

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
    </PageLayout>
  );
}