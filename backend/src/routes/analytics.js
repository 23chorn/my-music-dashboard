import express from "express";
import { getDailyPlaysAll, getUniqueCounts, getBehaviorAnalysis, getCalculatedMetrics } from "../db/analytics.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Get daily play counts across all artists for the past N days
router.get('/daily-plays', async (req, res) => {
  const { days = 90 } = req.query;
  logger.info(`GET /api/analytics/daily-plays called with days=${days}`);
  
  try {
    const dailyPlays = await getDailyPlaysAll(parseInt(days));
    logger.info(`Returning ${dailyPlays.length} daily play records`);
    res.json(dailyPlays);
  } catch (error) {
    logger.error("Error getting daily plays:", error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get unique counts and statistics
router.get('/unique-counts', (req, res) => {
  logger.info("GET /api/analytics/unique-counts called");
  getUniqueCounts((err, uniqueCounts) => {
    if (err) {
      logger.error("Error getting unique counts:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info("Returning unique counts");
    res.json(uniqueCounts);
  });
});

// Get behavior analysis data
router.get('/behavior-analysis', (req, res) => {
  logger.info("GET /api/analytics/behavior-analysis called");
  getBehaviorAnalysis((err, behaviorData) => {
    if (err) {
      logger.error("Error getting behavior analysis:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info("Returning behavior analysis data");
    res.json(behaviorData);
  });
});

// Get calculated metrics
router.get('/calculated-metrics', (req, res) => {
  logger.info("GET /api/analytics/calculated-metrics called");
  getCalculatedMetrics((err, calculatedMetrics) => {
    if (err) {
      logger.error("Error getting calculated metrics:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info("Returning calculated metrics");
    res.json(calculatedMetrics);
  });
});

export default router;