import dotenv from "dotenv";
dotenv.config({ path: '.env' });

import express from "express";
import cors from "cors";
import morgan from "morgan";
import logger from "./src/utils/logger.js";
import { fetchAllRecentTracks } from "./src/services/lastfm.js";
import { getLastTimestamp, addPlaysDeduped, getUniqueCounts, getRecentTracks } from "./src/db/db.js";
import topArtistsRouter from "./src/routes/topArtists.js";
import topTracksRouter from "./src/routes/topTracks.js";
import topAlbumsRouter from "./src/routes/topAlbums.js";
import recentTracksRouter from "./src/routes/recentTracks.js";
import searchRouter from "./src/routes/search.js";
import artistRouter from "./src/routes/artist.js";
import albumRouter from "./src/routes/album.js";
import dailyPlaysRouter from "./src/routes/dailyPlays.js";

const app = express();

app.use(morgan("combined", { stream: logger.stream }));
app.use(cors());
app.use(express.json());

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

// POST endpoint to sync new tracks from Last.fm
app.post('/api/sync-tracks', async (req, res) => {
  logger.info("POST /api/sync-tracks called");
  try {
    getLastTimestamp(async(err, lastTimestamp) => {
      if (err) {
        logger.error("Error getting last timestamp:", err);
        return res.status(500).json({ error: 'DB error getting timestamp' });
      }
      if (!lastTimestamp) {
        logger.warn("No tracks found in DB");
        return res.status(404).json({ error: 'No tracks found' });
      }

      try {
        const newTracks = await fetchAllRecentTracks({ from: lastTimestamp });
        logger.info(`Fetched ${newTracks.length} new tracks from Last.fm`);

        addPlaysDeduped(newTracks, (err2, insertedCount) => {
          if (err2) {
            logger.error("Error adding deduped tracks:", err2);
            return res.status(500).json({ error: 'DB error adding tracks' });
          }

          logger.info(`Successfully synced ${insertedCount} new plays`);
          
          // Add verification query to check if plays were actually saved
          getUniqueCounts((verifyErr, counts) => {
            if (verifyErr) {
              logger.error("Error verifying sync:", verifyErr);
            } else {
              logger.info(`Post-sync verification: ${counts.playCount} total plays in DB`);
            }
            
            res.json({ 
              success: true, 
              message: `Synced ${insertedCount} new plays from ${newTracks.length} tracks fetched`,
              newTracks: newTracks.length,
              addedPlays: insertedCount,
              totalPlaysAfterSync: counts?.playCount || 'unknown'
            });
          });
        });
      } catch (fetchError) {
        logger.error("Failed to fetch from Last.fm:", fetchError);
        res.status(500).json({ error: 'Failed to fetch from Last.fm' });
      }
    });
  } catch (e) {
    logger.error("Unexpected error in sync-tracks:", e);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});

// Top Artists
app.use('/api/top-artists', topArtistsRouter);

// Top Tracks
app.use('/api/top-tracks', topTracksRouter);

// Top Albums
app.use('/api/top-albums', topAlbumsRouter);

// Recent Tracks
app.use('/api/recent-tracks', recentTracksRouter);

app.use('/api/search', searchRouter);

app.use('/api/artist', artistRouter);

app.use('/api/album', albumRouter);

app.use('/api/daily-plays', dailyPlaysRouter);

app.get('/', (req, res) => {
  logger.info("Root endpoint hit");
  res.send('🎵 My Music Dashboard API is running! Visit /api/top-artists, /api/top-tracks, /api/top-albums, or /api/recent-tracks for data.');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on ${PORT}`);
});