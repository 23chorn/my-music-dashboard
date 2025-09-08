import StatCard from "./StatCard";

export default function DiscoveryFreshness({ discoveryData }) {
  const {
    hoursSinceNewTrack,
    hoursSinceNewArtist,
    hoursSinceNewAlbum
  } = discoveryData;

  // Format time display function
  const formatTime = (hours) => {
    if (hours === null || hours === undefined) return 'N/A';
    
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else {
      const days = (hours / 24);
      return `${days.toFixed(1)}d`;
    }
  };

  // Get color based on time since discovery
  const getColor = (hours) => {
    if (hours === null || hours === undefined) return 'text-gray-400';
    
    const days = hours / 24;
    if (days < 5) return 'text-green-400';
    if (days <= 14) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🔍 Discovery Freshness</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="New Track" 
          value={formatTime(hoursSinceNewTrack)} 
          subtitle="time since last discovered"
          color={getColor(hoursSinceNewTrack)}
        />
        <StatCard 
          title="New Artist" 
          value={formatTime(hoursSinceNewArtist)} 
          subtitle="time since last discovered"
          color={getColor(hoursSinceNewArtist)}
        />
        <StatCard 
          title="New Album" 
          value={formatTime(hoursSinceNewAlbum)} 
          subtitle="time since last discovered"
          color={getColor(hoursSinceNewAlbum)}
        />
      </div>
    </div>
  );
}