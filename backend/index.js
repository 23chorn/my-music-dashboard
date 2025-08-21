require('dotenv').config({path: __dirname + '/../.env'});
const express = require('express');
const cors = require('cors');
const app = express();
const { 
  getTopArtists, 
  getTopTracks, 
  getTopAlbums, 
  getRecentTracks, 
  getUserInfo, 
  fetchAllRecentTracks
} = require('./lastfm');
const {
  getLastTimestamp,
  addPlaysDeduped,
  getUniqueCounts
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
app.get('/api/top-artists', async (req, res) => {
  const { limit = 10, period = "overall" } = req.query;
  const artists = await getTopArtists(limit, period);
  res.json(artists);
});

// Top Tracks
app.get('/api/top-tracks', async (req, res) => {
  const { limit = 10, period = "overall" } = req.query;
  const tracks = await getTopTracks(limit, period);
  res.json(tracks);
});

// Top Albums
app.get('/api/top-albums', async (req, res) => {
  const { limit = 10, period = "overall" } = req.query;
  const albums = await getTopAlbums(limit, period);
  res.json(albums);
});

// Recent Tracks
app.get('/api/recent-tracks', async (req, res) => {
  const { limit = 10 } = req.query;
  const tracks = await getRecentTracks(limit);
  res.json(tracks || []);
});

// User Info
app.get('/api/user-info', async (req, res) => {
  const userInfo = await getUserInfo();
  res.json(userInfo);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});