import express from 'express';
const router = express.Router();
import logger from '../utils/logger.js';
import {
  getArtistInfo,
  getArtistRecentPlays,
  getArtistStats,
  getArtistMilestones,
  getArtistDailyPlays,
  getAllArtistsWithPlaycount,
} from '../db/artistDb.js';
import { getTopTracks, getTopAlbums } from '../db/db.js';

// Get all artists with playcount for Explore page
router.get('/all', (req, res) => {
  logger.info("GET /api/artist/all called");
  getAllArtistsWithPlaycount((err, rows) => {
    if (err) {
      logger.error("DB error in getAllArtistsWithPlaycount:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${rows.length} artists`);
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  logger.info(`GET /api/artist/${req.params.id} called`);
  getArtistInfo(req.params.id, (err, artist) => {
    if (err) {
      logger.error("DB error in getArtistInfo:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    if (!artist) {
      logger.warn(`Artist not found: ${req.params.id}`);
      return res.status(404).json({ error: 'Artist not found' });
    }
    logger.info(`Returned info for artist ${req.params.id}`);
    res.json(artist);
  });
});

router.get('/:id/top-tracks', (req, res) => {
  const artistId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  const period = req.query.period || 'overall';
  logger.info(`GET /api/artist/${artistId}/top-tracks?limit=${limit}&period=${period}`);
  getTopTracks({ artistId, limit, period }, (err, tracks) => {
    if (err) {
      logger.error("DB error in getTopTracks:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${tracks.length} top tracks for artist ${artistId}`);
    res.json(tracks);
  });
});

router.get('/:id/top-albums', (req, res) => {
  const artistId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  const period = req.query.period || 'overall';
  logger.info(`GET /api/artist/${artistId}/top-albums?limit=${limit}&period=${period}`);
  getTopAlbums({ artistId, limit, period }, (err, albums) => {
    if (err) {
      logger.error("DB error in getTopAlbums:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${albums.length} top albums for artist ${artistId}`);
    res.json(albums);
  });
});

router.get('/:id/recent-plays', (req, res) => {
  const artistId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  logger.info(`GET /api/artist/${artistId}/recent-plays?limit=${limit}`);
  getArtistRecentPlays(artistId, limit, (err, plays) => {
    if (err) {
      logger.error("DB error in getArtistRecentPlays:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${plays.length} recent plays for artist ${artistId}`);
    res.json(plays);
  });
});

router.get('/:id/stats', (req, res) => {
  logger.info(`GET /api/artist/${req.params.id}/stats called`);
  getArtistStats(req.params.id, (err, stats) => {
    if (err) {
      logger.error("DB error in getArtistStats:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned stats for artist ${req.params.id}`);
    res.json(stats);
  });
});

router.get('/:id/milestones', (req, res) => {
  logger.info(`GET /api/artist/${req.params.id}/milestones called`);
  getArtistMilestones(req.params.id, (err, milestones) => {
    if (err) {
      logger.error("DB error in getArtistMilestones:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${milestones.length} milestones for artist ${req.params.id}`);
    res.json(milestones);
  });
});

router.get('/:id/daily-plays', (req, res) => {
  const artistId = req.params.id;
  const days = Number(req.query.days) || 30;
  logger.info(`GET /api/artist/${artistId}/daily-plays?days=${days}`);
  getArtistDailyPlays(artistId, days, (err, rows) => {
    if (err) {
      logger.error("DB error in getArtistDailyPlays:", err);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${rows.length} daily plays for artist ${artistId}`);
    res.json(rows);
  });
});

export default router;