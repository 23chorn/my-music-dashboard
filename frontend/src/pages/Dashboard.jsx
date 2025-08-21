import { useEffect, useState } from "react";
import { 
    getTopArtistsFromServer, 
    getTopTracksFromServer, 
    getRecentTracksFromServer,
    getTopAlbumsFromServer,
    getUniqueCountsFromServer  
  } from "../data/dashboardApi";
import { FaSyncAlt, FaChevronDown, FaChevronUp } from "react-icons/fa";

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="mb-8">
      <button
        className="flex items-center text-xl font-bold mb-2 bg-gray-900 px-4 py-2 rounded w-full justify-between min-w-0"
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
  const [uniqueArtists, setUniqueArtists] = useState(null);
  const [uniqueTracks, setUniqueTracks] = useState(null);
  const [uniqueAlbums, setUniqueAlbums] = useState(null);
  const [playCount, setPlayCount] = useState(null);
  const [uniqueLoading, setUniqueLoading] = useState(false);
  const [artistLimit, setArtistLimit] = useState(10);
  const [trackLimit, setTrackLimit] = useState(10);
  const [albumLimit, setAlbumLimit] = useState(10);
  const [recentLimit, setRecentLimit] = useState(10);

  // Fetch unique counts from backend
  async function fetchUniqueCounts() {
    setUniqueLoading(true);
    try {
      const data = await getUniqueCountsFromServer();
      setUniqueArtists(data.uniqueArtistCount);
      setUniqueTracks(data.uniqueTrackCount);
      setUniqueAlbums(data.uniqueAlbumCount);
      setPlayCount(data.playCount);
    } catch (e) {
      setUniqueArtists("-");
      setUniqueTracks("-");
      setUniqueAlbums("-");
      setPlayCount("-");
    }
    setUniqueLoading(false);
  }

  useEffect(() => {
    fetchUniqueCounts();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setTopArtists(await getTopArtistsFromServer(artistLimit, artistPeriod));
    }
    fetchData();
  }, [artistPeriod, artistLimit]);

  useEffect(() => {
    async function fetchData() {
      setTopTracks(await getTopTracksFromServer(trackLimit, trackPeriod));
    }
    fetchData();
  }, [trackPeriod, trackLimit]);

  useEffect(() => {
    async function fetchRecentTracks() {
      setRecentTracks(await getRecentTracksFromServer(recentLimit));
    }
    fetchRecentTracks();
  }, [recentLimit]);

  useEffect(() => {
    async function fetchTopAlbums() {
      setTopAlbums(await getTopAlbumsFromServer(albumLimit, albumPeriod));
    }
    fetchTopAlbums();
  }, [albumPeriod, albumLimit]);

  useEffect(() => {
    document.title = "Chorn's Music Dashboard";
  }, []);

  return (
    <div className="space-y-10 px-2 sm:px-4 md:px-8 w-full min-w-0">
      {/* Headline Stats */}
      <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <h2 className="text-2xl font-bold">Welcome to Chorn's Music Dashboard!</h2>
        {/* Refresh button in top right */}
        <button
          className="w-12 h-12 flex items-center justify-center rounded bg-blue-600 text-white hover:bg-blue-700 transition mt-2 sm:mt-0 self-start sm:self-auto"
          onClick={fetchUniqueCounts}
          disabled={uniqueLoading}
          title="Refresh unique counts"
          style={{ overflow: "visible" }}
        >
          <FaSyncAlt
            className={uniqueLoading ? "animate-spin" : ""}
            style={{ fontSize: "2.5rem" }}
          />
        </button>
      </section>

      <div className="flex flex-wrap gap-6 text-lg items-center">
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Total Play Count:</span>
            <span className="ml-2">{playCount != null ? playCount.toLocaleString() : "-"}</span>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Unique Artists:</span>
            <span className="ml-2">{uniqueArtists != null ? uniqueArtists.toLocaleString() : "-"}</span>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Unique Albums:</span>
            <span className="ml-2">{uniqueAlbums != null ? uniqueAlbums.toLocaleString() : "-"}</span>
          </div>
          <div className="bg-gray-800 rounded p-4">
            <span className="font-semibold">Unique Tracks:</span>
            <span className="ml-2">{uniqueTracks != null ? uniqueTracks.toLocaleString() : "-"}</span>
          </div>
        </div>

      {/* Top Artists */}
      <CollapsibleSection title="Top Artists">
        <div className="mb-2 flex flex-wrap gap-4 items-center">
          <div>
            <label className="mr-2">Period:</label>
            <select
              value={artistPeriod}
              onChange={e => setArtistPeriod(e.target.value)}
              className="bg-gray-700 text-white p-1 rounded"
            >
              <option value="overall">All Time</option>
              <option value="7day">Last 7 Days</option>
              <option value="1month">Last Month</option>
              <option value="3month">Last 3 Months</option>
              <option value="6month">Last 6 Months</option>
              <option value="12month">Last 12 Months</option>
            </select>
          </div>
          <div>
            <label className="mr-2">Limit:</label>
            <select
              value={artistLimit}
              onChange={e => setArtistLimit(Math.min(50, Number(e.target.value)))}
              className="bg-gray-700 text-white p-1 rounded"
            >
              {[5,10,15,20,25,30,40,50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topArtists.map((artist) => (
            <li
              key={artist.artist}
              className="p-4 bg-gray-800 rounded hover:bg-gray-700 flex flex-col items-center"
            >
              {artist.image && (
                <img
                  src={artist.image}
                  alt={artist.artist}
                  className="mb-2 rounded-full w-20 h-20 object-cover"
                />
              )}
              <p className="font-semibold">{artist.artist}</p>
              <p className="text-sm text-gray-400">
                {artist.playcount != null ? artist.playcount.toLocaleString() : 0} plays
              </p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Top Tracks */}
      <CollapsibleSection title="Top Tracks" className="w-full min-w-0">
        <div className="mb-2 flex flex-wrap gap-4 items-center">
          <div>
            <label className="mr-2">Period:</label>
            <select
              value={trackPeriod}
              onChange={e => setTrackPeriod(e.target.value)}
              className="bg-gray-700 text-white p-1 rounded"
            >
              <option value="overall">All Time</option>
              <option value="7day">Last 7 Days</option>
              <option value="1month">Last Month</option>
              <option value="3month">Last 3 Months</option>
              <option value="6month">Last 6 Months</option>
              <option value="12month">Last 12 Months</option>
            </select>
          </div>
          <div>
            <label className="mr-2">Limit:</label>
            <select
              value={trackLimit}
              onChange={e => setTrackLimit(Math.min(50, Number(e.target.value)))}
              className="bg-gray-700 text-white p-1 rounded"
            >
              {[5,10,15,20,25,30,40,50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topTracks.map((track) => (
            <li
              key={track.track}
              className="p-4 bg-gray-800 rounded hover:bg-gray-700"
            >
              <p className="font-semibold truncate">{track.track}</p>
              <p className="text-sm text-gray-400">{track.artist.artist}</p>
              <p className="text-sm text-gray-400">
                {track.playcount != null ? track.playcount.toLocaleString() : 0} plays
              </p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Top Albums */}
      <CollapsibleSection title="Top Albums">
        <div className="mb-2 flex flex-wrap gap-4 items-center">
          <div>
            <label className="mr-2">Period:</label>
            <select
              value={albumPeriod}
              onChange={e => setAlbumPeriod(e.target.value)}
              className="bg-gray-700 text-white p-1 rounded"
            >
              <option value="overall">All Time</option>
              <option value="7day">Last 7 Days</option>
              <option value="1month">Last Month</option>
              <option value="3month">Last 3 Months</option>
              <option value="6month">Last 6 Months</option>
              <option value="12month">Last 12 Months</option>
            </select>
          </div>
          <div>
            <label className="mr-2">Limit:</label>
            <select
              value={albumLimit}
              onChange={e => setAlbumLimit(Math.min(50, Number(e.target.value)))}
              className="bg-gray-700 text-white p-1 rounded"
            >
              {[5,10,15,20,25,30,40,50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {topAlbums.map((album) => (
            <li
              key={album.album + album.artist}
              className="p-4 bg-gray-800 rounded hover:bg-gray-700 flex flex-col items-center"
            >
              {album.image && (
                <img
                  src={album.image}
                  alt={album.album}
                  className="mb-2 rounded w-20 h-20 object-cover"
                />
              )}
              <p 
                className="font-semibold"
                title={album.album}
              >
                {album.album.length > 20
                  ? album.album.slice(0, 20) + "..."
                  : album.album}
              </p>
              <p className="text-sm text-gray-400">{album.artist}</p>
              <p className="text-sm text-gray-400">
                {album.playcount != null ? album.playcount.toLocaleString() : 0} plays
              </p>
            </li>
          ))}
        </ul>
      </CollapsibleSection>

      {/* Recent Tracks */}
      <CollapsibleSection title="Recent Tracks">
        <div className="mb-2 flex flex-wrap gap-4 items-center">
          <div>
            <label className="mr-2">Limit:</label>
            <select
              value={recentLimit}
              onChange={e => setRecentLimit(Math.min(50, Number(e.target.value)))}
              className="bg-gray-700 text-white p-1 rounded"
            >
              {[5,10,15,20,25,30,40,50].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="space-y-2">
          {recentTracks.map((track, index) => (
            <li
              key={index}
              className="p-2 bg-gray-800 rounded hover:bg-gray-700 flex flex-col md:flex-row md:justify-between"
            >
              <span>
                <span className="font-semibold">{track.track}</span>
                {" — "}
                <span className="text-gray-300">{track.artist}</span>
                {track.album && (
                  <>
                    {" • "}
                    <span className="italic text-gray-400">{track.album}</span>
                  </>
                )}
              </span>
              <span className="text-sm text-gray-400">
                {track.timestamp
                  ? new Date(track.timestamp * 1000).toLocaleString()
                  : "Now Playing"}
              </span>
            </li>
          ))}
        </ul>
      </CollapsibleSection>
    </div>
  );
}