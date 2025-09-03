import dotenv from "dotenv";
dotenv.config({ path: '.env' });

// Set timezone for the application
process.env.TZ = process.env.TZ || 'Europe/London';

import express from "express";
import cors from "cors";
import morgan from "morgan";
import logger from "./src/utils/logger.js";
import { fetchAllRecentTracks } from "./src/services/lastfm.js";
import { initializeDatabase, getLastTimestamp, addPlaysDeduped, getUniqueCounts, getRecentTracks } from "./src/db/db.js";
import MusicSyncService from "./src/services/musicSync.js";
import { initializeArtistDatabase } from "./src/db/artistDb.js";
import { initializeAlbumDatabase } from "./src/db/albumDb.js";
import { getTimezoneInfo } from "./src/utils/timezone.js";
import searchRouter from "./src/routes/search.js";
import artistRouter from "./src/routes/artist.js";
import albumRouter from "./src/routes/album.js";
import trackRouter from "./src/routes/track.js";
import analyticsRouter from "./src/routes/analytics.js";
import spotifyRouter from "./src/routes/spotify.js";

const app = express();

app.use(morgan("combined", { stream: logger.stream }));
app.use(cors());
app.use(express.json());

// Initialize database connections
initializeDatabase();
initializeArtistDatabase();
initializeAlbumDatabase();

// Initialize music sync service
const musicSync = new MusicSyncService();

// Log server startup and environment
logger.info(`Starting server in ${process.env.NODE_ENV || "development"} mode`);
logger.info(`Listening on port ${process.env.PORT || 3001}`);

app.get('/api/unique-counts', (req, res) => {
  logger.info("GET /api/unique-counts called");
  getUniqueCounts((err, uniqueCounts) => {
    if (err) {
      logger.error("Error getting unique counts:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info("Returning unique counts");
    res.json(uniqueCounts);
  });
});

// Timezone info endpoint for debugging
app.get('/api/timezone-info', (req, res) => {
  logger.info("GET /api/timezone-info called");
  const timezoneInfo = getTimezoneInfo();
  logger.info("Returning timezone info", timezoneInfo);
  res.json(timezoneInfo);
});

// POST endpoint to sync new tracks (unified Spotify/Last.fm)
app.post('/api/sync-tracks', async (req, res) => {
  logger.info("POST /api/sync-tracks called");
  
  try {
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
      method: musicSync.getCurrentMethod()
    });
  }
});

// GET sync method status
app.get('/api/sync-status', async (req, res) => {
  try {
    const status = await musicSync.getStatus();
    res.json(status);
  } catch (error) {
    logger.error("Error getting sync status:", error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// POST switch sync method
app.post('/api/switch-sync-method', async (req, res) => {
  try {
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

// Resource-based routes
app.use('/api/search', searchRouter);
app.use('/api/artist', artistRouter);
app.use('/api/album', albumRouter);
app.use('/api/track', trackRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/spotify', spotifyRouter);

app.get('/', (req, res) => {
  logger.info("Root endpoint hit");
  res.send(`🎵 My Music Dashboard API is running!

Available endpoints:
📊 Artists: /api/artist/top, /api/artist/all, /api/artist/:id, /api/artist/:id/stats
💿 Albums: /api/album/top, /api/album/all, /api/album/:id, /api/album/:id/stats  
🎵 Tracks: /api/track/top, /api/track/recent, /api/track/all, /api/track/:id, /api/track/:id/stats
📈 Analytics: /api/analytics/daily-plays
🔍 Search: /api/search?q=query
🎧 Spotify: /api/spotify (external service integration)

For detailed individual artist/album/track data, use /:id/recent-plays, /:id/milestones, /:id/daily-plays endpoints.`);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on ${PORT}`);
});