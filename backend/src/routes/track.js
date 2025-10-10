import express from 'express';
const router = express.Router();
import logger from '../utils/logger.js';
import {
  getTrackInfo,
  getTrackRecentPlays,
  getTrackStats,
  getTrackDailyPlays,
  getAllTracksWithPlaycount
} from '../db/trackDb.js';
import { getTopTracks } from '../db/topQueries.js';
import { getRecentTracks } from '../db/plays.js';

// Get top tracks (replaces /api/top-tracks)
router.get('/top', (req, res) => {
  const { limit = 5, period = "overall", artistId = null, albumId = null } = req.query;
  logger.info(`GET /api/tracks/top called with limit=${limit}, period=${period}, artistId=${artistId}, albumId=${albumId}`);
  getTopTracks({ limit: Number(limit), period, artistId, albumId }, (err, tracks) => {
    if (err) {
      logger.error(`Error in getTopTracks: ${err}`);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${tracks.length} top tracks`);
    res.json(tracks);
  });
});

// Get recent tracks (replaces /api/recent-tracks)
router.get('/recent', (req, res) => {
  const { limit = 5 } = req.query;
  logger.info(`GET /api/tracks/recent called with limit=${limit}`);
  getRecentTracks(Number(limit), (err, tracks) => {
    if (err) {
      logger.error(`Error in getRecentTracks: ${err}`);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${tracks.length} recent tracks`);
    res.json(tracks);
  });
});

// Get all tracks with playcount for Explore page
router.get('/all', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const sortBy = req.query.sortBy || 'alpha';
  const alphaCategory = req.query.alphaCategory || null;
  const minPlays = req.query.minPlays ? parseInt(req.query.minPlays) : null;
  const maxPlays = req.query.maxPlays ? parseInt(req.query.maxPlays) : null;
  
  logger.info(`GET /api/tracks/all called with page=${page}, limit=${limit}, sortBy=${sortBy}, alphaCategory=${alphaCategory}, minPlays=${minPlays}, maxPlays=${maxPlays}`);
  
  const options = { page, limit, sortBy, alphaCategory, minPlays, maxPlays };
  getAllTracksWithPlaycount(options, (err, rows) => {
    if (err) {
      logger.error("DB error in getAllTracksWithPlaycount:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${rows.length} tracks`);
    res.json(rows);
  });
});

// Get track info
router.get('/:id', (req, res) => {
  logger.info(`GET /api/tracks/${req.params.id} called`);
  getTrackInfo(req.params.id, (err, track) => {
    if (err) {
      logger.error("DB error in getTrackInfo:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!track) {
      logger.warn(`Track not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Track not found' });
    }
    logger.info(`Returned info for track ${req.params.id}`);
    res.json(track);
  });
});

// Get recent plays for track
router.get('/:id/recent-plays', (req, res) => {
  const trackId = Number(req.params.id);
  const limit = Number(req.query.limit) || 10;
  logger.info(`GET /api/tracks/${trackId}/recent-plays?limit=${limit}`);
  
  getTrackRecentPlays(trackId, limit, (err, plays) => {
    if (err) {
      logger.error("DB error in getTrackRecentPlays:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${plays.length} recent plays for track ${trackId}`);
    res.json(plays);
  });
});

// Get track stats
router.get('/:id/stats', (req, res) => {
  const trackId = Number(req.params.id);
  logger.info(`GET /api/tracks/${trackId}/stats`);
  
  getTrackStats(trackId, (err, stats) => {
    if (err) {
      logger.error("DB error in getTrackStats:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned stats for track ${trackId}`);
    res.json(stats);
  });
});

// Get daily plays for track
router.get('/:id/daily-plays', (req, res) => {
  const trackId = Number(req.params.id);
  const days = Number(req.query.days) || 90;
  logger.info(`GET /api/tracks/${trackId}/daily-plays?days=${days}`);
  
  getTrackDailyPlays(trackId, days, (err, dailyPlays) => {
    if (err) {
      logger.error("DB error in getTrackDailyPlays:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${dailyPlays.length} days of plays for track ${trackId}`);
    res.json(dailyPlays);
  });
});

export default router;