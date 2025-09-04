import express from 'express';
const router = express.Router();
import { searchAll } from '../db/search.js';
import logger from '../utils/logger.js';

// GET /api/search?q=your_query
router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    logger.info(`GET /api/search called with q="${query}"`);
    
    const results = await new Promise((resolve, reject) => {
      searchAll(query, (err, results) => {
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    logger.info(`searchAll returned artists=${results.artists.length}, tracks=${results.tracks.length}, albums=${results.albums.length}`);
    res.json(results);
  } catch (err) {
    logger.error(`Error in searchAll: ${err}`);
    res.status(500).json({ error: 'DB error' });
  }
});

export default router;