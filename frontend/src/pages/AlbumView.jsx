import { useParams } from "react-router-dom";
import useAlbumViewData from "../hooks/useAlbumViewData";
import GroupedSection from "../components/GroupedSection";
import SectionHeader from "../components/SectionHeader";
import { formatValue } from "../utils/numberFormat";

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

  // Prepare tiles for stats section
  const statsTiles = stats
    ? [
        {
          label: "Total Streams",
          value: formatValue(stats.total_streams),
        },
        {
          label: "First Streamed",
          value: stats.first_play
            ? new Date(stats.first_play * 1000).toLocaleDateString()
            : "N/A",
        },
        {
          label: "Most Recent Stream",
          value: stats.last_play
            ? new Date(stats.last_play * 1000).toLocaleDateString()
            : "N/A",
        },
        {
          label: "Top Day",
          value: stats.top_day?.day
            ? (() => {
                  const d = new Date(stats.top_day.day);
                  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
                    .toString()
                    .padStart(2, "0")}/${d.getFullYear()}`;
                })()
            : "N/A",
          sub: stats.top_day?.count ? formatValue(`${stats.top_day.count} plays`) : "",
        },
        {
          label: "Top Year",
          value: stats.top_year?.year
            ? stats.top_year.year
            : "N/A",
          sub: stats.top_year?.count ? formatValue(`${stats.top_year.count} plays`) : "",
        },
        {
          label: "Rank Among All Albums",
          value: stats.rank
            ? formatValue(`#${stats.rank} of ${stats.total_albums}`)
            : "N/A",
        },
      ]
    : [];
    
  if (loading) return <div className="p-4">Loading...</div>;
  if (!album) return <div className="p-4">Album not found.</div>;

  return (
    <div className="w-full px-4">
      <SectionHeader
        image={album.image_url}
        title={album.name}
        subheader={album.artist}
        subheaderLink={album.artist_id ? `/artist/${album.artist_id}` : undefined}
      />

      <GroupedSection
        title="Album Stats"
        items={statsTiles.length > 0 ? statsTiles : [{ label: "No stats available", value: "" }]}
        showPeriod={false}
        showLimit={false}
        mapper={tile => tile}
        layout="grid"
      />

      <section className="mb-8">
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
      </section>

      <section>
        <GroupedSection
          title="Recent Plays"
          items={recentPlays}
          limit={recentLimit}
          setLimit={setRecentLimit}
          showLimit={true}
          mapper={track => ({
            label: track.track,
            sub: track.timestamp
              ? new Date(track.timestamp * 1000).toLocaleString()
              : "Now Playing"
          })}
          collapsible={true}
        />
      </section>
    </div>
    );
}