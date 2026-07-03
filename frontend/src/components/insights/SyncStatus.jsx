import { formatDateString } from "../../utils/dateFormatter";
import { formatValue } from "../../utils/numberFormat";

export default function SyncStatus({ data = {} }) {
  const {
    lastSyncTime = null,
    syncMethod = "Unknown",
    totalSyncs = 0,
    failedSyncs = 0,
    avgSyncDuration = 0,
    lastSyncRecordsAdded = 0,
    nextScheduledSync = null,
    syncHealthScore = 100
  } = data;

  const successRate = totalSyncs > 0 ? Math.round(((totalSyncs - failedSyncs) / totalSyncs) * 100) : 100;
  const getHealthColorClasses = (score) => {
    if (score >= 90) return { text: "text-emerald-400", bg: "bg-emerald-400" };
    if (score >= 70) return { text: "text-warning-400", bg: "bg-warning-400" };
    return { text: "text-danger-400", bg: "bg-danger-400" };
  };

  const healthColorClasses = getHealthColorClasses(syncHealthScore);

  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Sync Status</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className={`text-3xl font-bold ${healthColorClasses.text} mb-1`}>
            {syncHealthScore}%
          </div>
          <div className="text-surface-400 text-sm">Sync Health</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-400 mb-1">
            {successRate}%
          </div>
          <div className="text-surface-400 text-sm">Success Rate</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-surface-800">
          <span className="text-surface-400">Sync Method</span>
          <span className="text-white font-medium capitalize">{syncMethod}</span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-surface-800">
          <span className="text-surface-400">Last Sync</span>
          <span className="text-white font-medium">
            {lastSyncTime ? formatDateString(lastSyncTime) : "Never"}
          </span>
        </div>

        {lastSyncRecordsAdded > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-surface-800">
            <span className="text-surface-400">Records Added (Last Sync)</span>
            <span className="text-emerald-400 font-medium">+{formatValue(lastSyncRecordsAdded)}</span>
          </div>
        )}

        <div className="flex justify-between items-center py-2 border-b border-surface-800">
          <span className="text-surface-400">Total Syncs</span>
          <span className="text-white font-medium">{formatValue(totalSyncs)}</span>
        </div>

        {failedSyncs > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-surface-800">
            <span className="text-surface-400">Failed Syncs</span>
            <span className="text-danger-400 font-medium">{formatValue(failedSyncs)}</span>
          </div>
        )}

        {avgSyncDuration > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-surface-800">
            <span className="text-surface-400">Avg Sync Duration</span>
            <span className="text-white font-medium">{avgSyncDuration}s</span>
          </div>
        )}

        {nextScheduledSync && (
          <div className="flex justify-between items-center py-2">
            <span className="text-surface-400">Next Scheduled Sync</span>
            <span className="text-brand-400 font-medium">{formatDateString(nextScheduledSync)}</span>
          </div>
        )}
      </div>
    </div>
  );
}