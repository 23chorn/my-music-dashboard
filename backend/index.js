import 'dotenv/config';

// Set timezone for the application
process.env.TZ = process.env.TZ || 'Europe/London';

import express from "express";
import cors from "cors";
import morgan from "morgan";
import logger from "./src/utils/logger.js";
import { initializeDatabase, closeDatabase } from "./src/db/connection.js";
import MusicSyncService from "./src/services/musicSync.js";
import searchRouter from "./src/routes/search.js";
import artistRouter from "./src/routes/artist.js";
import albumRouter from "./src/routes/album.js";
import trackRouter from "./src/routes/track.js";
import analyticsRouter from "./src/routes/analytics.js";
import spotifyRouter from "./src/routes/spotify.js";
import systemRouter from "./src/routes/system.js";
import syncRouter from "./src/routes/sync.js";
import trendsRouter from "./src/routes/trends.js";
import discoveriesRouter from "./src/routes/discoveries.js";
import insightsRouter from "./src/routes/insights.js";
import tagsRouter from "./src/routes/tags.js";
import milestonesRouter from "./src/routes/milestones.js";
import triviaRouter from "./src/routes/trivia.js";

const app = express();

app.use(morgan("combined", { stream: logger.stream }));
app.use(cors());
app.use(express.json());

// Initialize database connection
initializeDatabase();

// Initialize music sync service
const musicSync = new MusicSyncService();

// Make musicSync available to routes
app.locals.musicSync = musicSync;

// Log server startup and environment
logger.info(`🔧 Starting server in ${process.env.NODE_ENV || "development"} mode`);

// Resource-based routes
app.use('/api/search', searchRouter);
app.use('/api/artists', artistRouter);
app.use('/api/albums', albumRouter);
app.use('/api/tracks', trackRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/spotify', spotifyRouter);
app.use('/api/system', systemRouter);
app.use('/api/sync', syncRouter);
app.use('/api/trends', trendsRouter);
app.use('/api/recent-discoveries', discoveriesRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/milestones', milestonesRouter);
app.use('/api/trivia', triviaRouter);

// Legacy routes for test compatibility
app.get('/api/health/database', async (req, res) => {
  try {
    const { checkDatabaseHealth } = await import('./src/db/connection.js');
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

app.get('/api/timezone-info', async (req, res) => {
  try {
    const { getTimezoneInfo } = await import('./src/utils/timezone.js');
    const timezoneInfo = getTimezoneInfo();
    res.json(timezoneInfo);
  } catch (error) {
    logger.error("Error getting timezone info:", error);
    res.status(500).json({
      error: 'Failed to get timezone info',
      message: error.message
    });
  }
});

app.get('/api/unique-counts', async (req, res) => {
  try {
    const { getUniqueCounts } = await import('./src/db/analytics.js');
    getUniqueCounts((error, counts) => {
      if (error) {
        logger.error("Error getting unique counts:", error);
        res.status(500).json({
          error: 'Failed to get unique counts',
          message: error.message
        });
      } else {
        res.json(counts);
      }
    });
  } catch (error) {
    logger.error("Error getting unique counts:", error);
    res.status(500).json({
      error: 'Failed to get unique counts',
      message: error.message
    });
  }
});

app.get('/', (req, res) => {
  logger.info("Root endpoint hit");
  res.send(`🎵 My Music Dashboard API is running!

Available endpoints:
📊 Artists: /api/artists/top, /api/artists/all, /api/artists/:id, /api/artists/:id/stats
💿 Albums: /api/albums/top, /api/albums/all, /api/albums/:id, /api/albums/:id/stats  
🎵 Tracks: /api/tracks/top, /api/tracks/recent, /api/tracks/all, /api/tracks/:id, /api/tracks/:id/stats
📈 Analytics: /api/analytics/daily-plays
🔍 Search: /api/search?q=query
🎧 Spotify: /api/spotify (external service integration)

For detailed individual artist/album/track data, use /:id/recent-plays, /:id/milestones, /:id/daily-plays endpoints.`);
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`🛑 ${signal} received: closing HTTP server`);
  
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      await closeDatabase();
      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error(`❌ Error during shutdown: ${error.message}`);
      process.exit(1);
    }
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('⚠️ Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});