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
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-2">Details</h3>
      <div className="space-y-2">
        {track.duration_ms && (
          <div className="text-white">
            <span className="text-gray-400">Duration:</span> {formatDuration(track.duration_ms)}
          </div>
        )}
        <div className="text-white">
          <span className="text-gray-400">Total Plays:</span> {track.play_count || 0}
        </div>
        {track.popularity && (
          <div className="text-white">
            <span className="text-gray-400">Spotify Popularity:</span> {track.popularity}/100
          </div>
        )}
      </div>
    </div>
  );
}