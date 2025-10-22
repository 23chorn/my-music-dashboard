import express from 'express';
import logger from '../utils/logger.js';
import { getRecentDiscoveries } from '../db/features/trends/index.js';

const router = express.Router();

router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    
    // Validate type parameter
    if (!['tracks', 'artists', 'albums'].includes(type)) {
      return res.status(400).json({ 
        error: 'Invalid type. Must be one of: tracks, artists, albums' 
      });
    }
    
    // Validate limit parameter
    if (limit < 1 || limit > 50) {
      return res.status(400).json({ 
        error: 'Limit must be between 1 and 50' 
      });
    }
    
    logger.info(`Fetching recent ${type} discoveries (limit: ${limit})`);
    
    const discoveries = await getRecentDiscoveries(type, limit);
    
    res.json(discoveries);
    
  } catch (error) {
    logger.error(`Error fetching recent discoveries:`, error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;