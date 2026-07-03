import StatCard from "./StatCard";
import { createStatsSection } from "../../utils/statsFormatter";

export default function StatsSection({ stats, type = 'artist', title = 'Stats' }) {
  const statsTiles = createStatsSection(stats, type);
  
  if (!statsTiles.length) {
    return (
      <div className="bg-surface-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
        <div className="text-center text-surface-400">No stats available</div>
      </div>
    );
  }

  // Color scheme for different stat types
  const colors = [
    "text-brand-400",
    "text-success-400", 
    "text-highlight-400",
    "text-orange-400",
    "text-pink-400",
    "text-cyan-400",
    "text-warning-400",
    "text-danger-400",
    "text-indigo-400"
  ];
  
  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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