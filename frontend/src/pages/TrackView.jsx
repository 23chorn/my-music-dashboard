import { useParams } from "react-router-dom";
import useTrackViewData from "../hooks/useTrackViewData";
import PageLayout from "../components/layout/PageLayout";
import StatsSection from "../components/stats/StatsSection";
import SectionLoader from "../components/ui/SectionLoader";
import GroupedSection from "../components/sections/GroupedSection";
import TrackInfoSection from "../components/track/TrackInfoSection";
import TagManager from "../components/ui/TagManager";
import { formatDateTime } from "../utils/dateFormatter";

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
      image={null}
      title={track?.track_name}
      subheader={null}
      subheaderLink={undefined}
    >
      {/* Track Info Section */}
      <TrackInfoSection track={track} />

      {/* Tags Section */}
      {track && (
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tags</h2>
          <TagManager
            entityId={track.id}
            entityType="track"
            entityName={track.track_name}
          />
        </div>
      )}

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
            label: play.track,
            value: play.artist,
            sub: formatDateTime(play.timestamp)
          })}
          emptyMessage="No recent plays found for this track"
        />
      </SectionLoader>
    </PageLayout>
  );
}