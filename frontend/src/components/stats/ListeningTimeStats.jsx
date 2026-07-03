import StatCard from "./StatCard";
import { formatValue } from "../../utils/numberFormat";
import { ClockIcon } from '@heroicons/react/24/outline';

export default function ListeningTimeStats({ behaviorData }) {
  const {
    totalListeningTimeMs = 0,
    averageTrackDurationMs = 0,
    averageSessionDurationMs = 0,
    longestSessionDurationMs = 0,
    averageSessionsPerDay = 0,
    peakListeningHourFormatted = 'N/A',
    mostActiveDay = 'N/A'
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
    <div className="bg-surface-900 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <ClockIcon className="w-6 h-6 text-success-400" />
        <h2 className="text-2xl font-bold text-white">Listening Time</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
          title="Peak Hour" 
          value={peakListeningHourFormatted}
          subtitle="most active hour"
          color="text-orange-400"
        />
        <StatCard 
          title="Average Session" 
          value={formatDuration(averageSessionDurationMs)}
          subtitle="per session"
          color="text-success-400"
        />
        <StatCard 
          title="Longest Session" 
          value={formatDuration(longestSessionDurationMs)}
          subtitle="single session"
          color="text-success-400"
        />
        <StatCard 
          title="Sessions Per Day" 
          value={averageSessionsPerDay}
          subtitle="average daily"
          color="text-success-400"
        />
        <StatCard 
          title="Most Active Day" 
          value={mostActiveDay}
          subtitle="of the week"
          color="text-orange-400"
        />
      </div>
    </div>
  );
}