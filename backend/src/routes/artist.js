const express = require('express');
const router = express.Router();
const {
  getArtistInfo,
  getArtistTopTracks,
  getArtistTopAlbums,
  getArtistRecentPlays,
} = require('../db/artistDb');

router.get('/:id', (req, res) => {
  getArtistInfo(req.params.id, (err, artist) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!artist) return res.status(404).json({ error: 'Artist not found' });
    res.json(artist);
  });
});

router.get('/:id/top-tracks', (req, res) => {
  getArtistTopTracks(req.params.id, (err, tracks) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(tracks);
  });
});

router.get('/:id/top-albums', (req, res) => {
  getArtistTopAlbums(req.params.id, (err, albums) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(albums);
  });
});

router.get('/:id/recent-plays', (req, res) => {
  getArtistRecentPlays(req.params.id, (err, plays) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(plays);
  });
});

module.exports = router;