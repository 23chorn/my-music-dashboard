import express from 'express';
const router = express.Router();
import { getTopArtists } from '../db/db.js';
import logger from '../utils/logger.js';

// GET /api/top-artists
router.get('/', (req, res) => {
  const { limit = 5, period = "overall" } = req.query;
  logger.info(`GET /api/top-artists called with limit=${limit}, period=${period}`);
  getTopArtists(Number(limit), period, (err, artists) => {
    if (err) {
      logger.error(`Error in getTopArtists: ${err}`);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${artists.length} top artists`);
    res.json(artists);
  });
});

export default router;