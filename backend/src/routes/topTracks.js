import express from 'express';
const router = express.Router();
import { getTopTracks } from '../db/db.js';
import logger from '../utils/logger.js';

// GET /api/top-tracks
router.get('/', (req, res) => {
  const { limit = 5, period = "overall" } = req.query;
  logger.info(`GET /api/top-tracks called with limit=${limit}, period=${period}`);
  getTopTracks({ limit: Number(limit), period }, (err, tracks) => {
    if (err) {
      logger.error(`Error in getTopTracks: ${err}`);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${tracks.length} top tracks`);
    res.json(tracks);
  });
});

export default router;