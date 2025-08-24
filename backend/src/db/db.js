const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(__dirname + '/../../data/recentTracks.db');
const { getPeriodTimestamp } = require('../utils/period');

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS artists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    spotify_uri TEXT,
    genres TEXT,
    image_url TEXT,
    last_fetched DATETIME
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS albums (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    artist_id INTEGER NOT NULL,
    spotify_uri TEXT,
    release_date DATE,
    image_url TEXT,
    last_fetched DATETIME,
    FOREIGN KEY (artist_id) REFERENCES artists (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    artist_id INTEGER NOT NULL,
    album_id INTEGER,
    spotify_uri TEXT,
    duration_ms INTEGER,
    popularity INTEGER,
    release_date DATE,
    FOREIGN KEY (artist_id) REFERENCES artists (id),
    FOREIGN KEY (album_id) REFERENCES albums (id)
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (track_id) REFERENCES tracks (id)
  )`);
});

function getLastTimestamp(callback) {
  db.get(
    `SELECT MAX(timestamp) AS lastTimestamp FROM plays`,
    (err, row) => {
      if (err) return callback(err);
      callback(null, row.lastTimestamp);
    }
  );
}

function addPlaysDeduped(plays, callback) {
  db.serialize(() => {
    let inserted = 0;
    let errors = [];
    let pending = plays.length;

    if (pending === 0) return callback(null, 0);

    plays.forEach(play => {
      // 1. Ensure artist exists
      db.get(
        `SELECT id FROM artists WHERE name = ?`,
        [play.artist],
        (err, artistRow) => {
          if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }

          function insertArtist(cb) {
            db.run(
              `INSERT INTO artists (name) VALUES (?)`,
              [play.artist],
              function (err) { cb(err, this.lastID); }
            );
          }

          const artistId = artistRow ? artistRow.id : null;

          function afterArtist(artistId) {
            // 2. Ensure album exists (if present)
            if (play.album) {
              db.get(
                `SELECT id FROM albums WHERE name = ? AND artist_id = ?`,
                [play.album, artistId],
                (err, albumRow) => {
                  if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }

                  function insertAlbum(cb) {
                    db.run(
                      `INSERT INTO albums (name, artist_id) VALUES (?, ?)`,
                      [play.album, artistId],
                      function (err) { cb(err, this.lastID); }
                    );
                  }

                  const albumId = albumRow ? albumRow.id : null;

                  function afterAlbum(albumId) {
                    // 3. Ensure track exists
                    db.get(
                      `SELECT id FROM tracks WHERE name = ? AND artist_id = ? AND album_id IS ?`,
                      [play.track, artistId, albumId],
                      (err, trackRow) => {
                        if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }

                        function insertTrack(cb) {
                          db.run(
                            `INSERT INTO tracks (name, artist_id, album_id) VALUES (?, ?, ?)`,
                            [play.track, artistId, albumId],
                            function (err) { cb(err, this.lastID); }
                          );
                        }

                        const trackId = trackRow ? trackRow.id : null;

                        function afterTrack(trackId) {
                          // 4. Deduplicate and insert play
                          db.get(
                            `SELECT id FROM plays WHERE track_id = ? AND timestamp = ?`,
                            [trackId, play.timestamp],
                            (err, playRow) => {
                              if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }
                              if (!playRow) {
                                db.run(
                                  `INSERT INTO plays (track_id, timestamp) VALUES (?, ?)`,
                                  [trackId, play.timestamp],
                                  err => {
                                    if (err) errors.push(err);
                                    else inserted++;
                                    if (--pending === 0) callback(errors.length ? errors : null, inserted);
                                  }
                                );
                              } else {
                                if (--pending === 0) callback(errors.length ? errors : null, inserted);
                              }
                            }
                          );
                        }

                        if (trackId) afterTrack(trackId);
                        else insertTrack((err, newTrackId) => {
                          if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }
                          afterTrack(newTrackId);
                        });
                      }
                    );
                  }

                  if (albumId) afterAlbum(albumId);
                  else insertAlbum((err, newAlbumId) => {
                    if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }
                    afterAlbum(newAlbumId);
                  });
                }
              );
            } else {
              // No album, just ensure track
              db.get(
                `SELECT id FROM tracks WHERE name = ? AND artist_id = ? AND album_id IS NULL`,
                [play.track, artistId],
                (err, trackRow) => {
                  if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }

                  function insertTrack(cb) {
                    db.run(
                      `INSERT INTO tracks (name, artist_id, album_id) VALUES (?, ?, NULL)`,
                      [play.track, artistId],
                      function (err) { cb(err, this.lastID); }
                    );
                  }

                  const trackId = trackRow ? trackRow.id : null;

                  function afterTrack(trackId) {
                    db.get(
                      `SELECT id FROM plays WHERE track_id = ? AND timestamp = ?`,
                      [trackId, play.timestamp],
                      (err, playRow) => {
                        if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }
                        if (!playRow) {
                          db.run(
                            `INSERT INTO plays (track_id, timestamp) VALUES (?, ?)`,
                            [trackId, play.timestamp],
                            err => {
                              if (err) errors.push(err);
                              else inserted++;
                              if (--pending === 0) callback(errors.length ? errors : null, inserted);
                            }
                          );
                        } else {
                          if (--pending === 0) callback(errors.length ? errors : null, inserted);
                        }
                      }
                    );
                  }

                  if (trackId) afterTrack(trackId);
                  else insertTrack((err, newTrackId) => {
                    if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }
                    afterTrack(newTrackId);
                  });
                }
              );
            }
          }

          if (artistId) afterArtist(artistId);
          else insertArtist((err, newArtistId) => {
            if (err) { errors.push(err); if (--pending === 0) callback(errors.length ? errors : null, inserted); return; }
            afterArtist(newArtistId);
          });
        }
      );
    });
  });
}

function getUniqueCounts(callback) {
  db.serialize(() => {
    // Unique artists played
    db.get(
      `SELECT COUNT(DISTINCT tracks.artist_id) AS uniqueArtistCount
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id`,
      (err, artistRow) => {

        // Unique tracks played (track+artist+album)
        db.get(
          `SELECT COUNT(DISTINCT tracks.id || '|' || tracks.artist_id || '|' || tracks.album_id) AS uniqueTrackCount
           FROM plays
           JOIN tracks ON plays.track_id = tracks.id`,
          (err2, trackRow) => {

            // Unique albums played
            db.get(
              `SELECT COUNT(DISTINCT tracks.album_id) AS uniqueAlbumCount
               FROM plays
               JOIN tracks ON plays.track_id = tracks.id`,
              (err3, albumRow) => {

                // Total play count
                db.get(
                  `SELECT COUNT(*) AS playCount FROM plays`,
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

function getTopArtists(limit = 5, period = "overall", callback) {
  const fromTimestamp = getPeriodTimestamp(period);
  const query = `
    SELECT artists.id, artists.name, artists.image_url, COUNT(*) AS playcount
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN artists ON tracks.artist_id = artists.id
    WHERE plays.timestamp >= ?
    GROUP BY artists.id
    ORDER BY playcount DESC
    LIMIT ?
  `;
  db.all(query, [fromTimestamp, limit], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows.map(row => ({
      artistId: row.id,
      artist: row.name,
      image: row.image_url,
      playcount: row.playcount
    })));
  });
}

function getTopTracks({ limit = 5, period = "overall", artistId = null }, callback) {
  const fromTimestamp = getPeriodTimestamp(period);
  let query = `
    SELECT tracks.id AS trackId, tracks.name AS track, artists.name AS artist, albums.name AS album, COUNT(*) AS playcount
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN artists ON tracks.artist_id = artists.id
    LEFT JOIN albums ON tracks.album_id = albums.id
    WHERE plays.timestamp >= ?
  `;
  const params = [fromTimestamp];

  if (artistId) {
    query += ` AND tracks.artist_id = ?`;
    params.push(artistId);
  }

  query += `
    GROUP BY tracks.id
    ORDER BY playcount DESC
    LIMIT ?
  `;
  params.push(limit);

  db.all(query, params, (err, rows) => {
    if (err) return callback(err);
    callback(null, rows.map(row => ({
      trackId: row.trackId,
      track: row.track,
      artist: row.artist,
      album: row.album,
      playcount: row.playcount
    })));
  });
}

function getTopAlbums({ limit = 5, period = "overall", artistId = null }, callback) {
  const fromTimestamp = getPeriodTimestamp(period);
  let query = `
    SELECT albums.id AS albumId, albums.name AS album, artists.name AS artist, albums.image_url AS image, COUNT(*) AS playcount
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN albums ON tracks.album_id = albums.id
    JOIN artists ON albums.artist_id = artists.id
    WHERE plays.timestamp >= ?
  `;
  const params = [fromTimestamp];

  if (artistId) {
    query += ` AND albums.artist_id = ?`;
    params.push(artistId);
  }

  query += `
    GROUP BY albums.id
    ORDER BY playcount DESC
    LIMIT ?
  `;
  params.push(limit);

  db.all(query, params, (err, rows) => {
    if (err) return callback(err);
    callback(null, rows.map(row => ({
      albumId: row.albumId,
      album: row.album,
      artist: row.artist,
      image: row.image,
      playcount: row.playcount
    })));
  });
}

function getRecentTracks(limit = 5, callback) {
  const query = `
    SELECT plays.timestamp, tracks.name AS track, artists.name AS artist, albums.name AS album
    FROM plays
    JOIN tracks ON plays.track_id = tracks.id
    JOIN artists ON tracks.artist_id = artists.id
    LEFT JOIN albums ON tracks.album_id = albums.id
    ORDER BY plays.timestamp DESC
    LIMIT ?
  `;
  db.all(query, [limit], (err, rows) => {
    if (err) return callback(err);
    callback(null, rows.map(row => ({
      track: row.track,
      artist: row.artist,
      album: row.album,
      timestamp: row.timestamp
    })));
  });
}

function searchAll(query, callback) {
  const likeQuery = `%${query}%`;
  db.all(
    `SELECT id, name FROM artists WHERE name LIKE ? LIMIT 10`,
    [likeQuery],
    (err, artists) => {
      if (err) return callback(err);

      // Collect artist IDs for track/album search
      const artistIds = artists.map(a => a.id);

      // Tracks: match by name OR by artist_id
      let tracksQuery = `SELECT id, name FROM tracks WHERE name LIKE ?`;
      let tracksParams = [likeQuery];
      if (artistIds.length > 0) {
        tracksQuery += ` OR artist_id IN (${artistIds.map(() => '?').join(',')})`;
        tracksParams = [likeQuery, ...artistIds];
      }
      tracksQuery += ` LIMIT 10`;

      // Albums: match by name OR by artist_id
      let albumsQuery = `SELECT id, name FROM albums WHERE name LIKE ?`;
      let albumsParams = [likeQuery];
      if (artistIds.length > 0) {
        albumsQuery += ` OR artist_id IN (${artistIds.map(() => '?').join(',')})`;
        albumsParams = [likeQuery, ...artistIds];
      }
      albumsQuery += ` LIMIT 10`;

      db.all(tracksQuery, tracksParams, (err2, tracks) => {
        if (err2) return callback(err2);
        db.all(albumsQuery, albumsParams, (err3, albums) => {
          if (err3) return callback(err3);
          callback(null, { artists, tracks, albums });
        });
      });
    }
  );
}

module.exports = {
  getLastTimestamp,
  addPlaysDeduped,
  getUniqueCounts,
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getRecentTracks,
  searchAll,
};