const express = require('express');
const router = express.Router();
const { getTopArtists } = require('../db/db'); // adjust path if needed

// GET /api/top-artists
router.get('/', (req, res) => {
  const { limit = 5, period = "overall" } = req.query;
  getTopArtists(Number(limit), period, (err, artists) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(artists);
  });
});

module.exports = router;