import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getArtistInfo,
  getArtistTopTracks,
  getArtistTopAlbums,
  getArtistRecentPlays,
  getArtistStats,
  getArtistMilestones,
  getArtistDailyPlays
} from "../data/artistApi";
import { getOrdinalSuffix } from "../utils/ordinalSuffix";
import ArtistHeatmap from "../components/Heatmap";
import GroupedSection from "../components/GroupedSection";
import ListTile from "../components/ListTile";

export default function ArtistView() {
  const { id } = useParams();
  const [artist, setArtist] = useState(null);
  const [topTracks, setTopTracks] = useState([]);
  const [topAlbums, setTopAlbums] = useState([]);
  const [recentPlays, setRecentPlays] = useState([]);
  const [stats, setStats] = useState(null);
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dailyPlays, setDailyPlays] = useState([]);
  const [recentLimit, setRecentLimit] = useState(5);
  const [albumLimit, setAlbumLimit] = useState(5);
  const [albumPeriod, setAlbumPeriod] = useState("overall");
  const [trackLimit, setTrackLimit] = useState(5);
  const [trackPeriod, setTrackPeriod] = useState("overall");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [
          artistData,
          tracks,
          albums,
          plays,
          statsData,
          milestonesData
        ] = await Promise.all([
          getArtistInfo(id),
          getArtistTopTracks(id),
          getArtistTopAlbums(id),
          getArtistRecentPlays(id),
          getArtistStats(id),
          getArtistMilestones(id)
        ]);
        setArtist(artistData);
        setTopTracks(tracks);
        setTopAlbums(albums);
        setRecentPlays(plays);
        setStats(statsData);
        setMilestones(milestonesData);
      } catch {
        setArtist(null);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  useEffect(() => {
    async function fetchEraData() {
      try {
        const daily = await getArtistDailyPlays(id);
        setDailyPlays(daily);
      } catch {
        setDailyPlays([]);
      }
    }
    fetchEraData();
  }, [id]);

  useEffect(() => {
    async function fetchRecentPlays() {
      try {
        const plays = await getArtistRecentPlays(id, recentLimit);
        setRecentPlays(plays);
      } catch {
        setRecentPlays([]);
      }
    }
    if (id) fetchRecentPlays();
  }, [id, recentLimit]);

  // Fetch top albums when albumLimit or albumPeriod changes
  useEffect(() => {
    async function fetchTopAlbums() {
      try {
        const albums = await getArtistTopAlbums(id, albumLimit, albumPeriod);
        setTopAlbums(albums);
      } catch {
        setTopAlbums([]);
      }
    }
    if (id) fetchTopAlbums();
  }, [id, albumLimit, albumPeriod]);

  // Fetch top tracks when trackLimit or trackPeriod changes
  useEffect(() => {
    async function fetchTopTracks() {
      try {
        const tracks = await getArtistTopTracks(id, trackLimit, trackPeriod);
        setTopTracks(tracks);
      } catch {
        setTopTracks([]);
      }
    }
    if (id) fetchTopTracks();
  }, [id, trackLimit, trackPeriod]);

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
      <div className="flex items-center gap-6 mb-8">
        {artist.image_url && (
          <img src={artist.image_url} alt={artist.name} className="w-28 h-28 rounded shadow-lg object-cover" />
        )}
        <div>
          <h1 className="text-4xl font-bold mb-2">{artist.name}</h1>
        </div>
      </div>

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
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Milestones</h2>
          <ul className="space-y-2">
            {milestones.map(milestone => (
              <ListTile
                key={milestone.milestone}
                label={`${milestone.milestone}${getOrdinalSuffix(milestone.milestone)} play:`}
                value={milestone.track}
                album={milestone.album}
                sub={
                  milestone.timestamp
                    ? new Date(milestone.timestamp * 1000).toLocaleString()
                    : "N/A"
                }
              />
            ))}
          </ul>
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
            label: track.track,
            value: track.artist,
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
            label: album.album,
            value: album.artist,
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
            value: track.artist,
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
        <h2 className="text-xl font-semibold mb-4 text-blue-400">Era Explorer: Heatmap of Plays</h2>
        {artist && <ArtistHeatmap artistId={artist.id} days={30} />}
      </section>
    </div>
  );
}