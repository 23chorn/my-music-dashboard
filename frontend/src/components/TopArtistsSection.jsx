import { useNavigate } from "react-router-dom";
import CollapsibleSection from "./CollapsibleSection";

export default function TopArtistsSection({
  topArtists,
  artistLimit,
  setArtistLimit,
  artistPeriod,
  setArtistPeriod,
}) {
  const navigate = useNavigate();

  return (
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
        {topArtists.map((artist, idx) => (
          <li
            key={artist.artistId}
            className="mb-2 px-2 py-4 bg-gray-800 rounded shadow cursor-pointer hover:bg-blue-900 transition text-blue-400 flex flex-col items-center justify-center"
            onClick={() => navigate(`/artist/${artist.artistId}`)}
            style={{ minHeight: "80px" }}
            title={`View ${artist.artist}`}
          >
            <span className="font-semibold text-lg">{artist.artist}</span>
            <span className="text-gray-400 text-sm">({artist.playcount} plays)</span>
          </li>
        ))}
      </ul>
    </CollapsibleSection>
  );
}