/**
 * Trends Feature Module
 * Trend analysis, materialized views, and discovery tracking
 */

// Trends data
export {
  getTrendsData
} from './trends.js';

// Materialized view operations
export {
  getTrendsDataFromMatView,
  checkMatViewFreshness,
  refreshMatViews,
  getMatViewStats,
  getCumulativeDiscoveryData,
  getHybridTrendsData
} from './trendsMatView.js';

// Discovery tracking
export {
  getRecentDiscoveries
} from './discoveries.js';
