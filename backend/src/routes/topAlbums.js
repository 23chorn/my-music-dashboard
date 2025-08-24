const express = require('express');
const router = express.Router();
const { getTopAlbums } = require('../db/db'); // adjust path if needed

// GET /api/top-albums
router.get('/', (req, res) => {
  const { limit = 5, period = "overall" } = req.query;
  getTopAlbums({ limit: Number(limit), period }, (err, albums) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(albums);
  });
});

module.exports = router;