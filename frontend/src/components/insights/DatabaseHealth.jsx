import { formatValue, formatBytes } from "../../utils/numberFormat";

export default function DatabaseHealth({ data = {} }) {
  const {
    totalRecords = 0,
    databaseSize = 0,
    tableStats = {},
    indexHealth = 100,
    orphanedRecords = 0,
    performanceScore = 100
  } = data;

  const getHealthColorClasses = (score) => {
    if (score >= 90) return { text: "text-emerald-400", bg: "bg-emerald-400" };
    if (score >= 70) return { text: "text-yellow-400", bg: "bg-yellow-400" };
    return { text: "text-red-400", bg: "bg-red-400" };
  };

  const healthColorClasses = getHealthColorClasses(performanceScore);

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-white mb-6">🗄️ Database Health</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {formatValue(totalRecords)}
          </div>
          <div className="text-gray-400 text-sm">Total Records</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-white mb-1">
            {formatBytes(databaseSize)}
          </div>
          <div className="text-gray-400 text-sm">Database Size</div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-gray-400">Performance Score</span>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${healthColorClasses.bg}`}></div>
            <span className={`${healthColorClasses.text} font-medium`}>{performanceScore}%</span>
          </div>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-800">
          <span className="text-gray-400">Index Health</span>
          <span className="text-white font-medium">{indexHealth}%</span>
        </div>

        {orphanedRecords > 0 && (
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-gray-400">Orphaned Records</span>
            <span className="text-red-400 font-medium">{formatValue(orphanedRecords)}</span>
          </div>
        )}
      </div>

      {Object.keys(tableStats).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-white mb-3">Table Statistics</h3>
          <div className="space-y-2">
            {Object.entries(tableStats).map(([table, count]) => (
              <div key={table} className="flex justify-between items-center text-sm">
                <span className="text-gray-400 capitalize">{table}</span>
                <span className="text-white">{formatValue(count)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}