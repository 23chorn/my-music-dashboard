import express from 'express';
const router = express.Router();
import MusicSyncService from '../services/musicSync.js';
import SpotifyService from '../services/spotify.js';
import { getTopTracksForPlaylist } from '../db/topQueries.js';
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

// POST /api/spotify/create-playlist - Create playlist from top tracks
router.post('/create-playlist', async (req, res) => {
  try {
    const { period, limit } = req.body;

    if (!period || !limit) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'period and limit are required'
      });
    }

    logger.info(`Creating playlist for period: ${period}, limit: ${limit}`);

    // Create Spotify service instance and set tokens from environment
    const spotifyService = new SpotifyService();
    spotifyService.setTokens(
      process.env.SPOTIFY_ACCESS_TOKEN,
      process.env.SPOTIFY_REFRESH_TOKEN
    );

    // Get current user to get user ID
    const user = await spotifyService.getCurrentUser();
    logger.info(`Creating playlist for user: ${user.display_name} (${user.id})`);

    // Get top tracks from database using the database layer
    const topTracks = await getTopTracksForPlaylist(limit, period);

    if (topTracks.length === 0) {
      return res.status(400).json({
        error: 'No tracks found',
        message: `No tracks found for period ${period}`
      });
    }

    // Generate playlist name and description
    const periodDisplayMap = {
      '7day': '7 Days',
      '1month': '1 Month',
      '3month': '3 Months',
      '6month': '6 Months',
      '12month': '1 Year',
      'overall': 'All Time'
    };

    const periodName = periodDisplayMap[period] || period;
    const playlistName = `Chorn's Top ${limit} - ${periodName}`;
    const description = `Top ${limit} tracks from my listening history over the past ${periodName.toLowerCase()}. Generated from my Music Dashboard.`;

    // Create the playlist
    const playlist = await spotifyService.createPlaylist(
      user.id,
      playlistName,
      description,
      false // private playlist
    );

    // Search for each track on Spotify and collect URIs
    const spotifyUris = [];
    const failedTracks = [];

    for (const track of topTracks) {
      try {
        const searchQuery = `track:"${track.track}" artist:"${track.artist}"`;
        const searchResults = await spotifyService.searchTrack(searchQuery, 1);

        if (searchResults.length > 0) {
          spotifyUris.push(searchResults[0].uri);
          logger.debug(`Found Spotify track: ${track.artist} - ${track.track}`);
        } else {
          failedTracks.push(`${track.artist} - ${track.track}`);
          logger.warn(`Could not find on Spotify: ${track.artist} - ${track.track}`);
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failedTracks.push(`${track.artist} - ${track.track}`);
        logger.error(`Error searching for ${track.artist} - ${track.track}: ${error.message}`);
      }
    }

    // Add found tracks to the playlist
    let addedCount = 0;
    if (spotifyUris.length > 0) {
      addedCount = await spotifyService.addTracksToPlaylist(playlist.id, spotifyUris);
    }

    logger.info(`Playlist created successfully: ${playlist.name} (${addedCount}/${topTracks.length} tracks added)`);

    res.json({
      success: true,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        url: playlist.external_urls.spotify,
        description: playlist.description
      },
      tracksAdded: addedCount,
      totalTracks: topTracks.length,
      failedTracks: failedTracks.length > 0 ? failedTracks : undefined
    });

  } catch (error) {
    logger.error(`Error creating playlist: ${error.message}`);
    res.status(500).json({
      error: 'Failed to create playlist',
      message: error.message
    });
  }
});

export default router;