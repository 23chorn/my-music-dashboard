import CollapsibleSection from "./CollapsibleSection";

export default function RecentTracksSection({
  recentTracks,
  recentLimit,
  setRecentLimit,
}) {
  return (
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
  );
}