import express from 'express';
const router = express.Router();
import MusicSyncService from '../services/musicSync.js';
import logger from '../utils/logger.js';

// Use the main music sync service that handles both Spotify and Last.fm
const musicSync = new MusicSyncService();

// Ensure music sync service is initialized
async function ensureMusicSyncReady() {
  try {
    await musicSync.ensureInitialized();
    logger.info('Music sync service ready for API requests');
  } catch (error) {
    logger.error(`Failed to initialize music sync: ${error.message}`);
  }
}

// Initialize on module load
ensureMusicSyncReady();

// GET /api/spotify/auth - Get authorization URL (placeholder)
router.get('/auth', (req, res) => {
  res.json({ 
    message: 'Spotify authorization is configured via environment variables',
    tokensConfigured: !!(process.env.SPOTIFY_ACCESS_TOKEN && process.env.SPOTIFY_REFRESH_TOKEN)
  });
});

// POST /api/spotify/callback - Handle authorization callback (placeholder)
router.post('/callback', async (req, res) => {
  res.json({ 
    message: 'Spotify tokens should be configured via environment variables',
    tokensConfigured: !!(process.env.SPOTIFY_ACCESS_TOKEN && process.env.SPOTIFY_REFRESH_TOKEN)
  });
});

// POST /api/spotify/sync - Manual sync trigger
router.post('/sync', async (req, res) => {
  try {
    const { force = false } = req.body;
    
    logger.info(`Manual music sync triggered - force: ${force}`);
    
    // Ensure service is ready
    await musicSync.ensureInitialized();
    
    const result = await musicSync.syncNewTracks({ force });
    
    res.json({
      success: true,
      message: result.message,
      addedPlays: result.addedPlays,
      processedTracks: result.processedTracks,
      method: result.method,
      fallbackUsed: result.fallbackUsed
    });
    
  } catch (error) {
    logger.error(`Error during manual sync: ${error.message}`);
    res.status(500).json({ 
      error: 'Sync failed',
      message: error.message
    });
  }
});

// GET /api/spotify/test - Test sync status  
router.get('/test', async (req, res) => {
  try {
    logger.info(`Music sync test requested`);
    
    // Just return status instead of doing a test sync
    await musicSync.ensureInitialized();
    const status = await musicSync.getStatus();
    
    res.json({
      ...status,
      message: 'Music sync service is ready'
    });
    
  } catch (error) {
    logger.error(`Error during test: ${error.message}`);
    res.status(500).json({ 
      error: 'Test failed',
      message: error.message
    });
  }
});

// GET /api/spotify/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    await musicSync.ensureInitialized();
    const status = await musicSync.getStatus();
    
    res.json(status);
    
  } catch (error) {
    logger.error(`Error getting sync status: ${error.message}`);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

export default router;