import express from 'express';
import { getTrendsData } from '../db/trends.js';
import { getTrendsDataFromMatView, checkMatViewFreshness, refreshMatViews, getMatViewStats, getCumulativeDiscoveryData } from '../db/trendsMatView.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get trends data for metrics over time (hybrid approach)
router.get('/metrics', (req, res) => {
  logger.info('GET /api/trends/metrics called');
  let days = parseInt(req.query.days) || 90; // Default to 3 months
  const useMatView = req.query.matview === 'true' || days > 365;
  
  // Handle "all time" requests
  if (days === -1) {
    days = 99999; // Very large number for all time
  }
  
  // Choose appropriate data source based on period length (> 90 days uses materialized view)
  const dataSource = (useMatView || days > 90) ? getTrendsDataFromMatView : getTrendsData;
  const sourceType = (useMatView || days > 90) ? 'materialized view' : 'real-time';
  
  logger.info(`Using ${sourceType} for ${days === 99999 ? 'all time' : days + ' days'} period`);
  
  dataSource(days, (err, data) => {
    if (err) {
      logger.error(`Trends metrics error (${sourceType}): ${err.message}`);
      return res.status(500).json({ error: `Failed to fetch trends data from ${sourceType}` });
    }
    
    logger.info(`Returning ${data.length} weeks of trends data from ${sourceType}`);
    res.json(data);
  });
});

// Check materialized view freshness
router.get('/matview/status', (req, res) => {
  logger.info('GET /api/trends/matview/status called');
  
  checkMatViewFreshness((err, status) => {
    if (err) {
      logger.error(`MatView status error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to check materialized view status' });
    }
    
    res.json(status);
  });
});

// Refresh materialized views
router.post('/matview/refresh', (req, res) => {
  logger.info('POST /api/trends/matview/refresh called');
  
  refreshMatViews((err, result) => {
    if (err) {
      logger.error(`MatView refresh error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to refresh materialized views' });
    }
    
    logger.info(`Materialized views refreshed successfully in ${result.duration}ms`);
    res.json({ success: true, ...result });
  });
});

// Get materialized view statistics
router.get('/matview/stats', (req, res) => {
  logger.info('GET /api/trends/matview/stats called');
  
  getMatViewStats((err, stats) => {
    if (err) {
      logger.error(`MatView stats error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to get materialized view stats' });
    }
    
    res.json(stats);
  });
});

// Get cumulative discovery data (always uses materialized view for performance)
router.get('/cumulative-discovery', (req, res) => {
  logger.info('GET /api/trends/cumulative-discovery called');
  let days = parseInt(req.query.days) || 365; // Default to 1 year for cumulative view
  
  // Handle "all time" requests
  if (days === -1) {
    days = 99999; // Very large number for all time
  }
  
  logger.info(`Fetching cumulative discovery data for ${days === 99999 ? 'all time' : days + ' days'} period`);
  
  getCumulativeDiscoveryData(days, (err, data) => {
    if (err) {
      logger.error(`Cumulative discovery error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to fetch cumulative discovery data' });
    }
    
    logger.info(`Returning ${data.length} weeks of cumulative discovery data`);
    res.json(data);
  });
});

export default router;