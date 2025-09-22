import dotenv from "dotenv";
dotenv.config({ path: '.env' });

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
app.use('/api/artist', artistRouter);
app.use('/api/album', albumRouter);
app.use('/api/track', trackRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/spotify', spotifyRouter);
app.use('/api/system', systemRouter);
app.use('/api/sync', syncRouter);
app.use('/api/trends', trendsRouter);
app.use('/api/recent-discoveries', discoveriesRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/tags', tagsRouter);

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