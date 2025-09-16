import express from 'express';
import logger from '../utils/logger.js';
import { getAllInsights } from '../db/insights.js';

const router = express.Router();

// GET /api/insights - Get comprehensive data quality and system insights
router.get('/', async (req, res) => {
  try {
    const insights = await getAllInsights();

    logger.info('Successfully fetched insights data');
    res.json(insights);

  } catch (error) {
    logger.error(`Error fetching insights data: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch insights data', details: error.message });
  }
});

export default router;