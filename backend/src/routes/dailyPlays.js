import express from "express";
import { getDailyPlaysAll } from "../db/db.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Get daily play counts across all artists for the past N days
router.get('/', async (req, res) => {
  const { days = 90 } = req.query;
  logger.info(`GET /api/daily-plays called with days=${days}`);
  
  try {
    const dailyPlays = await getDailyPlaysAll(parseInt(days));
    logger.info(`Returning ${dailyPlays.length} daily play records`);
    res.json(dailyPlays);
  } catch (error) {
    logger.error("Error getting daily plays:", error);
    res.status(500).json({ error: 'Database error' });
  }
});

export default router;