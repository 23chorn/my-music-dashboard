import { useParams } from "react-router-dom";
import useAlbumViewData from "../hooks/useAlbumViewData";
import GroupedSection from "../components/GroupedSection";
import PageLayout from "../components/layout/PageLayout";
import StatsSection from "../components/stats/StatsSection";
import { formatValue } from "../utils/numberFormat";
import { formatDateTime } from "../utils/dateFormatter";

export default function AlbumView() {
  const { id } = useParams();
  const {
    album,
    topTracks,
    recentPlays,
    stats,
    loading,
    recentLimit,
    setRecentLimit,
    trackLimit,
    setTrackLimit,
    trackPeriod,
    setTrackPeriod
  } = useAlbumViewData(id);

    
  return (
    <PageLayout
      loading={loading}
      error={!album ? "Album not found." : null}
      image={album?.image_url}
      title={album?.name}
      subheader={album?.artist}
      subheaderLink={album?.artist_id ? `/artist/${album.artist_id}` : undefined}
    >
      <StatsSection stats={stats} type="album" title="Album Stats" />

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
          sub: formatValue(`${track.playcount ?? 0} plays`)
        })}
        layout='list'
        collapsible={true}
      />

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
    </PageLayout>
    );
}