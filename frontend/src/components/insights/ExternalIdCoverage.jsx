import { formatValue } from "../../utils/numberFormat";

export default function ExternalIdCoverage({ data = {} }) {
  const {
    artistsWithSpotifyId = 0,
    totalArtists = 0,
    tracksWithSpotifyId = 0,
    totalTracks = 0,
    albumsWithSpotifyId = 0,
    totalAlbums = 0
  } = data;

  const artistCoverage = totalArtists > 0 ? Math.round((artistsWithSpotifyId / totalArtists) * 100) : 0;
  const trackCoverage = totalTracks > 0 ? Math.round((tracksWithSpotifyId / totalTracks) * 100) : 0;
  const albumCoverage = totalAlbums > 0 ? Math.round((albumsWithSpotifyId / totalAlbums) * 100) : 0;

  const coverageItems = [
    {
      label: "Artists",
      coverage: artistCoverage,
      withId: artistsWithSpotifyId,
      total: totalArtists,
      colorClasses: {
        text: "text-emerald-400",
        bg: "bg-emerald-400"
      }
    },
    {
      label: "Albums",
      coverage: albumCoverage,
      withId: albumsWithSpotifyId,
      total: totalAlbums,
      colorClasses: {
        text: "text-blue-400",
        bg: "bg-blue-400"
      }
    },
    {
      label: "Tracks",
      coverage: trackCoverage,
      withId: tracksWithSpotifyId,
      total: totalTracks,
      colorClasses: {
        text: "text-purple-400",
        bg: "bg-purple-400"
      }
    }
  ];

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🔗 External ID Coverage</h2>
      <p className="text-gray-400 text-sm mb-6">
        Percentage of content linked to external services (Spotify/Last.fm)
      </p>

      <div className="space-y-6">
        {coverageItems.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-white">{item.label}</h3>
              <span className={`text-2xl font-bold ${item.colorClasses.text}`}>
                {item.coverage}%
              </span>
            </div>
            <p className="text-gray-400 text-sm mb-3">
              {formatValue(item.withId)} of {formatValue(item.total)} {item.label.toLowerCase()} have external IDs
            </p>
            <div className="bg-gray-800 rounded-full h-3">
              <div
                className={`${item.colorClasses.bg} rounded-full h-3`}
                style={{ width: `${item.coverage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}