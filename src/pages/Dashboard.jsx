import { useEffect, useState } from "react";
import { getTopArtists, getTopTracks, getRecentTracks, fetchAllRecentTracks, getUserInfo } from "../data/lastfm";
import { getRecentTracksDataFromServer, getRecentTimestampFromServer, saveRecentTimestampToServer, saveRecentTracksToServer } from "../data/recentTracksApi";

export default function Dashboard() {
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [artistPeriod, setArtistPeriod] = useState("overall");
  const [trackPeriod, setTrackPeriod] = useState("overall");
  const [userInfo, setUserInfo] = useState(null);
  const [uniqueArtistCount, setUniqueArtistCount] = useState(null);
  const [uniqueTrackCount, setUniqueTrackCount] = useState(null);
  const [uniqueLoading, setUniqueLoading] = useState(false);
  const [lastCalculatedTimestamp, setLastCalculatedTimestamp] = useState(null);

  // On page load, use recentTracks.json to calculate unique counts and show lastTimestamp
  async function loadStoredUniqueCounts() {
    try {
      const data = await getRecentTracksDataFromServer();
      setLastCalculatedTimestamp(data.lastTimestamp);
      const tracksArray = Array.isArray(data.tracks) ? data.tracks : [];
      const uniqueArtists = new Set(tracksArray.map(t => t.artist));
      const uniqueTracks = new Set(tracksArray.map(t => t.track));
      setUniqueArtistCount(uniqueArtists.size);
      setUniqueTrackCount(uniqueTracks.size);
    } catch (e) {
      setUniqueArtistCount("-");
      setUniqueTrackCount("-");
      setLastCalculatedTimestamp(null);
    }
  }
  useEffect(() => {
    loadStoredUniqueCounts();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setTopArtists(await getTopArtists(10, artistPeriod));
    }
    fetchData();
  }, [artistPeriod]);

  useEffect(() => {
    async function fetchData() {
      setTopTracks(await getTopTracks(10, trackPeriod));
    }
    fetchData();
  }, [trackPeriod]);

  useEffect(() => {
    async function fetchRecentTracks() {
      const tracks = await getRecentTracks(10);
      setRecentTracks(Array.isArray(tracks) ? tracks.slice(0, 10) : []);
    }
    fetchRecentTracks();
  }, []);

  useEffect(() => {
    async function fetchStats() {
      const info = await getUserInfo();
      setUserInfo(info);
    }
    fetchStats();
  }, []);

  async function handleRefreshUniqueCounts() {
    setUniqueLoading(true);
    try {
      const lastTimestamp = await getRecentTimestampFromServer();
      const allTracks = await fetchAllRecentTracks({ from: lastTimestamp });
      const tracksArray = Array.isArray(allTracks) ? allTracks : [];
      const formattedTracks = tracksArray.map(t => ({
        track: t.name,
        artist: t.artist && t.artist['#text']
      }));
      await saveRecentTracksToServer(formattedTracks);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      await saveRecentTimestampToServer(currentTimestamp);

      // Immediately reload counts and timestamp from backend
      await loadStoredUniqueCounts();
    } catch (e) {
      // Optionally handle error
    }
    setUniqueLoading(false);
  }

  return (
    <div className="space-y-10">
      {/* Headline Stats */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Your Music Stats</h2>
        <div className="flex flex-wrap gap-6 text-lg items-center">
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Lifetime Play Count:</span>
            <span className="ml-2">{userInfo?.playcount ?? "-"}</span>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Unique Artists:</span>
            <span className="ml-2">{uniqueArtistCount ?? "-"}</span>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Unique Tracks:</span>
            <span className="ml-2">{uniqueTrackCount ?? "-"}</span>
          </div>
          <div className="flex flex-col items-start ml-4">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded"
              onClick={handleRefreshUniqueCounts}
              disabled={uniqueLoading}
            >
              {uniqueLoading ? "Refreshing..." : "Refresh Unique Counts"}
            </button>
            <span className="text-xs text-gray-400 mt-1">
              Last calculated: {lastCalculatedTimestamp
                ? new Date(lastCalculatedTimestamp * 1000).toLocaleString()
                : "-"}
            </span>
          </div>
        </div>
      </section>
      {/* Top Artists */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Top Artists</h2>
        <div className="mb-2">
          <label className="mr-2">Period:</label>
          <select value={artistPeriod} onChange={e => setArtistPeriod(e.target.value)} className="bg-gray-700 text-white p-1 rounded">
            <option value="overall">All Time</option>
            <option value="7day">Last 7 Days</option>
            <option value="1month">Last Month</option>
            <option value="3month">Last 3 Months</option>
            <option value="6month">Last 6 Months</option>
            <option value="12month">Last 12 Months</option>
          </select>
        </div>
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topArtists.map((artist) => (
            <li
              key={artist.name}
              className="p-4 bg-gray-800 rounded hover:bg-gray-700"
            >
              <p className="font-semibold">{artist.name}</p>
              <p className="text-sm text-gray-400">{artist.playcount} plays</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Top Tracks */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Top Tracks</h2>
        <div className="mb-2">
          <label className="mr-2">Period:</label>
          <select value={trackPeriod} onChange={e => setTrackPeriod(e.target.value)} className="bg-gray-700 text-white p-1 rounded">
            <option value="overall">All Time</option>
            <option value="7day">Last 7 Days</option>
            <option value="1month">Last Month</option>
            <option value="3month">Last 3 Months</option>
            <option value="6month">Last 6 Months</option>
            <option value="12month">Last 12 Months</option>
          </select>
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topTracks.map((track) => (
            <li
              key={track.name}
              className="p-4 bg-gray-800 rounded hover:bg-gray-700"
            >
              <p className="font-semibold">{track.name}</p>
              <p className="text-sm text-gray-400">{track.artist.name}</p>
              <p className="text-sm text-gray-400">{track.playcount} plays</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Recent Tracks */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Recent Tracks</h2>
        <ul className="space-y-2">
          {recentTracks.map((track, index) => (
            <li
              key={index}
              className="p-2 bg-gray-800 rounded hover:bg-gray-700 flex justify-between"
            >
              <span>
                {track.artist["#text"]} – {track.name}
              </span>
              <span className="text-sm text-gray-400">
                {track.date?.uts
                  ? new Date(track.date.uts * 1000).toLocaleString()
                  : "Now Playing"}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}