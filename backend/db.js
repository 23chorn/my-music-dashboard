const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(__dirname + '/../public/data/recentTracks.db');

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

function getUniqueCounts(callback) {
  db.serialize(() => {
    db.get("SELECT COUNT(DISTINCT artist) AS uniqueArtistCount FROM plays", (err, artistRow) => {
      if (err) return callback(err);
      db.get("SELECT COUNT(DISTINCT track) AS uniqueTrackCount FROM plays", (err2, trackRow) => {
        if (err2) return callback(err2);
        db.get("SELECT COUNT(DISTINCT album) AS uniqueAlbumCount FROM plays WHERE album IS NOT NULL AND album != ''", (err3, albumRow) => {
          if (err3) return callback(err3);
          db.get("SELECT COUNT(*) AS playCount FROM plays", (err4, playRow) => {
            if (err4) return callback(err4);
            callback(null, {
              uniqueArtistCount: artistRow.uniqueArtistCount,
              uniqueTrackCount: trackRow.uniqueTrackCount,
              uniqueAlbumCount: albumRow.uniqueAlbumCount,
              playCount: playRow.playCount
            });
          });
        });
      });
    });
  });
}

function getTopArtists(limit = 10, period = "overall", callback) {
  const fromTimestamp = getPeriodTimestamp(period);
  let query = `
    SELECT artist, COUNT(*) as playcount
    FROM plays
    WHERE timestamp >= ?
    GROUP BY artist
    ORDER BY playcount DESC
    LIMIT ?
  `;
  db.all(query, [fromTimestamp, limit], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

function getTopTracks(limit = 10, period = "overall", callback) {
  const fromTimestamp = getPeriodTimestamp(period);
  const query = `
    SELECT track, artist, COUNT(*) as playcount
    FROM plays
    WHERE timestamp >= ?
    GROUP BY track, artist
    ORDER BY playcount DESC
    LIMIT ?
  `;
  db.all(query, [fromTimestamp, limit], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

function getTopAlbums(limit = 10, period = "overall", callback) {
  const fromTimestamp = getPeriodTimestamp(period);
  const query = `
    SELECT album, artist, COUNT(*) as playcount
    FROM plays
    WHERE timestamp >= ?
      AND album IS NOT NULL AND album != ''
    GROUP BY album, artist
    ORDER BY playcount DESC
    LIMIT ?
  `;
  db.all(query, [fromTimestamp, limit], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

function getRecentTracks(limit = 10, callback) {
  const query = `
    SELECT track, artist, album, timestamp
    FROM plays
    ORDER BY timestamp DESC
    LIMIT ?
  `;
  db.all(query, [limit], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows);
  });
}

function getPeriodTimestamp(period) {
  const now = Math.floor(Date.now() / 1000);
  switch (period) {
    case "7day":
      return now - 7 * 24 * 60 * 60;
    case "1month":
      return now - 30 * 24 * 60 * 60;
    case "3month":
      return now - 90 * 24 * 60 * 60;
    case "6month":
      return now - 180 * 24 * 60 * 60;
    case "12month":
      return now - 365 * 24 * 60 * 60;
    case "overall":
    default:
      return 0;
  }
}

module.exports = {
  getLastTimestamp,
  addPlaysDeduped,
  getUniqueCounts,
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getRecentTracks,
  getPeriodTimestamp
};