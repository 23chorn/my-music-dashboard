import StatCard from "./StatCard";
import { formatValue } from "../../utils/numberFormat";

export default function ListeningTimeStats({ behaviorData, statsData }) {
  const {
    totalListeningTimeMs = 0,
    tracksWithoutDuration = 0,
    averageTrackDurationMs = 0,
    averageSessionDurationMs = 0,
    longestSessionDurationMs = 0,
    averageSessionsPerDay = 0
  } = behaviorData;

  // Calculate derived statistics
  const totalHours = Math.round(totalListeningTimeMs / (1000 * 60 * 60));
  const totalDays = Math.round(totalHours / 24 * 10) / 10;
  const averageTrackLength = Math.round(averageTrackDurationMs / 1000);

  // Format session durations
  const formatDuration = (ms) => {
    const totalMinutes = Math.round(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">⏱️ Listening Time</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
        <StatCard 
          title="Average Session" 
          value={formatDuration(averageSessionDurationMs)}
          subtitle="per session"
          color="text-green-400"
        />
        <StatCard 
          title="Longest Session" 
          value={formatDuration(longestSessionDurationMs)}
          subtitle="single session"
          color="text-green-400"
        />
        <StatCard 
          title="Sessions Per Day" 
          value={averageSessionsPerDay}
          subtitle="average daily"
          color="text-green-400"
        />
      </div>
    </div>
  );
}