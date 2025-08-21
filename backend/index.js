const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();

require('dotenv').config({path: __dirname + '/../.env'});

console.log('API KEY:', process.env.VITE_LASTFM_API_KEY);
console.log('USERNAME:', process.env.VITE_LASTFM_USERNAME);

app.use(cors());
app.use(express.json({ limit: '20mb' }));

const db = new sqlite3.Database(__dirname + '/../public/data/recentTracks.db');

const { getTopArtists, getTopTracks, getTopAlbums, getRecentTracks, getUserInfo, fetchAllRecentTracks} = require('./lastfm');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track TEXT NOT NULL,
    artist TEXT NOT NULL,
    album TEXT NOT NULL,
    timestamp INTEGER
  )`);
});

function getLastTimestamp(callback) {
  db.get("SELECT MAX(timestamp) as latest from plays", (err, row) => {
    if (err) return callback(err);
    callback(null, row ? row.latest : null);
  });
}

function addPlaysDeduped(plays, callback) {
  if (!plays.length) return callback();

  // Check for existing plays by timestamp, track, artist, album
  const placeholders = plays.map(() => '?').join(',');
  const timestamps = plays.map(p => p.timestamp);

  db.all(
    `SELECT timestamp, track, artist, album FROM plays WHERE timestamp IN (${placeholders})`,
    timestamps,
    (err, existingRows) => {
      if (err) return callback(err);

      // Build a set of existing keys for fast lookup
      const existingSet = new Set(
        existingRows.map(row => `${row.timestamp}|${row.track}|${row.artist}|${row.album}`)
      );

      // Filter out plays that already exist
      const newPlays = plays.filter(
        p => !existingSet.has(`${p.timestamp}|${p.track}|${p.artist}|${p.album}`)
      );

      // Insert only new plays
      const stmt = db.prepare("INSERT INTO plays (track, artist, album, timestamp) VALUES (?, ?, ?, ?)");
      for (const p of newPlays) {
        stmt.run(p.track, p.artist, p.album, p.timestamp);
      }
      stmt.finalize(callback);
    }
  );
}

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
    db.get("SELECT MAX(timestamp) as latest FROM plays", async (err, row) => {
      if (err) return res.status(500).json({ error: 'DB error' });
      const lastTimestamp = row ? row.latest : 0;

      // 2. Fetch new tracks from Last.fm since lastTimestamp
      const newTracks = await fetchAllRecentTracks({ from: lastTimestamp });

      // 3. Insert only new tracks into DB (use your deduplication logic)
      addPlaysDeduped(newTracks, (err2) => {
        if (err2) return res.status(500).json({ error: 'DB error' });

        // 4. Now query unique counts
        db.get("SELECT COUNT(DISTINCT artist) AS artistCount FROM plays", (err3, artistRow) => {
          if (err3) return res.status(500).json({ error: 'DB error' });
          db.get("SELECT COUNT(DISTINCT track) AS trackCount FROM plays", (err4, trackRow) => {
            if (err4) return res.status(500).json({ error: 'DB error' });
            db.get("SELECT COUNT(DISTINCT album) AS albumCount FROM plays WHERE album IS NOT NULL AND album != ''", (err5, albumRow) => {
              if (err5) return res.status(500).json({ error: 'DB error' });
              db.get("SELECT COUNT(*) AS playCount FROM plays", (err6, playRow) => {
                if (err6) return res.status(500).json({ error: 'DB error' });
                res.json({
                  uniqueArtistCount: artistRow.artistCount,
                  uniqueTrackCount: trackRow.trackCount,
                  uniqueAlbumCount: albumRow.albumCount,
                  playCount: playRow.playCount
                });
              });
            });
          });
        });
      });
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch from Last.fm' });
  }
});

// GET endpoint for last timestamp
app.get('/api/recent-timestamp', (req, res) => {
  getLastTimestamp((err, lastTimestamp) => {
    if (err) return res.status(500).json({ error: 'Internal server error' });
    db.all("SELECT * FROM plays ORDER BY timestamp desc", (err2, rows) => {
      if (err2) return res.status(500).json({ error: 'Internal server error' });
      res.json({ lastTimestamp, tracks: rows });
    });
  });
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