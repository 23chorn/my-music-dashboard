import { useParams } from "react-router-dom";
import useArtistViewData from "../hooks/useArtistViewData";
import Heatmap from "../components/Heatmap";
import GroupedSection from "../components/GroupedSection";
import MilestoneSection from "../components/MilestoneSection";
import PageLayout from "../components/layout/PageLayout";
import StatsSection from "../components/stats/StatsSection";
import SectionLoader from "../components/ui/SectionLoader";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime } from "../utils/dateFormatter";

export default function ArtistView() {
  const { id } = useParams();
  const {
    artist,
    topTracks,
    topAlbums,
    recentPlays,
    stats,
    milestones,
    loading,
    recentLimit,
    setRecentLimit,
    albumLimit,
    setAlbumLimit,
    albumPeriod,
    setAlbumPeriod,
    trackLimit,
    setTrackLimit,
    trackPeriod,
    setTrackPeriod,
    recentLoading,
    albumsLoading,
    tracksLoading
  } = useArtistViewData(id);


  return (
    <PageLayout
      loading={loading}
      error={!artist ? "Artist not found." : null}
      image={artist?.image_url}
      title={artist?.name}
    >
      <StatsSection stats={stats} type="artist" title="Artist Stats" />

      {milestones && milestones.length > 0 && (
        <MilestoneSection milestones={milestones} />
      )}

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
          items={recentPlays}
          limit={recentLimit}
          setLimit={setRecentLimit}
          showLimit={true}
          mapper={track => ({
            label: track.track,
            album: track.album,
            value: track.artist,
            sub: formatDateTime(track.timestamp)
          })}
          collapsible={true}
        />
      </SectionLoader>

      {/* Era Explorer Section */}
      {artist && <Heatmap artistId={artist.id} days={30} />}
    </PageLayout>
  );
}