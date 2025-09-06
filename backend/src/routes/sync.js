import express from "express";
import logger from "../utils/logger.js";

const router = express.Router();

// POST endpoint to sync new tracks (unified Spotify/Last.fm)
router.post('/plays', async (req, res) => {
  logger.info("POST /api/sync/plays called");

  try {
    // Get musicSync service from app locals (passed from index.js)
    const musicSync = req.app.locals.musicSync;
    const { force = false } = req.body;
    
    const result = await musicSync.syncNewTracks({ force });
    
    logger.info(`Sync completed: ${result.addedPlays} new plays added using ${result.method}`);
    
    // Include sync status in response
    const status = await musicSync.getStatus();
    
    res.json({
      ...result,
      status: status,
      fallbackUsed: result.fallbackUsed || false
    });
    
  } catch (error) {
    logger.error("Music sync endpoint error:", error);
    res.status(500).json({ 
      error: 'Sync failed',
      message: error.message,
      method: req.app.locals.musicSync?.getCurrentMethod()
    });
  }
});

// GET sync method status
router.get('/status', async (req, res) => {
  logger.info("GET /api/sync/status called");
  try {
    const musicSync = req.app.locals.musicSync;
    const status = await musicSync.getStatus();
    res.json(status);
  } catch (error) {
    logger.error("Error getting sync status:", error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// POST switch sync method
router.post('/switch-method', async (req, res) => {
  logger.info("POST /api/sync/switch-method called");
  try {
    const musicSync = req.app.locals.musicSync;
    const { method } = req.body;
    
    if (!method || (method !== 'spotify' && method !== 'lastfm')) {
      return res.status(400).json({ 
        error: 'Invalid method. Use "spotify" or "lastfm"' 
      });
    }
    
    const result = await musicSync.switchMethod(method);
    logger.info(`Sync method switched to ${method}`);
    
    res.json(result);
  } catch (error) {
    logger.error("Error switching sync method:", error);
    res.status(500).json({ 
      error: 'Failed to switch sync method',
      message: error.message 
    });
  }
});

export default router;