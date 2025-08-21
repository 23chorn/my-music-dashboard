export default function StatsSection({ playCount, uniqueArtists, uniqueAlbums, uniqueTracks }) {
  return (
    <div className="flex flex-wrap gap-6 text-lg items-center mb-8">
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
  );
}