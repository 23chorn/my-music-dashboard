import { formatValue } from "../../utils/numberFormat";

export default function MetadataCompletion({ data = {} }) {
  const {
    artistsWithImages = 0,
    totalArtists = 0,
    albumsWithImages = 0,
    totalAlbums = 0,
    tracksWithDuration = 0,
    totalTracks = 0,
    tracksWithReleaseDate = 0,
    albumsWithReleaseDate = 0,
    totalAlbums: totalAlbumsForDate = 0
  } = data;

  const completionItems = [
    {
      label: "Artist Images",
      completed: artistsWithImages,
      total: totalArtists,
      colorClasses: {
        text: "text-emerald-400",
        bg: "bg-emerald-400"
      }
    },
    {
      label: "Album Images",
      completed: albumsWithImages,
      total: totalAlbums,
      colorClasses: {
        text: "text-brand-400",
        bg: "bg-brand-400"
      }
    },
    {
      label: "Track Duration",
      completed: tracksWithDuration,
      total: totalTracks,
      colorClasses: {
        text: "text-highlight-400",
        bg: "bg-highlight-400"
      }
    },
    {
      label: "Track Release Date",
      completed: tracksWithReleaseDate,
      total: totalTracks,
      colorClasses: {
        text: "text-orange-400",
        bg: "bg-orange-400"
      }
    },
    {
      label: "Album Release Date",
      completed: albumsWithReleaseDate,
      total: totalAlbumsForDate || totalAlbums,
      colorClasses: {
        text: "text-pink-400",
        bg: "bg-pink-400"
      }
    }
  ];

  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Metadata Completion</h2>
      <p className="text-surface-400 text-sm mb-6">
        Completeness of metadata fields across your music library
      </p>

      <div className="space-y-4">
        {completionItems.map((item) => {
          const percentage = item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0;

          return (
            <div key={item.label}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-white font-medium">{item.label}</h3>
                <span className={`text-lg font-bold ${item.colorClasses.text}`}>
                  {percentage}%
                </span>
              </div>
              <p className="text-surface-400 text-xs mb-2">
                {formatValue(item.completed)} of {formatValue(item.total)} items
              </p>
              <div className="bg-surface-800 rounded-full h-2">
                <div
                  className={`${item.colorClasses.bg} rounded-full h-2`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-surface-800 rounded-lg">
        <h3 className="text-white font-medium mb-2">Overall Completion</h3>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {Math.round(
              completionItems.reduce((acc, item) => {
                const percentage = item.total > 0 ? (item.completed / item.total) * 100 : 0;
                return acc + percentage;
              }, 0) / completionItems.length
            )}%
          </div>
          <div className="text-surface-400 text-sm">Average metadata completeness</div>
        </div>
      </div>
    </div>
  );
}