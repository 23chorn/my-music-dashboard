import { useEffect, useState } from "react";
import { getTopArtists, getTopTracks, getRecentTracks, fetchAllRecentTracks, getUserInfo, getTopAlbums } from "../data/lastfm";
import { getRecentTracksDataFromServer, getRecentTimestampFromServer, saveRecentTimestampToServer, saveRecentTracksToServer } from "../data/recentTracksApi";
import { FaSyncAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-8">
      <button
        className="flex items-center text-xl font-bold mb-2 bg-gray-900 px-4 py-2 rounded w-full justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <span>{title}</span>
        {open ? <FaChevronUp /> : <FaChevronDown />}
      </button>
      {open && <div>{children}</div>}
    </section>
  );
}

export default function Dashboard() {
  const [topArtists, setTopArtists] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [recentTracks, setRecentTracks] = useState([]);
  const [artistPeriod, setArtistPeriod] = useState("overall");
  const [trackPeriod, setTrackPeriod] = useState("overall");
  const [topAlbums, setTopAlbums] = useState([]);
  const [albumPeriod, setAlbumPeriod] = useState("overall");
  const [userInfo, setUserInfo] = useState(null);
  const [uniqueArtistCount, setUniqueArtistCount] = useState(null);
  const [uniqueTrackCount, setUniqueTrackCount] = useState(null);
  const [uniqueAlbumCount, setUniqueAlbumCount] = useState(null);
  const [uniqueLoading, setUniqueLoading] = useState(false);
  const [lastCalculatedTimestamp, setLastCalculatedTimestamp] = useState(null);

  // On page load, use recentTracks.json to calculate unique counts and show lastTimestamp
  async function loadStoredUniqueCounts() {
    try {
      const data = await getRecentTracksDataFromServer();
      setLastCalculatedTimestamp(data.lastTimestamp);
      const tracksArray = Array.isArray(data.tracks) ? data.tracks : [];
      const uniqueArtists = new Set(tracksArray.map(t => t.artist));
      const uniqueAlbums = new Set(tracksArray.map(t => t.album).filter(Boolean));
      const uniqueTracks = new Set(tracksArray.map(t => t.track));
      setUniqueArtistCount(uniqueArtists.size);
      setUniqueAlbumCount(uniqueAlbums.size);
      setUniqueTrackCount(uniqueTracks.size);
    } catch (e) {
      setUniqueArtistCount("-");
      setUniqueAlbumCount("-");
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

  useEffect(() => {
    async function fetchTopAlbums() {
      const albums = await getTopAlbums(10, albumPeriod);
      setTopAlbums(albums);
    }
    fetchTopAlbums();
  }, [albumPeriod]);

  async function handleRefreshAllStats() {
    setUniqueLoading(true);
    try {
      // Refresh unique counts
      const lastTimestamp = await getRecentTimestampFromServer();
      const allTracks = await fetchAllRecentTracks({ from: lastTimestamp });
      const tracksArray = Array.isArray(allTracks) ? allTracks.filter(t => t.date?.uts) : [];
      const formattedTracks = tracksArray.map(t => ({
        track: t.name,
        artist: t.artist && t.artist['#text'],
        album: t.album && t.album['#text'] ? t.album['#text'] : null,
        timestamp: Number(t.date.uts)
      }));
      await saveRecentTracksToServer(formattedTracks);
      const latestTimestamp = formattedTracks.length > 0
        ? Math.max(...formattedTracks.map(t => t.timestamp))
        : lastTimestamp;
      await saveRecentTimestampToServer(latestTimestamp);

      // Refresh headline stats
      await loadStoredUniqueCounts();
      const info = await getUserInfo();
      setUserInfo(info);

      // Refresh top artists/tracks
      setTopArtists(await getTopArtists(10, artistPeriod));
      setTopTracks(await getTopTracks(10, trackPeriod));
      const tracks = await getRecentTracks(10);
      setRecentTracks(Array.isArray(tracks) ? tracks.slice(0, 10) : []);
    } catch (e) {
      // Optionally handle error
    }
    setUniqueLoading(false);
  }

  return (
    <div className="space-y-10">
      {/* Headline Stats */}
      <section className="mb-8 relative">
        <h2 className="text-2xl font-bold mb-2">Welcome to Chorn's Music Dashboard!</h2>
        {/* Refresh button in top right */}
        <button
          className="absolute top-0 right-0 bg-blue-600 text-white px-2 py-2 rounded flex items-center mt-2 mr-2"
          onClick={handleRefreshAllStats}
          disabled={uniqueLoading}
          title="Refresh all stats"
          style={{ fontSize: "1.2rem" }}
        >
          <FaSyncAlt className={uniqueLoading ? "animate-spin" : ""} />
        </button>
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
            <span className="font-semibold">Unique Albums:</span>
            <span className="ml-2">{uniqueAlbumCount ?? "-"}</span>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Unique Tracks:</span>
            <span className="ml-2">{uniqueTrackCount ?? "-"}</span>
          </div>
        </div>
      </section>

      {/* Top Artists */}
      <CollapsibleSection title="Top Artists">
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
              className="p-4 bg-gray-800 rounded hover:bg-gray-700 flex flex-col items-center"
            >
              {artist.image ? (
                <img
                  src={artist.image}
                  alt={artist.name}
                  className="mb-2 rounded-full w-20 h-20 object-cover"
                />
              ) : (
                <div className="mb-2 rounded-full w-20 h-20 bg-gray-700 flex items-center justify-center text-gray-400 text-2xl font-bold">
                  {artist.name
                    .split(" ")
                    .map(word => word[0])
                    .join("")
                    .toUpperCase()}
                </div>
              )}
              <p className="font-semibold">{artist.name}</p>
              <p className="text-sm text-gray-400">{artist.playcount} plays</p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Top Tracks */}
      <CollapsibleSection title="Top Tracks">
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
      </CollapsibleSection>

      {/* Top Albums */}
      <CollapsibleSection title="Top Albums">
        <div className="mb-2">
          <label className="mr-2">Period:</label>
          <select value={albumPeriod} onChange={e => setAlbumPeriod(e.target.value)} className="bg-gray-700 text-white p-1 rounded">
            <option value="overall">All Time</option>
            <option value="7day">Last 7 Days</option>
            <option value="1month">Last Month</option>
            <option value="3month">Last 3 Months</option>
            <option value="6month">Last 6 Months</option>
            <option value="12month">Last 12 Months</option>
          </select>
        </div>
        <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topAlbums.map((album) => (
            <li
              key={album.name + album.artist}
              className="p-4 bg-gray-800 rounded hover:bg-gray-700 flex flex-col items-center"
            >
              {album.image && (
                <img
                  src={album.image}
                  alt={album.name}
                  className="mb-2 rounded w-20 h-20 object-cover"
                />
              )}
              <p className="font-semibold">
                {album.name.length > 25
                  ? album.name.slice(0, 25) + "..."
                  : album.name}
              </p>
              <p className="text-sm text-gray-400">{album.artist}</p>
              <p className="text-sm text-gray-400">{album.playcount} plays</p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Recent Tracks */}
      <CollapsibleSection title="Recent Tracks">
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
      </CollapsibleSection>

      {/* Last refresh footnote at bottom of page */}
      <div className="w-full flex justify-end mt-8">
        <span className="text-xs text-gray-400 mr-2">
          Last unique counts refresh: {lastCalculatedTimestamp
            ? new Date(lastCalculatedTimestamp * 1000).toLocaleString()
            : "-"}
        </span>
      </div>
    </div>
  );
}