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
import TopTracksSection from "../components/TopTracksSection";

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

      {stats && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Artist Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">Total Streams</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.total_streams ?? "N/A"}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">First Streamed</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.first_play ? new Date(stats.first_play * 1000).toLocaleDateString() : "N/A"}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">Most Recent Stream</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.last_play ? new Date(stats.last_play * 1000).toLocaleDateString() : "N/A"}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">Top Day</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.top_day?.day
                  ? (() => {
                      const d = new Date(stats.top_day.day);
                      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
                        .toString()
                        .padStart(2, "0")}/${d.getFullYear()}`;
                    })()
                  : "N/A"}
              </span>
              <span className="text-gray-400 text-xs">
                {stats.top_day?.count ? `${stats.top_day.count} plays` : ""}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">Top Month</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.top_month?.month
                  ? (() => {
                      const [year, month] = stats.top_month.month.split("-");
                      return `${month}/${year}`;
                    })()
                  : "N/A"}
              </span>
              <span className="text-gray-400 text-xs">
                {stats.top_month?.count ? `${stats.top_month.count} plays` : ""}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">Top Year</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.top_year?.year ? stats.top_year.year : "N/A"}
              </span>
              <span className="text-gray-400 text-xs">
                {stats.top_year?.count ? `${stats.top_year.count} plays` : ""}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">Longest Listening Streak</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.longest_streak ? `${stats.longest_streak} days` : "N/A"}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">% of Total Listening</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.percent_of_total !== null && stats.percent_of_total !== undefined
                  ? `${stats.percent_of_total}%`
                  : "N/A"}
              </span>
            </div>
            <div className="bg-gray-800 rounded-lg shadow p-4 flex flex-col items-center">
              <span className="text-gray-400 text-sm mb-1">Rank Among All Artists</span>
              <span className="font-bold text-lg text-blue-300">
                {stats.rank ? `#${stats.rank} of ${stats.total_artists}` : "N/A"}
              </span>
            </div>
          </div>
        </section>
      )}

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Top Tracks */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">Top Tracks</h2>
          <ol className="space-y-2">
            {topTracks.length === 0 && <li className="text-gray-400">No tracks found.</li>}
            {topTracks.map((track, idx) => (
              <li
                key={track.id}
                className="flex items-center justify-between bg-gray-800 rounded px-4 py-2 shadow hover:bg-blue-900 transition"
              >
                <div>
                  <span className="font-medium text-lg">{idx + 1}. {track.name}</span>
                  {track.album && (
                    <span className="text-gray-400 ml-2">– {track.album}</span>
                  )}
                </div>
                <span className="text-gray-400 text-sm">{track.playcount} plays</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Top Albums */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 text-blue-400">Top Albums</h2>
          <ol className="space-y-2">
            {topAlbums.length === 0 && <li className="text-gray-400">No albums found.</li>}
            {topAlbums.map((album, idx) => (
              <li
                key={album.id}
                className="flex items-center justify-between bg-gray-800 rounded px-4 py-2 shadow hover:bg-blue-900 transition"
              >
                <span className="font-medium text-lg">{idx + 1}. {album.name}</span>
                <span className="text-gray-400 text-sm">{album.playcount} plays</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Recent Plays */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 text-blue-400">Recent Plays</h2>
        <RecentTracksSection
  recentTracks={recentPlays}
  recentLimit={recentPlays.length} // or set a limit if you want
  setRecentLimit={() => {}} // pass a no-op if you don't want to change limit here
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