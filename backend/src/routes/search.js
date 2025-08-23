const express = require('express');
const router = express.Router();
const { searchAll } = require('../db/db');

// GET /api/search?q=your_query
router.get('/', (req, res) => {
  searchAll(req.query.q, (err, results) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(results);
  });
});

module.exports = router;