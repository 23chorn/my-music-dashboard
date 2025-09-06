import StatCard from "./StatCard";
import { formatValue } from "../../utils/numberFormat";

export default function ListeningTimeStats({ behaviorData, statsData }) {
  const {
    totalListeningTimeMs = 0,
    tracksWithoutDuration = 0,
    averageTrackDurationMs = 0
  } = behaviorData;

  // Calculate derived statistics
  const totalHours = Math.round(totalListeningTimeMs / (1000 * 60 * 60));
  const totalDays = Math.round(totalHours / 24 * 10) / 10;
  const averageTrackLength = Math.round(averageTrackDurationMs / 1000);

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">⏱️ Listening Time</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard 
          title="Total Hours" 
          value={formatValue(totalHours)} 
          subtitle="hours of music"
          color="text-cyan-400"
        />
        <StatCard 
          title="Total Days" 
          value={totalDays} 
          subtitle="days equivalent"
          color="text-cyan-400"
        />
        <StatCard 
          title="Average Track" 
          value={`${Math.floor(averageTrackLength / 60)}:${String(averageTrackLength % 60).padStart(2, '0')}` }
          subtitle="minutes"
          color="text-cyan-400"
        />
      </div>
    </div>
  );
}