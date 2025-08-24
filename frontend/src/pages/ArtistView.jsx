import { useParams } from "react-router-dom";
import useArtistViewData from "../hooks/useArtistViewData";
import Heatmap from "../components/Heatmap";
import GroupedSection from "../components/GroupedSection";
import MilestoneSection from "../components/MilestoneSection";
import SectionHeader from "../components/SectionHeader";

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
    setTrackPeriod
  } = useArtistViewData(id);

  // Prepare tiles for stats section
  const statsTiles = stats
    ? [
        {
          label: "Total Streams",
          value: stats.total_streams ?? "N/A",
        },
        {
          label: "First Streamed",
          value: stats.first_play ? new Date(stats.first_play * 1000).toLocaleDateString() : "N/A",
        },
        {
          label: "Most Recent Stream",
          value: stats.last_play ? new Date(stats.last_play * 1000).toLocaleDateString() : "N/A",
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
          sub: stats.top_day?.count ? `${stats.top_day.count} plays` : "",
        },
        {
          label: "Top Month",
          value: stats.top_month?.month
            ? (() => {
                const [year, month] = stats.top_month.month.split("-");
                return `${month}/${year}`;
              })()
            : "N/A",
          sub: stats.top_month?.count ? `${stats.top_month.count} plays` : "",
        },
        {
          label: "Top Year",
          value: stats.top_year?.year ? stats.top_year.year : "N/A",
          sub: stats.top_year?.count ? `${stats.top_year.count} plays` : "",
        },
        {
          label: "Longest Listening Streak",
          value: stats.longest_streak ? `${stats.longest_streak} days` : "N/A",
        },
        {
          label: "% of Total Listening",
          value:
            stats.percent_of_total !== null && stats.percent_of_total !== undefined
              ? `${stats.percent_of_total}%`
              : "N/A",
        },
        {
          label: "Rank Among All Artists",
          value: stats.rank ? `#${stats.rank} of ${stats.total_artists}` : "N/A",
        },
      ]
    : [];

  if (loading) return <div className="p-4">Loading...</div>;
  if (!artist) return <div className="p-4">Artist not found.</div>;

  return (
    <div className="w-full max-w-5xl mx-auto p-4">
      <SectionHeader image={artist.image_url} title={artist.name} />

      <GroupedSection
        title="Artist Stats"
        items={statsTiles}
        showPeriod={false}
        showLimit={false}
        mapper={tile => tile}
        layout="grid"
      />

      {milestones && milestones.length > 0 && (
        <section className="mb-8">
          <MilestoneSection milestones={milestones} />
        </section>
      )}

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
            label: track.artist,
            value: track.track,
            sub: `${track.playcount ?? 0} plays`
          })}
          layout='grid'
          collapsible={true}
        />
      </section>

      <section className="mb-8">
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
            album: track.album,
            sub: track.timestamp
              ? new Date(track.timestamp * 1000).toLocaleString()
              : "Now Playing"
          })}
          collapsible={true}
        />
      </section>

      {/* Era Explorer Section */}
      <section className="mb-8">
        {artist && <Heatmap artistId={artist.id} days={30} />}
      </section>
    </div>
  );
}