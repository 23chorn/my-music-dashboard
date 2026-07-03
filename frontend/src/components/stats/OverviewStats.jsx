import StatCard from "./StatCard";
import { formatValue } from "../../utils/numberFormat";
import { ChartBarIcon } from '@heroicons/react/24/outline';

export default function OverviewStats({ statsData }) {
  const {
    playCount = 0,
    uniqueTrackCount = 0,
    uniqueArtistCount = 0,
    uniqueAlbumCount = 0
  } = statsData;

  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <ChartBarIcon className="w-6 h-6 text-brand-400" />
        <h2 className="text-2xl font-bold text-white">Overview</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          title="Total Plays" 
          value={formatValue(playCount)} 
          color="text-brand-400"
        />
        <StatCard 
          title="Unique Tracks" 
          value={formatValue(uniqueTrackCount)} 
          color="text-success-400"
        />
        <StatCard 
          title="Unique Artists" 
          value={formatValue(uniqueArtistCount)} 
          color="text-highlight-400"
        />
        <StatCard 
          title="Unique Albums" 
          value={formatValue(uniqueAlbumCount)} 
          color="text-orange-400"
        />
      </div>
    </div>
  );
}