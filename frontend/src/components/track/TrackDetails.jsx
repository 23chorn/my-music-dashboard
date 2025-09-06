export default function TrackDetails({ track }) {
  // Format duration helper
  const formatDuration = (ms) => {
    if (!ms) return null;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Details</h3>
      <div className="space-y-4">
        {track.duration_ms && (
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Duration</div>
            <div className="text-lg font-medium text-white">{formatDuration(track.duration_ms)}</div>
          </div>
        )}
        {track.popularity && (
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Spotify Popularity</div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-medium text-white">{track.popularity}/100</div>
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${track.popularity}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}