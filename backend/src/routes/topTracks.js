const express = require('express');
const router = express.Router();
const { getTopTracks } = require('../db/db'); // adjust path if needed

// GET /api/top-tracks
router.get('/', (req, res) => {
  const { limit = 5, period = "overall" } = req.query;
  getTopTracks(Number(limit), period, (err, tracks) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(tracks);
  });
});

module.exports = router;