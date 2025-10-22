import express from 'express';
import { getAllMilestones, getQuickestTrackMilestones, getQuickestAlbumMilestones, getQuickestArtistMilestones } from '../db/features/milestones/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

// GET /api/milestones - Get all milestone achievements
router.get('/', async (req, res) => {
  try {
    logger.info('GET /api/milestones called');

    const milestones = await getAllMilestones();

    logger.info('Retrieved all milestone achievements');
    res.json(milestones);

  } catch (error) {
    logger.error(`Error getting milestones: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get milestones',
      message: error.message
    });
  }
});

// GET /api/milestones/tracks - Get track milestone achievements
router.get('/tracks', async (req, res) => {
  try {
    logger.info('GET /api/milestones/tracks called');

    const trackMilestones = await getQuickestTrackMilestones();

    logger.info('Retrieved track milestone achievements');
    res.json(trackMilestones);

  } catch (error) {
    logger.error(`Error getting track milestones: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get track milestones',
      message: error.message
    });
  }
});

// GET /api/milestones/albums - Get album milestone achievements
router.get('/albums', async (req, res) => {
  try {
    logger.info('GET /api/milestones/albums called');

    const albumMilestones = await getQuickestAlbumMilestones();

    logger.info('Retrieved album milestone achievements');
    res.json(albumMilestones);

  } catch (error) {
    logger.error(`Error getting album milestones: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get album milestones',
      message: error.message
    });
  }
});

// GET /api/milestones/artists - Get artist milestone achievements
router.get('/artists', async (req, res) => {
  try {
    logger.info('GET /api/milestones/artists called');

    const artistMilestones = await getQuickestArtistMilestones();

    logger.info('Retrieved artist milestone achievements');
    res.json(artistMilestones);

  } catch (error) {
    logger.error(`Error getting artist milestones: ${error.message}`);
    res.status(500).json({
      error: 'Failed to get artist milestones',
      message: error.message
    });
  }
});

export default router;