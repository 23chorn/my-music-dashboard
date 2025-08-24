import express from 'express';
const router = express.Router();
import { getRecentTracks } from '../db/db.js';
import logger from '../utils/logger.js';

// GET /api/recent-tracks
router.get('/', (req, res) => {
  const { limit = 5 } = req.query;
  logger.info(`GET /api/recent-tracks called with limit=${limit}`);
  getRecentTracks(Number(limit), (err, tracks) => {
    if (err) {
      logger.error(`Error in getRecentTracks: ${err}`);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${tracks.length} recent tracks`);
    res.json(tracks);
  });
});

export default router;