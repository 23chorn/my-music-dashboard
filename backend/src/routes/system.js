import express from "express";
import { checkDatabaseHealth } from "../db/connection.js";
import { getTimezoneInfo } from "../utils/timezone.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Timezone info endpoint for debugging
router.get('/timezone-info', (req, res) => {
  logger.info("GET /api/system/timezone-info called");
  const timezoneInfo = getTimezoneInfo();
  logger.info("Returning timezone info", timezoneInfo);
  res.json(timezoneInfo);
});

// Database health check endpoint
router.get('/health/database', async (req, res) => {
  logger.info("GET /api/system/health/database called");
  try {
    const health = await checkDatabaseHealth();
    res.json({
      status: 'healthy',
      ...health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error("Database health check failed:", error);
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;