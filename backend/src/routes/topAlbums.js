import express from 'express';
const router = express.Router();
import { getTopAlbums } from '../db/db.js';
import logger from '../utils/logger.js';

// GET /api/top-albums
router.get('/', (req, res) => {
  const { limit = 5, period = "overall" } = req.query;
  logger.info(`GET /api/top-albums called with limit=${limit}, period=${period}`);
  getTopAlbums({ limit: Number(limit), period }, (err, albums) => {
    if (err) {
      logger.error(`Error in getTopAlbums: ${err}`);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`Returned ${albums.length} top albums`);
    res.json(albums);
  });
});

export default router;