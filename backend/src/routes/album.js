import express from 'express';
const router = express.Router();
import logger from '../utils/logger.js';
import {
  getAlbumInfo,
  getAlbumRecentPlays,
  getAlbumStats
} from '../db/albumDb.js';
import { getTopTracks } from '../db/db.js';

// Get album info
router.get('/:id', (req, res) => {
  logger.info(`GET /api/album/${req.params.id} called`);
  getAlbumInfo(req.params.id, (err, album) => {
    if (err) {
      logger.error("DB error in getAlbumInfo:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!album) {
      logger.warn(`Album not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Album not found' });
    }
    logger.info(`Returned info for album ${req.params.id}`);
    res.json(album);
  });
});

// Get top tracks for album (albumId optional)
router.get('/:id/top-tracks', (req, res) => {
  const albumId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  const period = req.query.period || "overall";
  logger.info(`GET /api/album/${albumId}/top-tracks?limit=${limit}&period=${period}`);

  // Pass albumId as an optional parameter to getTopTracks
  getTopTracks({ limit, period, albumId }, (err, tracks) => {
    if (err) {
      logger.error("DB error in getTopTracks:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${tracks.length} top tracks for album ${albumId}`);
    res.json(tracks);
  });
});

// Get recent plays for album
router.get('/:id/recent-plays', (req, res) => {
  const albumId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  logger.info(`GET /api/album/${albumId}/recent-plays?limit=${limit}`);
  getAlbumRecentPlays(albumId, limit, (err, plays) => {
    if (err) {
      logger.error("DB error in getAlbumRecentPlays:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${plays.length} recent plays for album ${albumId}`);
    res.json(plays);
  });
});

// Get album stats
router.get('/:id/stats', (req, res) => {
  logger.info(`GET /api/album/${req.params.id}/stats called`);
  getAlbumStats(req.params.id, (err, stats) => {
    if (err) {
      logger.error("DB error in getAlbumStats:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned stats for album ${req.params.id}`);
    res.json(stats);
  });
});

export default router;