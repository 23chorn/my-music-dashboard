import express from 'express';
import { getTrendsData } from '../db/trends.js';
import logger from '../utils/logger.js';

const router = express.Router();

// Get trends data for metrics over time
router.get('/metrics', (req, res) => {
  logger.info('GET /api/trends/metrics called');
  const days = parseInt(req.query.days) || 90; // Default to 3 months
  
  if (days > 365) {
    return res.status(400).json({ error: 'Maximum period is 365 days' });
  }
  
  getTrendsData(days, (err, data) => {
    if (err) {
      logger.error(`Trends metrics error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to fetch trends data' });
    }
    
    logger.info(`Returning ${data.length} weeks of trends data`);
    res.json(data);
  });
});


export default router;