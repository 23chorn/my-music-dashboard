const express = require('express');
const router = express.Router();
const { getRecentTracks } = require('../db/db'); // adjust path if needed

// GET /api/recent-tracks
router.get('/', (req, res) => {
  const { limit = 10 } = req.query;
  getRecentTracks(Number(limit), (err, tracks) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(tracks);
  });
});

module.exports = router;