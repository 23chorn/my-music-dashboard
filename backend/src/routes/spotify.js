import express from 'express';
const router = express.Router();
import SpotifySync from '../services/spotifySync.js';
import { SpotifyDatabaseService, initializeSpotifyDatabase } from '../db/spotifyDb.js';
import logger from '../utils/logger.js';

// Initialize database and sync service
initializeSpotifyDatabase();
const dbService = new SpotifyDatabaseService();
const spotifySync = new SpotifySync(dbService);

// Initialize with stored tokens (you'll need to implement token storage)
async function initializeSpotifySync() {
  const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
  
  if (accessToken && refreshToken) {
    try {
      await spotifySync.initialize(accessToken, refreshToken);
      logger.info('Spotify sync initialized with stored tokens');
    } catch (error) {
      logger.error(`Failed to initialize Spotify sync: ${error.message}`);
    }
  } else {
    logger.warn('Spotify tokens not found in environment variables');
  }
}

// Initialize on module load
initializeSpotifySync();

// GET /api/spotify/auth - Get authorization URL
router.get('/auth', (req, res) => {
  try {
    const authUrl = spotifySync.getAuthorizationUrl();
    res.json({ authUrl });
  } catch (error) {
    logger.error(`Error getting auth URL: ${error.message}`);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

// POST /api/spotify/callback - Handle authorization callback
router.post('/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code required' });
    }
    
    const tokens = await spotifySync.handleAuthorizationCallback(code);
    
    // TODO: Store tokens securely (database, encrypted storage, etc.)
    logger.info('Spotify tokens obtained - store them securely');
    
    res.json({ 
      message: 'Authorization successful',
      expiresIn: tokens.expiresIn
    });
    
  } catch (error) {
    logger.error(`Error handling callback: ${error.message}`);
    res.status(500).json({ error: 'Authorization failed' });
  }
});

// POST /api/spotify/sync - Manual sync trigger
router.post('/sync', async (req, res) => {
  try {
    const { force = false } = req.body;
    
    logger.info(`Manual Spotify sync triggered - force: ${force}`);
    
    const result = await spotifySync.syncRecentTracks({
      forceFullSync: force,
      saveToDatabase: true,
      limit: 50
    });
    
    res.json({
      success: true,
      message: `Sync completed: ${result.addedPlays} new plays added`,
      addedPlays: result.addedPlays,
      processedTracks: result.processedTracks
    });
    
  } catch (error) {
    logger.error(`Error during manual sync: ${error.message}`);
    res.status(500).json({ 
      error: 'Sync failed',
      message: error.message
    });
  }
});

// GET /api/spotify/test - Test sync without saving
router.get('/test', async (req, res) => {
  try {
    const { limit = 10, force = false } = req.query;
    
    logger.info(`Spotify test sync - limit: ${limit}, force: ${force}`);
    
    const result = await spotifySync.testSync(
      parseInt(limit), 
      force === 'true'
    );
    
    res.json(result);
    
  } catch (error) {
    logger.error(`Error during test sync: ${error.message}`);
    res.status(500).json({ 
      error: 'Test sync failed',
      message: error.message
    });
  }
});

// GET /api/spotify/status - Get sync status
router.get('/status', async (req, res) => {
  try {
    const lastSyncTimestamp = await dbService.getLastSyncTimestamp();
    
    res.json({
      lastSync: lastSyncTimestamp,
      lastSyncFormatted: lastSyncTimestamp ? new Date(lastSyncTimestamp).toISOString() : null,
      tokensConfigured: !!(process.env.SPOTIFY_ACCESS_TOKEN && process.env.SPOTIFY_REFRESH_TOKEN)
    });
    
  } catch (error) {
    logger.error(`Error getting sync status: ${error.message}`);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

export default router;