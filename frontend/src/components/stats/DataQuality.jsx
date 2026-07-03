import { formatValue } from "../../utils/numberFormat";
import { ChartBarSquareIcon } from '@heroicons/react/24/outline';

export default function DataQuality({ statsData, behaviorData }) {
  const { uniqueTrackCount = 0 } = statsData;
  const { tracksWithoutDuration = 0 } = behaviorData;

  const tracksWithDuration = uniqueTrackCount - tracksWithoutDuration;
  const coveragePercentage = uniqueTrackCount > 0 ?
    Math.round((tracksWithDuration / uniqueTrackCount) * 100) : 100;

  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <ChartBarSquareIcon className="w-6 h-6 text-emerald-400" />
        <h2 className="text-2xl font-bold text-white">Data Quality</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Duration Coverage</h3>
          <div className="text-3xl font-bold text-emerald-400 mb-2">{coveragePercentage}%</div>
          <p className="text-surface-400 text-sm mb-3">
            {formatValue(tracksWithDuration)} of {formatValue(uniqueTrackCount)} tracks have duration data
          </p>
          <div className="bg-surface-800 rounded-full h-3">
            <div 
              className="bg-emerald-400 rounded-full h-3" 
              style={{ width: `${coveragePercentage}%` }}
            />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Missing Duration</h3>
          <div className="text-3xl font-bold text-danger-400 mb-2">{formatValue(tracksWithoutDuration)}</div>
          <p className="text-surface-400 text-sm">
            Tracks without duration information
          </p>
        </div>
      </div>
    </div>
  );
}