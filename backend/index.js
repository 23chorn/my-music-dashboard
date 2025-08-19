const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();

const RECENT_TRACKS_FILE = './recentTracks.json';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Helper functions
function readRecentTracksData() {
  if (!fs.existsSync(RECENT_TRACKS_FILE)) return { lastTimestamp: null };
  return JSON.parse(fs.readFileSync(RECENT_TRACKS_FILE, 'utf8'));
}
function writeRecentTracksData(data) {
  fs.writeFileSync(RECENT_TRACKS_FILE, JSON.stringify(data, null, 2));
}

// GET endpoint for last timestamp
app.get('/api/recent-timestamp', (req, res) => {
  const data = readRecentTracksData();
  res.json({ lastTimestamp: data.lastTimestamp ?? null });
});

// POST endpoint to update last timestamp
app.post('/api/recent-timestamp', (req, res) => {
  const { lastTimestamp } = req.body;
  if (!lastTimestamp) return res.status(400).json({ error: 'Missing lastTimestamp' });
  let data = readRecentTracksData();
  if (!data) data = {};
  data.lastTimestamp = lastTimestamp;
  writeRecentTracksData(data);
  res.json({ success: true });
});

// GET endpoint for recent tracks
app.get('/api/recent-tracks', (req, res) => {
  const data = readRecentTracksData();
  res.json(data || { lastTimestamp: null, tracks: [] });
});

// POST endpoint to update tracks/artists
app.post('/api/recent-tracks', (req, res) => {
  const { tracks } = req.body;
  if (!Array.isArray(tracks)) return res.status(400).json({ error: 'tracks must be an array' });

  let data = readRecentTracksData();
  if (!data) data = {};
  data.tracks = [...(data.tracks || []), ...tracks];
  writeRecentTracksData(data);

  res.json({ success: true });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});