import StatCard from "./StatCard";
import { createStatsSection } from "../../utils/statsFormatter";

export default function StatsSection({ stats, type = 'artist', title = 'Stats' }) {
  const statsTiles = createStatsSection(stats, type);
  
  if (!statsTiles.length) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="text-center text-gray-400">No stats available</div>
      </div>
    );
  }

  // Color scheme for different stat types
  const colors = [
    "text-blue-400",
    "text-green-400", 
    "text-purple-400",
    "text-orange-400",
    "text-pink-400",
    "text-cyan-400",
    "text-yellow-400",
    "text-red-400",
    "text-indigo-400"
  ];
  
  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsTiles.map((tile, index) => (
          <StatCard
            key={tile.label}
            title={tile.label}
            value={tile.value || "N/A"}
            subtitle={tile.sub || ""}
            color={colors[index % colors.length]}
          />
        ))}
      </div>
    </div>
  );
}