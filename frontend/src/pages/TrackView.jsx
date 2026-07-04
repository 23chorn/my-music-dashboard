import { useParams } from "react-router-dom";
import useTrackViewData from "../hooks/useTrackViewData";
import PageLayout from "../components/layout/PageLayout";
import StatsSection from "../components/stats/StatsSection";
import SectionLoader from "../components/ui/SectionLoader";
import GroupedSection from "../components/sections/GroupedSection";
import TrackInfoSection from "../components/track/TrackInfoSection";
import TagManager from "../components/ui/TagManager";
import { formatWeekdayDate, formatTime, formatRelativeTime } from "../utils/dateFormatter";

export default function TrackView() {
  const { id } = useParams();
  const {
    track,
    recentPlays,
    stats,
    loading,
    recentLoading,
    statsLoading,
    recentLimit,
    setRecentLimit
  } = useTrackViewData(id);

  return (
    <PageLayout
      loading={loading}
      error={!track ? "Track not found." : null}
      image={track?.primary_album_image || track?.primary_artist_image}
      title={track?.track_name}
      subheader={track?.primary_artist_name}
      subheaderLink={track?.primary_artist_id ? `/artist/${track.primary_artist_id}` : undefined}
      metadata={track?.primary_album_name}
    >
      {/* Track Info Section */}
      <TrackInfoSection track={track} />

      {/* Stats Section */}
      <SectionLoader loading={statsLoading}>
        <StatsSection stats={stats} type="track" title="Listening Stats" />
      </SectionLoader>

      {/* Recent Plays Section */}
      <SectionLoader loading={recentLoading}>
        <GroupedSection
          title="Recent Plays"
          items={recentPlays}
          showLimit={true}
          limit={recentLimit}
          setLimit={setRecentLimit}
          mapper={play => ({
            label: formatWeekdayDate(play.timestamp),
            value: formatTime(play.timestamp),
            sub: formatRelativeTime(play.timestamp)
          })}
          emptyMessage="No recent plays found for this track"
        />
      </SectionLoader>

      {/* Tags Section */}
      {track && (
        <div className="bg-surface-900 rounded-lg p-6">
          <h2 className="font-display text-sm uppercase tracking-widest text-brand-400 mb-4">Tags</h2>
          <TagManager
            entityId={track.id}
            entityType="track"
            entityName={track.track_name}
          />
        </div>
      )}
    </PageLayout>
  );
}