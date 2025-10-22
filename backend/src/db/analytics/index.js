/**
 * Analytics Module
 * Statistics, listening analysis, and system insights
 */

// Statistics and metrics
export {
  getDailyPlaysAll,
  getUniqueCounts,
  getBehaviorAnalysis,
  getCalculatedMetrics,
  getDiscoveryFreshness
} from './statistics.js';

// Listening analysis (AI-powered weekly insights)
export {
  generateWeeklyListeningSummary,
  saveWeeklyListeningSummary,
  saveListeningAnalysis,
  getHistoricalContext,
  getListeningAnalyses,
  deleteListeningAnalysis
} from './listeningAnalysis.js';

// System insights and data quality
export {
  getExternalIdCoverage,
  getMetadataCompletion,
  getDatabaseHealth,
  getSyncStatus,
  getDuplicateTracking,
  getAllInsights
} from './insights.js';
