import { formatDateString } from "../../utils/dateFormatter";

export default function SystemInfo({ timezoneInfo }) {
  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">System Information</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-surface-800">
          <span className="text-surface-400">Timezone</span>
          <span className="text-white font-medium">{timezoneInfo.timezone || 'Unknown'}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-surface-800">
          <span className="text-surface-400">Current Time</span>
          <span className="text-white font-medium">
            {timezoneInfo.localTime ? formatDateString(timezoneInfo.localTime) : 'Unknown'}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-surface-800">
          <span className="text-surface-400">UTC Offset</span>
          <span className="text-white font-medium">
            {timezoneInfo.offset ? `${timezoneInfo.offset > 0 ? '+' : ''}${timezoneInfo.offset / 60} hours` : 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}