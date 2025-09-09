import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import useTrendsData from '../../hooks/useTrendsData';

const METRIC_OPTIONS = [
  // Ratio/Rate metrics (better as line charts for trend analysis)
  { 
    key: 'tracksPerArtist', 
    label: 'Tracks per Artist', 
    color: '#ec4899', 
    chartType: 'line', 
    category: 'ratios',
    description: 'Average number of different tracks per artist. Higher values indicate exploring more songs from each artist rather than sticking to hits.'
  },
  { 
    key: 'playsPerArtist', 
    label: 'Plays per Artist', 
    color: '#ec4899', 
    chartType: 'line', 
    category: 'ratios',
    description: 'Average plays per artist. Higher values mean you repeatedly listen to the same artists, lower values indicate more artist variety.'
  },
  { 
    key: 'tracksPerAlbum', 
    label: 'Tracks per Album', 
    color: '#14b8a6', 
    chartType: 'line', 
    category: 'ratios',
    description: 'Average tracks listened per album. Higher values mean you explore full albums, lower values suggest singles/playlist listening.'
  },
  { 
    key: 'hoursPerDay', 
    label: 'Hours per Day', 
    color: '#f59e0b', 
    chartType: 'line', 
    category: 'ratios',
    description: 'Average listening hours per active day. Shows your daily listening intensity when you do listen to music.'
  },
  { 
    key: 'discoveryFrequency', 
    label: 'Discovery Rate', 
    color: '#84cc16', 
    chartType: 'line', 
    category: 'ratios',
    description: 'New tracks discovered per active day. Higher values indicate actively seeking new music vs. replaying familiar songs.'
  },
  { 
    key: 'replayRate', 
    label: 'Replay Rate (%)', 
    color: '#8b5cf6', 
    chartType: 'line', 
    category: 'ratios',
    description: 'Percentage of plays that are repeats (not first-time listens). Higher values indicate preference for familiar music.'
  },
  { 
    key: 'repeatFactor', 
    label: 'Repeat Factor', 
    color: '#06b6d4', 
    chartType: 'line', 
    category: 'ratios',
    description: 'Average plays per unique track. Higher values mean more repetitive listening, lower values indicate exploring new music.'
  },
  { 
    key: 'diversityScore', 
    label: 'Diversity Score (%)', 
    color: '#ef4444', 
    chartType: 'line', 
    category: 'ratios',
    description: 'Listening diversity based on how evenly plays are spread across tracks. 100% = perfectly diverse, 0% = only one track.'
  },
  
  // Volume/Count metrics (better as bar charts for comparison)
  { 
    key: 'playsThisWeek', 
    label: 'Weekly Plays', 
    color: '#3b82f6', 
    chartType: 'bar', 
    category: 'volume',
    description: 'Total number of tracks played per week. Shows your overall listening activity and engagement with music.'
  },
  { 
    key: 'tracksThisWeek', 
    label: 'Weekly New Tracks', 
    color: '#10b981', 
    chartType: 'bar', 
    category: 'volume',
    description: 'Number of unique tracks discovered per week. Indicates how actively you seek out and listen to new music.'
  },
  { 
    key: 'artistsThisWeek', 
    label: 'Weekly New Artists', 
    color: '#f97316', 
    chartType: 'bar', 
    category: 'volume',
    description: 'Number of new artists discovered per week. Shows your exploration of different musicians and musical styles.'
  },
  { 
    key: 'albumsThisWeek', 
    label: 'Weekly New Albums', 
    color: '#8b5cf6', 
    chartType: 'bar', 
    category: 'volume',
    description: 'Number of new albums explored per week. Indicates deep-dive listening vs. single track sampling.'
  },
  { 
    key: 'activeDaysThisWeek', 
    label: 'Active Days per Week', 
    color: '#06b6d4', 
    chartType: 'bar', 
    category: 'volume',
    description: 'Number of days with music listening activity. Shows consistency of your music engagement throughout the week.'
  },
  { 
    key: 'listeningTimeThisWeek', 
    label: 'Weekly Listening Time (hrs)', 
    color: '#f59e0b', 
    chartType: 'bar', 
    category: 'volume',
    description: 'Total hours of music listened per week. Direct measure of your music consumption and time investment.'
  }
];

const PERIOD_OPTIONS = [
  { key: 30, label: '1 Month' },
  { key: 60, label: '2 Months' },
  { key: 90, label: '3 Months' },
  { key: 180, label: '6 Months' },
  { key: 365, label: '1 Year' },
  { key: 730, label: '2 Years' },
  { key: 1095, label: '3 Years' },
  { key: -1, label: 'All Time' }
];

export default function TrendsChart() {
  const [selectedMetric, setSelectedMetric] = useState('hoursPerDay');
  const [selectedPeriod, setSelectedPeriod] = useState(90);
  const [showZoom, setShowZoom] = useState(false);
  
  const { trendsData, loading, error, updatePeriod, refresh } = useTrendsData(selectedPeriod);

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
        : (item.formattedDate || new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }))
    }));
  };

  const formattedTrendsData = formatDataWithYears(trendsData).map(item => ({
    ...item,
    // Convert listening time from ms to hours for better display
    listeningTimeThisWeek: item.listeningTimeThisWeek ? Math.round(item.listeningTimeThisWeek / (1000 * 60 * 60) * 10) / 10 : 0
  }));

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
  
  const yAxisDomain = getYAxisDomain(formattedTrendsData, selectedMetric);
  
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
            <label className="text-xs text-gray-400 uppercase tracking-wide">
              Metric • {selectedMetricInfo?.chartType === 'bar' ? '📊 Bar Chart' : '📈 Line Chart'}
            </label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <optgroup label="📈 Ratios & Rates (Line Charts)">
                {METRIC_OPTIONS.filter(opt => opt.category === 'ratios').map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="📊 Volume & Counts (Bar Charts)">
                {METRIC_OPTIONS.filter(opt => opt.category === 'volume').map(option => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
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
          
          {/* Zoom Toggle */}
          {formattedTrendsData.length > 10 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Zoom</label>
              <button
                onClick={() => setShowZoom(!showZoom)}
                className={`px-3 py-2 border rounded text-sm focus:outline-none transition ${
                  showZoom 
                    ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-700' 
                    : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {showZoom ? '🔍 Zoom On' : '🔍 Zoom Off'}
              </button>
            </div>
          )}
        </div>
      </div>

      {formattedTrendsData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetricInfo?.chartType === 'bar' ? (
              <BarChart data={formattedTrendsData}>
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
                    if (selectedMetric === 'listeningTimeThisWeek') {
                      return `${Math.round(value)}h`;
                    }
                    if (selectedMetric.includes('Rate') || selectedMetric.includes('Score')) {
                      return `${Math.round(value)}%`;
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
                />
                <Bar
                  dataKey={selectedMetric}
                  fill={selectedMetricInfo?.color || '#3b82f6'}
                  stroke={selectedMetricInfo?.color || '#3b82f6'}
                  strokeWidth={1}
                  name={selectedMetricInfo?.label || 'Value'}
                  radius={[2, 2, 0, 0]}
                />
                {showZoom && formattedTrendsData.length > 10 && (
                  <Brush 
                    dataKey="formattedDate" 
                    height={30} 
                    stroke={selectedMetricInfo?.color || '#3b82f6'}
                    fill="#374151"
                  />
                )}
              </BarChart>
            ) : (
              <LineChart data={formattedTrendsData}>
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
                    if (selectedMetric === 'listeningTimeThisWeek') {
                      return `${Math.round(value)}h`;
                    }
                    if (selectedMetric.includes('Rate') || selectedMetric.includes('Score')) {
                      return `${Math.round(value)}%`;
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
                {showZoom && formattedTrendsData.length > 10 && (
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
        <div className="text-center py-8 text-gray-400">
          No trends data available for the selected period
        </div>
      )}
      
      {formattedTrendsData.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Current metric explanation */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start gap-3">
              <div className="text-2xl">{selectedMetricInfo?.chartType === 'bar' ? '📊' : '📈'}</div>
              <div>
                <h4 className="font-medium text-white mb-1">{selectedMetricInfo?.label}</h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {selectedMetricInfo?.description}
                </p>
              </div>
            </div>
          </div>
          
          {/* Data info */}
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Showing {formattedTrendsData.length} weeks of data • Updated weekly</span>
            {showZoom && (
              <span className="text-blue-400">🔍 Drag on the zoom bar below the chart to focus on specific time periods</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}