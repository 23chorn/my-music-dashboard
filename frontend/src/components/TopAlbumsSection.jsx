import CollapsibleSection from "./CollapsibleSection";

export default function TopAlbumsSection({
  topAlbums,
  albumLimit,
  setAlbumLimit,
  albumPeriod,
  setAlbumPeriod,
}) {
  return (
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
  )};