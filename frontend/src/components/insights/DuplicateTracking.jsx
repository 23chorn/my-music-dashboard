import { formatValue } from "../../utils/numberFormat";
import { formatDateString } from "../../utils/dateFormatter";

export default function DuplicateTracking({ data = {} }) {
  const {
    duplicateArtistsFound = 0,
    duplicateArtistsCleaned = 0,
    duplicateAlbumsFound = 0,
    duplicateAlbumsCleaned = 0,
    duplicateTracksFound = 0,
    duplicateTracksCleaned = 0,
    lastDeduplicationRun = null,
    totalRecordsMerged = 0,
    totalRecordsDeleted = 0
  } = data;

  const duplicationItems = [
    {
      label: "Duplicate Artists",
      found: duplicateArtistsFound,
      cleaned: duplicateArtistsCleaned,
      icon: "👤"
    },
    {
      label: "Duplicate Albums",
      found: duplicateAlbumsFound,
      cleaned: duplicateAlbumsCleaned,
      icon: "💿"
    },
    {
      label: "Duplicate Tracks",
      found: duplicateTracksFound,
      cleaned: duplicateTracksCleaned,
      icon: "🎵"
    }
  ];

  const totalFound = duplicateArtistsFound + duplicateAlbumsFound + duplicateTracksFound;
  const totalCleaned = duplicateArtistsCleaned + duplicateAlbumsCleaned + duplicateTracksCleaned;
  const cleanupProgress = totalFound > 0 ? Math.round((totalCleaned / totalFound) * 100) : 100;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🧹 Duplicate Tracking</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-red-400 mb-1">
            {formatValue(totalFound)}
          </div>
          <div className="text-gray-400 text-sm">Duplicates Found</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400 mb-1">
            {formatValue(totalCleaned)}
          </div>
          <div className="text-gray-400 text-sm">Duplicates Cleaned</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-400 mb-1">
            {cleanupProgress}%
          </div>
          <div className="text-gray-400 text-sm">Cleanup Progress</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="bg-gray-800 rounded-full h-3">
          <div
            className="bg-emerald-400 rounded-full h-3"
            style={{ width: `${cleanupProgress}%` }}
          />
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="space-y-4 mb-6">
        {duplicationItems.map((item) => (
          <div key={item.label} className="flex items-center justify-between py-2 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <span className="text-xl">{item.icon}</span>
              <span className="text-gray-400">{item.label}</span>
            </div>
            <div className="flex gap-4 text-sm">
              <span className="text-red-400">
                {item.found} found
              </span>
              <span className="text-emerald-400">
                {item.cleaned} cleaned
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-bold text-white mb-1">
            {formatValue(totalRecordsMerged)}
          </div>
          <div className="text-gray-400 text-xs">Records Merged</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-white mb-1">
            {formatValue(totalRecordsDeleted)}
          </div>
          <div className="text-gray-400 text-xs">Records Deleted</div>
        </div>
      </div>

      {lastDeduplicationRun && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Last Deduplication Run</span>
            <span className="text-white text-sm font-medium">
              {formatDateString(lastDeduplicationRun)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}