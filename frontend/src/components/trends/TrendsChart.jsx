import { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';
import { ChartBarIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import useTrendsData from '../../hooks/useTrendsData';
import { CHART_THEME, CHART_ACCENT_ROTATION as ACCENT } from '../../config/appConfig';
import Dropdown from '../controls/Dropdown';
import ControlStrip from '../controls/ControlStrip';
import Panel from '../ui/Panel';

const METRIC_OPTIONS = [
  // Ratio/Rate metrics (better as line charts for trend analysis)
  {
    key: 'tracksPerArtist',
    label: 'Tracks per Artist',
    color: ACCENT[0],
    chartType: 'line',
    category: 'ratios',
    description: 'Average number of different tracks per artist. Higher values indicate exploring more songs from each artist rather than sticking to hits.'
  },
  {
    key: 'playsPerArtist',
    label: 'Plays per Artist',
    color: ACCENT[1],
    chartType: 'line',
    category: 'ratios',
    description: 'Average plays per artist. Higher values mean you repeatedly listen to the same artists, lower values indicate more artist variety.'
  },
  {
    key: 'tracksPerAlbum',
    label: 'Tracks per Album',
    color: ACCENT[2],
    chartType: 'line',
    category: 'ratios',
    description: 'Average tracks listened per album. Higher values mean you explore full albums, lower values suggest singles/playlist listening.'
  },
  {
    key: 'hoursPerDay',
    label: 'Hours per Day',
    color: ACCENT[3],
    chartType: 'line',
    category: 'ratios',
    description: 'Average listening hours per active day. Shows your daily listening intensity when you do listen to music.'
  },
  {
    key: 'discoveryFrequency',
    label: 'Discovery Rate',
    color: ACCENT[4],
    chartType: 'line',
    category: 'ratios',
    description: 'New tracks discovered per active day. Higher values indicate actively seeking new music vs. replaying familiar songs.'
  },
  {
    key: 'replayRate',
    label: 'Replay Rate (%)',
    color: ACCENT[0],
    chartType: 'line',
    category: 'ratios',
    description: 'Percentage of plays that are repeats (not first-time listens). Higher values indicate preference for familiar music.'
  },
  {
    key: 'repeatFactor',
    label: 'Repeat Factor',
    color: ACCENT[1],
    chartType: 'line',
    category: 'ratios',
    description: 'Average plays per unique track. Higher values mean more repetitive listening, lower values indicate exploring new music.'
  },
  {
    key: 'diversityScore',
    label: 'Diversity Score (%)',
    color: ACCENT[2],
    chartType: 'line',
    category: 'ratios',
    description: 'Listening diversity based on how evenly plays are spread across tracks. 100% = perfectly diverse, 0% = only one track.'
  },

  // Volume/Count metrics (better as bar charts for comparison)
  {
    key: 'playsThisWeek',
    label: 'Weekly Plays',
    color: ACCENT[3],
    chartType: 'bar',
    category: 'volume',
    description: 'Total number of tracks played per week. Shows your overall listening activity and engagement with music.'
  },
  {
    key: 'activeDaysThisWeek',
    label: 'Active Days per Week',
    color: ACCENT[4],
    chartType: 'bar',
    category: 'volume',
    description: 'Number of days with music listening activity. Shows consistency of your music engagement throughout the week.'
  },
  {
    key: 'listeningTimeThisWeek',
    label: 'Weekly Listening Time (hrs)',
    color: ACCENT[0],
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

  const metricDropdownOptions = [
    ...METRIC_OPTIONS.filter(opt => opt.category === 'ratios').map(opt => ({ value: opt.key, label: opt.label, group: 'Ratios & Rates (Line Charts)' })),
    ...METRIC_OPTIONS.filter(opt => opt.category === 'volume').map(opt => ({ value: opt.key, label: opt.label, group: 'Volume & Counts (Bar Charts)' })),
  ];
  const periodDropdownOptions = PERIOD_OPTIONS.map(opt => ({ value: opt.key, label: opt.label }));
  
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
      <div className="bg-surface-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Listening Trends</h2>
        <div className="flex justify-center py-8">
          <div className="animate-pulse text-surface-400">Loading trends data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-900 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Listening Trends</h2>
        <div className="text-center py-8">
          <div className="text-danger-400 mb-2">Failed to load trends</div>
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
        <h2 className="text-2xl font-bold text-white">Listening Trends</h2>
        
        <ControlStrip>
          <Dropdown
            value={selectedMetric}
            onChange={setSelectedMetric}
            options={metricDropdownOptions}
            label={`Metric · ${selectedMetricInfo?.chartType === 'bar' ? 'Bar' : 'Line'}`}
            align="left"
          />
          <Dropdown
            value={selectedPeriod}
            onChange={handlePeriodChange}
            options={periodDropdownOptions}
            label="Period"
            align="left"
          />
          {formattedTrendsData.length > 10 && (
            <button
              onClick={() => setShowZoom(!showZoom)}
              className={`h-full px-2.5 py-1.5 font-mono text-xs transition-colors focus:outline-none focus:ring-1 focus:ring-inset focus:ring-brand-400/60 ${
                showZoom
                  ? 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'text-surface-300 hover:text-surface-100 hover:bg-surface-700/50'
              }`}
            >
              {showZoom ? 'Zoom On' : 'Zoom Off'}
            </button>
          )}
        </ControlStrip>
      </div>

      {formattedTrendsData.length > 0 ? (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {selectedMetricInfo?.chartType === 'bar' ? (
              <BarChart data={formattedTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                <XAxis
                  dataKey="formattedDate"
                  stroke={CHART_THEME.axis}
                  fontSize={12}
                  tick={{ fill: CHART_THEME.axis, fontFamily: CHART_THEME.fontFamily }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke={CHART_THEME.axis}
                  fontSize={12}
                  tick={{ fill: CHART_THEME.axis, fontFamily: CHART_THEME.fontFamily }}
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
                    backgroundColor: CHART_THEME.tooltipBg,
                    border: `1px solid ${CHART_THEME.tooltipBorder}`,
                    borderRadius: '6px',
                    color: CHART_THEME.tooltipText,
                    fontFamily: CHART_THEME.fontFamily,
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: CHART_THEME.tooltipLabel }}
                />
                <Bar
                  dataKey={selectedMetric}
                  fill={selectedMetricInfo?.color || CHART_THEME.grid}
                  stroke={selectedMetricInfo?.color || CHART_THEME.grid}
                  strokeWidth={1}
                  name={selectedMetricInfo?.label || 'Value'}
                  radius={[2, 2, 0, 0]}
                />
                {showZoom && formattedTrendsData.length > 10 && (
                  <Brush
                    dataKey="formattedDate"
                    height={30}
                    stroke={selectedMetricInfo?.color || CHART_THEME.grid}
                    fill={CHART_THEME.brushFill}
                  />
                )}
              </BarChart>
            ) : (
              <LineChart data={formattedTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_THEME.grid} />
                <XAxis
                  dataKey="formattedDate"
                  stroke={CHART_THEME.axis}
                  fontSize={12}
                  tick={{ fill: CHART_THEME.axis, fontFamily: CHART_THEME.fontFamily }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  stroke={CHART_THEME.axis}
                  fontSize={12}
                  tick={{ fill: CHART_THEME.axis, fontFamily: CHART_THEME.fontFamily }}
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
                    backgroundColor: CHART_THEME.tooltipBg,
                    border: `1px solid ${CHART_THEME.tooltipBorder}`,
                    borderRadius: '6px',
                    color: CHART_THEME.tooltipText,
                    fontFamily: CHART_THEME.fontFamily,
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: CHART_THEME.tooltipLabel }}
                />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke={selectedMetricInfo?.color || CHART_THEME.grid}
                  strokeWidth={2}
                  dot={{ fill: selectedMetricInfo?.color || CHART_THEME.grid, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: selectedMetricInfo?.color || CHART_THEME.grid, strokeWidth: 2, fill: CHART_THEME.tooltipBg }}
                  name={selectedMetricInfo?.label || 'Value'}
                />
                {showZoom && formattedTrendsData.length > 10 && (
                  <Brush
                    dataKey="formattedDate"
                    height={30}
                    stroke={selectedMetricInfo?.color || CHART_THEME.grid}
                    fill={CHART_THEME.brushFill}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="text-center py-8 text-surface-400">
          No trends data available for the selected period
        </div>
      )}
      
      {formattedTrendsData.length > 0 && (
        <div className="mt-4 space-y-3">
          {/* Current metric explanation */}
          <Panel rounded="rounded-lg" className="p-4">
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
          </Panel>
          
          {/* Data info */}
          <div className="flex items-center justify-between text-sm text-surface-400">
            <span>Showing {formattedTrendsData.length} weeks of data • Updated weekly</span>
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