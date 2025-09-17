import { AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

export default function BehaviorAnalysis({ behaviorData }) {
  const {
    repeatFactor = 0,
    diversityScore = 0
  } = behaviorData;

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <AdjustmentsHorizontalIcon className="w-6 h-6 text-purple-400" />
        <h2 className="text-2xl font-bold text-white">Listening Behavior</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Repeat Factor</h3>
          <div className="text-3xl font-bold text-yellow-400 mb-2">{repeatFactor}x</div>
          <p className="text-gray-400 text-sm">
            Average plays per unique track. Higher = more repetitive listening.
          </p>
          <div className="mt-3 bg-gray-800 rounded-full h-3">
            <div 
              className="bg-yellow-400 rounded-full h-3" 
              style={{ width: `${Math.min(repeatFactor * 5, 100)}%` }}
            />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Diversity Score</h3>
          <div className="text-3xl font-bold text-indigo-400 mb-2">{diversityScore}</div>
          <p className="text-gray-400 text-sm">
            How diverse your listening is (0-100). Higher = more varied music taste.
          </p>
          <div className="mt-3 bg-gray-800 rounded-full h-3">
            <div 
              className="bg-indigo-400 rounded-full h-3" 
              style={{ width: `${diversityScore}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}