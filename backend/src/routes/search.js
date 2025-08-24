import express from 'express';
const router = express.Router();
import { searchAll } from '../db/db.js';
import logger from '../utils/logger.js';

// GET /api/search?q=your_query
router.get('/', (req, res) => {
  const query = req.query.q;
  logger.info(`GET /api/search called with q="${query}"`);
  searchAll(query, (err, results) => {
    if (err) {
      logger.error(`Error in searchAll: ${err}`);
      return res.status(500).json({ error: 'DB error' });
    }
    logger.info(`searchAll returned artists=${results.artists.length}, tracks=${results.tracks.length}, albums=${results.albums.length}`);
    res.json(results);
  });
});

export default router;