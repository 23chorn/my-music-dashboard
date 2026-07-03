import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';
import { ChartBarIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import useCumulativeDiscoveryData from '../../hooks/useCumulativeDiscoveryData';

const CUMULATIVE_METRICS = [
  { 
    key: 'cumulativeTracks', 
    label: 'Total Unique Tracks', 
    color: '#10b981', 
    chartType: 'line',
    category: 'cumulative',
    description: 'Total number of unique tracks discovered over time. Shows your complete musical exploration journey.'
  },
  { 
    key: 'cumulativeArtists', 
    label: 'Total Unique Artists', 
    color: '#f97316', 
    chartType: 'line',
    category: 'cumulative',
    description: 'Total number of unique artists discovered over time. Shows how your musical taste has expanded across different musicians.'
  },
  { 
    key: 'cumulativeAlbums', 
    label: 'Total Unique Albums', 
    color: '#8b5cf6', 
    chartType: 'line',
    category: 'cumulative',
    description: 'Total number of unique albums discovered over time. Shows depth of exploration into complete musical works.'
  },
];

const WEEKLY_DISCOVERY_METRICS = [
  { 
    key: 'newTracksThisWeek', 
    label: 'New Tracks Per Week', 
    color: '#10b981', 
    chartType: 'bar',
    category: 'weekly',
    description: 'Number of new tracks discovered each week. Peaks show periods of active music exploration.'
  },
  { 
    key: 'newArtistsThisWeek', 
    label: 'New Artists Per Week', 
    color: '#f97316', 
    chartType: 'bar',
    category: 'weekly',
    description: 'Number of new artists discovered each week. Shows when you were branching out to new musicians.'
  },
  { 
    key: 'newAlbumsThisWeek', 
    label: 'New Albums Per Week', 
    color: '#8b5cf6', 
    chartType: 'bar',
    category: 'weekly',
    description: 'Number of new albums discovered each week. Shows periods of deep-dive album listening vs. singles.'
  }
];

const VELOCITY_METRICS = [
  { 
    key: 'trackDiscoveryVelocity', 
    label: 'Track Discovery Velocity (4-week avg)', 
    color: '#10b981', 
    chartType: 'line',
    category: 'velocity',
    description: 'Smoothed average of new tracks discovered per week. Shows trends in exploration activity over time.'
  },
  { 
    key: 'artistDiscoveryVelocity', 
    label: 'Artist Discovery Velocity (4-week avg)', 
    color: '#f97316', 
    chartType: 'line',
    category: 'velocity',
    description: 'Smoothed average of new artists discovered per week. Shows trends in musical taste expansion.'
  },
  { 
    key: 'albumDiscoveryVelocity', 
    label: 'Album Discovery Velocity (4-week avg)', 
    color: '#8b5cf6', 
    chartType: 'line',
    category: 'velocity',
    description: 'Smoothed average of new albums discovered per week. Shows trends in album-focused listening.'
  }
];

const PERIOD_OPTIONS = [
  { key: 180, label: '6 Months' },
  { key: 365, label: '1 Year' },
  { key: 730, label: '2 Years' },
  { key: 1095, label: '3 Years' },
  { key: -1, label: 'All Time' }
];

export default function CumulativeDiscoveryChart() {
  const [selectedMetric, setSelectedMetric] = useState('cumulativeTracks');
  const [selectedPeriod, setSelectedPeriod] = useState(365);
  const [showZoom, setShowZoom] = useState(false);
  
  const { cumulativeData, loading, error, updatePeriod, refresh } = useCumulativeDiscoveryData(selectedPeriod);

  // Find all metric options by combining all arrays
  const allMetrics = [...CUMULATIVE_METRICS, ...WEEKLY_DISCOVERY_METRICS, ...VELOCITY_METRICS];
  const selectedMetricInfo = allMetrics.find(metric => metric.key === selectedMetric);

  // Determine if data spans more than one year and format accordingly
  const formatDataWithYears = (data) => {
    if (!data || data.length === 0) return data;
    
    // Check if data spans more than one year
    const dates = data.map(d => new Date(d.date));
    const years = [...new Set(dates.map(d => d.getFullYear()))];
    const spansMultipleYears = years.length > 1;
    
    return data.map(item => ({
      ...item,
      formattedDate: spansMultipleYears 
        ? new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          })
        : new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })
    }));
  };

  const formattedCumulativeData = formatDataWithYears(cumulativeData);

  const handlePeriodChange = (newPeriod) => {
    setSelectedPeriod(newPeriod);
    updatePeriod(newPeriod);
  };

  // Calculate Y-axis domain for better visualization
  const getYAxisDomain = (data, metricKey) => {
    if (!data || data.length === 0) return ['auto', 'auto'];
    
    const values = data.map(d => d[metricKey]).filter(v => v != null && !isNaN(v));
    if (values.length === 0) return ['auto', 'auto'];
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // For cumulative metrics, always start from 0 or close to 0
    if (selectedMetric.startsWith('cumulative')) {
      return [Math.max(0, min - range * 0.1), max + range * 0.1];
    }
    
    // For other metrics, use standard padding
    if (range < 0.1) return ['auto', 'auto'];
    
    const padding = range * 0.1;
    const adjustedMin = min > 0 && (min - padding) < 0 ? 0 : min - padding;
    const adjustedMax = max + padding;
    
    return [adjustedMin, adjustedMax];
  };
  
  const yAxisDomain = getYAxisDomain(formattedCumulativeData, selectedMetric);
  
  if (loading) {
    return (
      <div className="bg-surface-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Music Discovery Journey</h2>
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-surface-400">Loading discovery data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Music Discovery Journey</h2>
        <div className="text-center py-8">
          <div className="text-danger-400 mb-2">Failed to load discovery data</div>
          <div className="text-surface-400 text-sm">{error}</div>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-900 rounded-lg p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">Music Discovery Journey</h2>
        
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Metric Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-surface-400 uppercase tracking-wide">
              Discovery Metric &middot; {selectedMetricInfo?.chartType === 'bar' ? 'Bar Chart' : 'Line Chart'}
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 bg-surface-800 border border-surface-600 rounded text-white text-sm focus:outline-none focus:border-brand-500"
            >
              <optgroup label="Cumulative Totals (Line Charts)">
                {CUMULATIVE_METRICS.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Weekly Discovery Rate (Bar Charts)">
                {WEEKLY_DISCOVERY_METRICS.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Discovery Velocity - Smoothed (Line Charts)">
                {VELOCITY_METRICS.map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          
          {/* Period Selector */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-surface-400 uppercase tracking-wide">Period</label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value))}
              className="px-3 py-2 bg-surface-800 border border-surface-600 rounded text-white text-sm focus:outline-none focus:border-brand-500"
            >
              {PERIOD_OPTIONS.map(option => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          {/* Zoom Toggle */}
          {formattedCumulativeData.length > 10 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-surface-400 uppercase tracking-wide">Zoom</label>
              <button
                onClick={() => setShowZoom(!showZoom)}
                className={`px-3 py-2 border rounded text-sm focus:outline-none transition ${
                  showZoom 
                    ? 'bg-brand-600 border-brand-500 text-white hover:bg-brand-700' 
                    : 'bg-surface-800 border-surface-600 text-surface-300 hover:bg-surface-700'
                }`}
              >
                {showZoom ? 'Zoom On' : 'Zoom Off'}
              </button>
            </div>
          )}
        </div>
      </div>

      {formattedCumulativeData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetricInfo?.chartType === 'bar' ? (
              <BarChart data={formattedCumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                  domain={yAxisDomain}
                  tickFormatter={(value) => {
                    if (selectedMetric.includes('cumulative')) {
                      return `${Math.round(value).toLocaleString()}`;
                    }
                    return Math.round(value).toString();
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#f9fafb'
                  }}
                  labelStyle={{ color: '#d1d5db' }}
                  formatter={(value, name) => [
                    selectedMetric.includes('cumulative') ? value.toLocaleString() : value,
                    selectedMetricInfo?.label || name
                  ]}
                />
                <Bar
                  dataKey={selectedMetric}
                  fill={selectedMetricInfo?.color || '#3b82f6'}
                  stroke={selectedMetricInfo?.color || '#3b82f6'}
                  strokeWidth={1}
                  name={selectedMetricInfo?.label || 'Value'}
                  radius={[2, 2, 0, 0]}
                />
                {showZoom && formattedCumulativeData.length > 10 && (
                  <Brush 
                    dataKey="formattedDate" 
                    height={30} 
                    stroke={selectedMetricInfo?.color || '#3b82f6'}
                    fill="#374151"
                  />
                )}
              </BarChart>
            ) : (
              <LineChart data={formattedCumulativeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="formattedDate" 
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#9ca3af"
                  fontSize={12}
                  tick={{ fill: '#9ca3af' }}
                  domain={yAxisDomain}
                  tickFormatter={(value) => {
                    if (selectedMetric.includes('cumulative')) {
                      return `${Math.round(value).toLocaleString()}`;
                    }
                    return Math.round(value).toString();
                  }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '6px',
                    color: '#f9fafb'
                  }}
                  labelStyle={{ color: '#d1d5db' }}
                  formatter={(value, name) => [
                    selectedMetric.includes('cumulative') ? value.toLocaleString() : value,
                    selectedMetricInfo?.label || name
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={selectedMetricInfo?.color || '#3b82f6'}
                  strokeWidth={2}
                  dot={{ fill: selectedMetricInfo?.color || '#3b82f6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: selectedMetricInfo?.color || '#3b82f6', strokeWidth: 2, fill: '#1f2937' }}
                  name={selectedMetricInfo?.label || 'Value'}
                />
                {showZoom && formattedCumulativeData.length > 10 && (
                  <Brush 
                    dataKey="formattedDate" 
                    height={30} 
                    stroke={selectedMetricInfo?.color || '#3b82f6'}
                    fill="#374151"
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8 text-surface-400">
          No discovery data available for the selected period
        </div>
      )}
      
      {formattedCumulativeData.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Current metric explanation */}
          <div className="bg-surface-800 rounded-lg p-4 border border-surface-700">
            <div className="flex items-start gap-3">
              <div className="text-brand-400">
                {selectedMetricInfo?.chartType === 'bar' ? <ChartBarIcon className="w-6 h-6" /> : <ArrowTrendingUpIcon className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">{selectedMetricInfo?.label}</h4>
                <p className="text-sm text-surface-300 leading-relaxed">
                  {selectedMetricInfo?.description}
                </p>
              </div>
            </div>
          </div>
          
          {/* Data info */}
          <div className="flex items-center justify-between text-sm text-surface-400">
            <span>Showing {formattedCumulativeData.length} weeks of discovery data • Updated weekly</span>
            {showZoom && (
              <span className="text-brand-400 flex items-center gap-1">
                <MagnifyingGlassIcon className="w-4 h-4 shrink-0" />
                Drag on the zoom bar below the chart to focus on specific time periods
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}