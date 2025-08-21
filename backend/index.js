require('dotenv').config({path: __dirname + '/../.env'});
const express = require('express');
const cors = require('cors');
const app = express();
const { 
  fetchAllRecentTracks
} = require('./lastfm');
const {
  getLastTimestamp,
  addPlaysDeduped,
  getUniqueCounts,
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getRecentTracks
} = require('./db');

app.use(cors());
app.use(express.json());

// POST recent plays
app.post('/api/recent-tracks', (req, res) => {
  const { tracks } = req.body;
  if (!Array.isArray(tracks)) return res.status(400).json({ error: 'tracks must be an array' });
  addPlaysDeduped(tracks, err => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json({ success: true });
  });
});

app.get('/api/unique-counts', async (req, res) => {
  try {
    // 1. Get latest timestamp from DB
    getLastTimestamp(async(err, lastTimestamp) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      if (!lastTimestamp) return res.status(404).json({ error: 'No tracks found' });

      // 2. Fetch new tracks from Last.fm since lastTimestamp
      const newTracks = await fetchAllRecentTracks({ from: lastTimestamp });

      // 3. Insert only new tracks into DB (use your deduplication logic)
      addPlaysDeduped(newTracks, (err2) => {
        if (err2) return res.status(500).json({ error: 'DB error' });

        // 4. Get unique counts from DB
        getUniqueCounts((err3, uniqueCounts) => {
          if (err3) return res.status(500).json({ error: 'DB error' });
          res.json( uniqueCounts );
        });
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch from Last.fm' });
  }
});

// Top Artists
app.get('/api/top-artists', (req, res) => {
  const { limit = 10, period = "overall" } = req.query;
  getTopArtists(Number(limit), period, (err, artists) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(artists);
  });
});

// Top Tracks
app.get('/api/top-tracks', (req, res) => {
  const { limit = 10, period = "overall" } = req.query;
  getTopTracks(Number(limit), period, (err, tracks) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(tracks);
  });
});

// Top Albums
app.get('/api/top-albums', (req, res) => {
  const { limit = 10, period = "overall" } = req.query;
  getTopAlbums(Number(limit), period, (err, albums) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(albums);
  });
});

// Recent Tracks
app.get('/api/recent-tracks', (req, res) => {
  const { limit = 10 } = req.query;
  getRecentTracks(Number(limit), (err, tracks) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    res.json(tracks);
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});