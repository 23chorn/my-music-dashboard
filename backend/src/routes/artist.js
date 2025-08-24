const express = require('express');
const router = express.Router();
const {
  getArtistInfo,
  getArtistTopAlbums,
  getArtistRecentPlays,
  getArtistStats,
  getArtistMilestones,
  getArtistDailyPlays,
  getAllArtistsWithPlaycount,
} = require('../db/artistDb');
const { getTopTracks, getTopAlbums } = require('../db/db'); 

// Get all artists with playcount for Explore page
router.get('/all', (req, res) => {
  getAllArtistsWithPlaycount((err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

router.get('/:id', (req, res) => {
  getArtistInfo(req.params.id, (err, artist) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  });
});

router.get('/:id/top-tracks', (req, res) => {
  const artistId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  const period = req.query.period || 'overall';
  getTopTracks({ artistId, limit, period }, (err, tracks) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(tracks);
  });
});

router.get('/:id/top-albums', (req, res) => {
  const artistId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  const period = req.query.period || 'overall';
  getTopAlbums({ artistId, limit, period }, (err, albums) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(albums);
  });
});

router.get('/:id/recent-plays', (req, res) => {
  const artistId = req.params.id;
  const limit = Number(req.query.limit) || 10;
  getArtistRecentPlays(artistId, limit, (err, plays) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(plays);
  });
});

router.get('/:id/stats', (req, res) => {
  getArtistStats(req.params.id, (err, stats) => {
    if (err) {
      console.error(err); // Log the error for debugging
      return res.status(500).json({ error: 'DB error' });
    }
    res.json(stats);
  });
});

router.get('/:id/milestones', (req, res) => {
  getArtistMilestones(req.params.id, (err, milestones) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(milestones);
  });
});

router.get('/:id/daily-plays', (req, res) => {
  const artistId = req.params.id;
  const days = Number(req.query.days) || 30; // support ?days= in query
  getArtistDailyPlays(artistId, days, (err, rows) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(rows);
  });
});

module.exports = router;