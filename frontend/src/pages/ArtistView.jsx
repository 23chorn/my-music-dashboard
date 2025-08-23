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
import ArtistHeatmap from "../components/ArtistHeatmap";
import RecentTracksSection from "../components/RecentTracksSection";
import TopAlbumsSection from "../components/TopAlbumsSection";
import TopTracksSection from "../components/TopTracksSection";
import TilesSection from "../components/TilesSection";

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

  // Calculate start date for last 12 months
  const endDate = new Date();
  const startDate = new Date();
  startDate.setFullYear(endDate.getFullYear() - 1);

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

      <TilesSection tiles={statsTiles} title="Artist Stats" />

      {milestones && milestones.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Milestones</h2>
          <ul className="space-y-2">
            {milestones.map(milestone => {
              const suffix = getOrdinalSuffix(milestone.milestone);
              return (
                <li
                  key={milestone.milestone}
                  className="flex flex-col md:flex-row md:items-center justify-between bg-gray-800 rounded px-4 py-2 shadow"
                >
                  <div>
                    <span className="font-bold text-blue-300">
                      {milestone.milestone}
                      {suffix} play:
                    </span>{" "}
                    <span className="font-medium">{milestone.track}</span>
                    {milestone.album && (
                      <span className="text-gray-400 ml-2">– {milestone.album}</span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm">
                    {milestone.timestamp
                      ? new Date(milestone.timestamp * 1000).toLocaleString()
                      : "N/A"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Top Tracks */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">Top Tracks</h2>
        <TopTracksSection
          topTracks={topTracks ?? []}
          trackLimit={trackLimit}
          setTrackLimit={setTrackLimit}
          trackPeriod={trackPeriod}
          setTrackPeriod={setTrackPeriod}
        />
      </section>

      {/* Top Albums */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">Top Albums</h2>
        <TopAlbumsSection
          topAlbums={topAlbums ?? []}
          albumLimit={albumLimit}
          setAlbumLimit={setAlbumLimit}
          albumPeriod={albumPeriod}
          setAlbumPeriod={setAlbumPeriod}
        />
      </section>

      {/* Recent Plays */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">Recent Plays</h2>
        <RecentTracksSection
          recentTracks={recentPlays}
          recentLimit={recentLimit}
          setRecentLimit={setRecentLimit}
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