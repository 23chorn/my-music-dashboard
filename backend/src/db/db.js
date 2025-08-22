const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(__dirname + '/../../data/recentTracks.db');
const { getPeriodTimestamp } = require('../utils/period');

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
      const stmt = db.prepare("INSERT OR IGNORE INTO plays (track, artist, album, timestamp) VALUES (?, ?, ?, ?)");
      for (const p of newPlays) {
        stmt.run(p.track, p.artist, p.album, p.timestamp);
      }
      stmt.finalize(callback);
    }
  );
}

function getUniqueCounts(callback) {
  db.serialize(() => {
    // Unique artists played
    db.get(
      `SELECT COUNT(DISTINCT tracks.artist_id) AS uniqueArtistCount
       FROM plays_new
       JOIN tracks ON plays_new.track_id = tracks.id`,
      (err, artistRow) => {

        // Unique tracks played (track+artist+album)
        db.get(
          `SELECT COUNT(DISTINCT tracks.id || '|' || tracks.artist_id || '|' || tracks.album_id) AS uniqueTrackCount
           FROM plays_new
           JOIN tracks ON plays_new.track_id = tracks.id`,
          (err2, trackRow) => {

            // Unique albums played
            db.get(
              `SELECT COUNT(DISTINCT tracks.album_id) AS uniqueAlbumCount
               FROM plays_new
               JOIN tracks ON plays_new.track_id = tracks.id`,
              (err3, albumRow) => {

                // Total play count
                db.get(
                  `SELECT COUNT(*) AS playCount FROM plays_new`,
                  (err4, playRow) => {
                    callback(
                      err || err2 || err3 || err4,
                      {
                        uniqueArtistCount: artistRow?.uniqueArtistCount ?? 0,
                        uniqueTrackCount: trackRow?.uniqueTrackCount ?? 0,
                        uniqueAlbumCount: albumRow?.uniqueAlbumCount ?? 0,
                        playCount: playRow?.playCount ?? 0,
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
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

module.exports = {
  getLastTimestamp,
  addPlaysDeduped,
  getUniqueCounts,
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getRecentTracks,
};