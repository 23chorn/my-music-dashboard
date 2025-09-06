import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import useTrendsData from '../../hooks/useTrendsData';

const METRIC_OPTIONS = [
  { key: 'tracksPerArtist', label: 'Tracks per Artist', color: '#ec4899' },
  { key: 'playsPerArtist', label: 'Plays per Artist', color: '#ec4899' },
  { key: 'tracksPerAlbum', label: 'Tracks per Album', color: '#14b8a6' },
  { key: 'hoursPerDay', label: 'Hours per Day', color: '#f59e0b' },
  { key: 'discoveryFrequency', label: 'Discovery Rate', color: '#84cc16' },
  { key: 'replayRate', label: 'Replay Rate (%)', color: '#8b5cf6' },
  { key: 'repeatFactor', label: 'Repeat Factor', color: '#06b6d4' },
  { key: 'diversityScore', label: 'Diversity Score (%)', color: '#ef4444' },
  { key: 'playsThisWeek', label: 'Weekly Plays', color: '#3b82f6' },
  { key: 'tracksThisWeek', label: 'Weekly New Tracks', color: '#10b981' },
  { key: 'artistsThisWeek', label: 'Weekly New Artists', color: '#f97316' },
  { key: 'albumsThisWeek', label: 'Weekly New Albums', color: '#8b5cf6' },
  { key: 'activeDaysThisWeek', label: 'Active Days per Week', color: '#06b6d4' }
];

const PERIOD_OPTIONS = [
  { key: 30, label: '1 Month' },
  { key: 60, label: '2 Months' },
  { key: 90, label: '3 Months' }
];

export default function TrendsChart() {
  const [selectedMetric, setSelectedMetric] = useState('replayRate');
  const [selectedPeriod, setSelectedPeriod] = useState(90);
  
  const { trendsData, loading, error, updatePeriod, refresh } = useTrendsData(selectedPeriod);

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    updatePeriod(newPeriod);
  };

  const selectedMetricInfo = METRIC_OPTIONS.find(option => option.key === selectedMetric);
  
  // Calculate Y-axis domain for better visualization
  const getYAxisDomain = (data, metricKey) => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    const values = data.map(d => d[metricKey]).filter(v => v != null && !isNaN(v));
    if (values.length === 0) return ['auto', 'auto'];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // If range is very small, use auto scaling
    if (range < 0.1) return ['auto', 'auto'];
    
    // Add padding (10% of range) unless it would make min negative for positive values
    const padding = range * 0.1;
    const adjustedMin = min > 0 && (min - padding) < 0 ? 0 : min - padding;
    const adjustedMax = max + padding;
    
    return [adjustedMin, adjustedMax];
  };
  
  const yAxisDomain = getYAxisDomain(trendsData, selectedMetric);
  
  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">📈 Listening Trends</h2>
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-gray-400">Loading trends data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">📈 Listening Trends</h2>
        <div className="text-center py-8">
          <div className="text-red-400 mb-2">Failed to load trends</div>
          <div className="text-gray-400 text-sm">{error}</div>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">📈 Listening Trends</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Metric Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Metric</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {METRIC_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Period Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wide">Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value))}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {PERIOD_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {trendsData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="formattedDate" 
                stroke="#9ca3af"
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#9ca3af"
                fontSize={12}
                tick={{ fill: '#9ca3af' }}
                domain={yAxisDomain}
                tickFormatter={(value) => Math.round(value).toString()}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  color: '#f9fafb'
                }}
                labelStyle={{ color: '#d1d5db' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={selectedMetric}
                stroke={selectedMetricInfo?.color || '#3b82f6'}
                strokeWidth={2}
                dot={{ fill: selectedMetricInfo?.color || '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: selectedMetricInfo?.color || '#3b82f6', strokeWidth: 2, fill: '#1f2937' }}
                name={selectedMetricInfo?.label || 'Value'}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          No trends data available for the selected period
        </div>
      )}
      
      {trendsData.length > 0 && (
        <div className="mt-4 text-sm text-gray-400">
          Showing {trendsData.length} weeks of data • Updated weekly
        </div>
      )}
    </div>
  );
}