require('dotenv').config({path: '.env'});
const express = require('express');
const cors = require('cors');
const app = express();
const { 
  fetchAllRecentTracks
} = require('./src/services/lastfm');
const {
  getLastTimestamp,
  addPlaysDeduped,
  getUniqueCounts
} = require('./src/db/db');

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
const topArtistsRouter = require('./src/routes/topArtists');
app.use('/api/top-artists', topArtistsRouter);

// Top Tracks
const topTracksRouter = require('./src/routes/topTracks');
app.use('/api/top-tracks', topTracksRouter);

// Top Albums
const topAlbumsRouter = require('./src/routes/topAlbums');
app.use('/api/top-albums', topAlbumsRouter);

// Recent Tracks
const recentTracksRouter = require('./src/routes/recentTracks');
app.use('/api/recent-tracks', recentTracksRouter);

const searchRouter = require('./src/routes/search');
app.use('/api/search', searchRouter);

const artistRouter = require('./src/routes/artist');
app.use('/api/artist', artistRouter);

app.get('/', (req, res) => {
  res.send('🎵 My Music Dashboard API is running! Visit /api/top-artists, /api/top-tracks, /api/top-albums, or /api/recent-tracks for data.');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});