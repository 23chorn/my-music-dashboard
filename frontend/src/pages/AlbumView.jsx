import { useParams } from "react-router-dom";
import useAlbumViewData from "../hooks/useAlbumViewData";
import GroupedSection from "../components/sections/GroupedSection";
import PageLayout from "../components/layout/PageLayout";
import StatsSection from "../components/stats/StatsSection";
import SectionLoader from "../components/ui/SectionLoader";
import TagManager from "../components/ui/TagManager";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime, formatReleaseDate } from "../utils/dateFormatter";

export default function AlbumView() {
  const { id } = useParams();
  const {
    album,
    tracklist,
    recentPlays,
    stats,
    loading,
    recentLimit,
    setRecentLimit,
    tracklistSort,
    setTracklistSort,
    tracklistLoading,
    recentLoading
  } = useAlbumViewData(id);

    
  return (
    <PageLayout
      loading={loading}
      error={!album ? "Album not found." : null}
      image={album?.image_url}
      title={album?.name}
      subheader={album?.artist}
      subheaderLink={album?.artist_id ? `/artist/${album.artist_id}` : undefined}
      metadata={album?.release_date ? formatReleaseDate(album.release_date, album.release_precision) : null}
    >
      <StatsSection stats={stats} type="album" title="Album Stats" />

      <div className="bg-surface-900 rounded-lg p-6">
        <SectionLoader loading={tracklistLoading}>
          <GroupedSection
            title="Album Tracklist"
            items={tracklist}
            mapper={track => ({
              label: track.name,
              sub: `${formatValue(`${track.playcount ?? 0} plays`)}${track.artists ? ` • ${track.artists}` : ''}`,
              link: track.id ? `/track/${track.id}` : undefined
            })}
            layout='list'
            collapsible={true}
            actionButton={
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-400">Sort by:</span>
                <select
                  value={tracklistSort}
                  onChange={(e) => setTracklistSort(e.target.value)}
                  className="bg-surface-800 text-white text-sm px-2 py-1 rounded border border-surface-600 hover:border-surface-500 focus:border-brand-500 focus:outline-none"
                >
                  <option value="trackNumber">Track Number</option>
                  <option value="playCount">Play Count</option>
                </select>
              </div>
            }
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
              sub: formatDateTime(track.timestamp)
            })}
            collapsible={true}
          />
        </SectionLoader>
      </div>

      {/* Tags Section */}
      {album && (
        <div className="bg-surface-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tags</h2>
          <TagManager
            entityId={album.id}
            entityType="album"
            entityName={album.name}
          />
        </div>
      )}
    </PageLayout>
    );
}