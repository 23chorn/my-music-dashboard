import { getPool } from './connection.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Get trends data from materialized views (much faster for multi-year queries)
export async function getTrendsDataFromMatView(days = 90, callback) {
  logger.info(`getTrendsDataFromMatView called with days=${days}`);
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Query the materialized views for fast results
    // Exclude current week if it's incomplete (not yet ended)
    const query = `
      SELECT 
        wlm.week_start as date,
        wlm.week_end,
        
        -- Weekly raw activity metrics
        wlm.plays_this_week as "playsThisWeek",
        wlm.tracks_this_week as "tracksThisWeek", 
        wlm.artists_this_week as "artistsThisWeek",
        wlm.albums_this_week as "albumsThisWeek",
        wlm.active_days_this_week as "activeDaysThisWeek",
        wlm.listening_time_this_week as "listeningTimeThisWeek",
        
        -- Calculated metrics (pre-computed in materialized view)
        wlm.tracks_per_artist as "tracksPerArtist",
        wlm.plays_per_artist as "playsPerArtist", 
        wlm.tracks_per_album as "tracksPerAlbum",
        wlm.hours_per_day as "hoursPerDay",
        wlm.discovery_frequency as "discoveryFrequency",
        wlm.replay_rate as "replayRate",
        wlm.repeat_factor as "repeatFactor",
        
        -- Diversity score from separate materialized view
        COALESCE(wdm.diversity_score, 0) as "diversityScore"
        
      FROM weekly_listening_metrics wlm
      LEFT JOIN weekly_diversity_metrics wdm ON wlm.week_start = wdm.week_start
      WHERE wlm.week_start >= $1
      AND wlm.week_end < DATE_TRUNC('week', NOW())  -- Exclude current incomplete week
      ORDER BY wlm.week_start
    `;
    
    const result = await pool().query(query, [startDate]);
    
    // Add formatted date for display
    const trendsData = result.rows.map(row => ({
      ...row,
      formattedDate: new Date(row.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
    
    logger.info(`getTrendsDataFromMatView returned ${trendsData.length} weekly data points`);
    callback(null, trendsData);
    
  } catch (err) {
    logger.error(`getTrendsDataFromMatView DB error: ${err}`);
    callback(err);
  }
}

// Check if materialized views need refreshing
export async function checkMatViewFreshness(callback) {
  try {
    // Get last refresh time
    const lastRefreshQuery = `
      SELECT value, updated_at 
      FROM metadata 
      WHERE key = 'last_trends_refresh'
    `;
    
    const result = await pool().query(lastRefreshQuery);
    
    if (result.rows.length === 0) {
      // No refresh recorded, views might not exist
      callback(null, { needsRefresh: true, reason: 'No refresh history found' });
      return;
    }
    
    const lastRefresh = new Date(parseInt(result.rows[0].value) * 1000);
    const now = new Date();
    const hoursSinceRefresh = (now - lastRefresh) / (1000 * 60 * 60);
    
    // Suggest refresh if more than 24 hours old
    const needsRefresh = hoursSinceRefresh > 24;
    
    callback(null, {
      needsRefresh,
      lastRefresh,
      hoursSinceRefresh: Math.round(hoursSinceRefresh * 10) / 10,
      reason: needsRefresh ? 'Data is more than 24 hours old' : 'Data is fresh'
    });
    
  } catch (err) {
    logger.error(`checkMatViewFreshness error: ${err}`);
    callback(err);
  }
}

// Refresh materialized views manually
export async function refreshMatViews(callback) {
  logger.info('Refreshing materialized views...');
  
  try {
    const startTime = Date.now();
    
    // Call the refresh function created in the migration
    await pool().query('SELECT refresh_trends_metrics()');
    
    const duration = Date.now() - startTime;
    logger.info(`Materialized views refreshed in ${duration}ms`);
    
    callback(null, { success: true, duration });
    
  } catch (err) {
    logger.error(`refreshMatViews error: ${err}`);
    callback(err);
  }
}

// Get materialized view statistics
export async function getMatViewStats(callback) {
  try {
    const stats = {};
    
    // Get row counts and date ranges
    const metricsStatsQuery = `
      SELECT 
        COUNT(*) as total_weeks,
        MIN(week_start) as earliest_week,
        MAX(week_start) as latest_week,
        SUM(plays_this_week) as total_plays
      FROM weekly_listening_metrics
    `;
    
    const diversityStatsQuery = `
      SELECT 
        COUNT(*) as diversity_weeks,
        AVG(diversity_score) as avg_diversity
      FROM weekly_diversity_metrics
    `;
    
    const [metricsResult, diversityResult] = await Promise.all([
      pool().query(metricsStatsQuery),
      pool().query(diversityStatsQuery)
    ]);
    
    stats.metrics = metricsResult.rows[0];
    stats.diversity = diversityResult.rows[0];
    
    // Get view sizes
    const sizeQuery = `
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables 
      WHERE tablename IN ('weekly_listening_metrics', 'weekly_diversity_metrics')
    `;
    
    const sizeResult = await pool().query(sizeQuery);
    stats.sizes = sizeResult.rows;
    
    callback(null, stats);
    
  } catch (err) {
    logger.error(`getMatViewStats error: ${err}`);
    callback(err);
  }
}

// Hybrid approach: use materialized views for historical data, real-time for recent
export async function getHybridTrendsData(days = 90, callback) {
  logger.info(`getHybridTrendsData called with days=${days}`);
  
  try {
    if (days <= 90) {
      // For short periods, use real-time calculation (existing function)
      const { getTrendsData } = await import('./trends.js');
      return getTrendsData(days, callback);
    } else {
      // For longer periods, use materialized views
      return getTrendsDataFromMatView(days, callback);
    }
  } catch (err) {
    logger.error(`getHybridTrendsData error: ${err}`);
    callback(err);
  }
}