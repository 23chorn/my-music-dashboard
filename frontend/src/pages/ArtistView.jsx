import { useParams } from "react-router-dom";
import useArtistViewData from "../hooks/useArtistViewData";
import CustomHeatmap from "../components/charts/CustomHeatmap";
import GroupedSection from "../components/sections/GroupedSection";
import MilestoneSection from "../components/sections/MilestoneSection";
import PageLayout from "../components/layout/PageLayout";
import StatsSection from "../components/stats/StatsSection";
import SectionLoader from "../components/ui/SectionLoader";
import TagManager from "../components/ui/TagManager";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime } from "../utils/dateFormatter";
import { HEATMAP_CONFIG } from "../config/appConfig";

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

      <div className="bg-surface-900 rounded-lg p-6">
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
      </div>

      <div className="bg-surface-900 rounded-lg p-6">
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
              link: track.id ? `/track/${track.id}` : undefined
            })}
            layout='grid'
            collapsible={true}
          />
        </SectionLoader>
      </div>

      <div className="bg-surface-900 rounded-lg p-6">
          <SectionLoader loading={recentLoading}>
            <GroupedSection
              title="Recent Plays"
              items={recentPlays}
              limit={recentLimit}
            setLimit={setRecentLimit}
            showLimit={true}
            mapper={track => ({
              label: track.track,
              image: track.albumImage,
              album: track.album,
              sub: formatDateTime(track.timestamp)
            })}
            collapsible={true}
          />
        </SectionLoader>
      </div>

      {/* Era Explorer Section */}
      {artist && (
        <div className="bg-surface-900 rounded-lg p-6">
          <CustomHeatmap artistId={artist.id} days={HEATMAP_CONFIG.artist.days} />
        </div>
      )}

      {/* Tags Section */}
      {artist && (
        <div className="bg-surface-900 rounded-lg p-6">
          <h2 className="font-display text-sm uppercase tracking-widest text-brand-400 mb-4">Tags</h2>
          <TagManager
            entityId={artist.id}
            entityType="artist"
            entityName={artist.name}
          />
        </div>
      )}
    </PageLayout>
  );
}