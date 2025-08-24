import sqlite3 from 'sqlite3';
import path from 'path';
import { getPeriodTimestamp } from '../utils/period.js';
import logger from '../utils/logger.js';

const dbPath = path.resolve(path.dirname(import.meta.url.replace('file://', '')), '../../data/recentTracks.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  logger.info('Initializing database and tables...');
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
  logger.info('Database tables initialized.');
});

export function getLastTimestamp(callback) {
  logger.info('getLastTimestamp called');
  db.get(
    `SELECT MAX(timestamp) AS lastTimestamp FROM plays`,
    (err, row) => {
      if (err) logger.error(`getLastTimestamp DB error: ${err}`);
      else logger.info(`getLastTimestamp returned: ${row.lastTimestamp}`);
      callback(err, row.lastTimestamp);
    }
  );
}

export function addPlaysDeduped(plays, callback) {
  logger.info(`addPlaysDeduped called with ${plays.length} plays`);
  db.serialize(() => {
    let inserted = 0;
    let errors = [];
    let pending = plays.length;

    if (pending === 0) {
      logger.info('No plays to insert.');
      return callback(null, 0);
    }

    plays.forEach(play => {
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

export function getUniqueCounts(callback) {
  logger.info('getUniqueCounts called');
  db.serialize(() => {
    db.get(
      `SELECT COUNT(DISTINCT tracks.artist_id) AS uniqueArtistCount
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id`,
      (err, artistRow) => {
        db.get(
          `SELECT COUNT(DISTINCT tracks.id || '|' || tracks.artist_id || '|' || tracks.album_id) AS uniqueTrackCount
           FROM plays
           JOIN tracks ON plays.track_id = tracks.id`,
          (err2, trackRow) => {
            db.get(
              `SELECT COUNT(DISTINCT tracks.album_id) AS uniqueAlbumCount
               FROM plays
               JOIN tracks ON plays.track_id = tracks.id`,
              (err3, albumRow) => {
                db.get(
                  `SELECT COUNT(*) AS playCount FROM plays`,
                  (err4, playRow) => {
                    if (err || err2 || err3 || err4) logger.error(`getUniqueCounts DB error: ${err || err2 || err3 || err4}`);
                    else logger.info('getUniqueCounts returned counts');
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

export function getTopArtists(limit = 5, period = "overall", callback) {
  logger.info(`getTopArtists called with limit=${limit}, period=${period}`);
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
    if (err) logger.error(`getTopArtists DB error: ${err}`);
    else logger.info(`getTopArtists returned ${rows.length} artists`);
    callback(err, rows.map(row => ({
      artistId: row.id,
      artist: row.name,
      image: row.image_url,
      playcount: row.playcount
    })));
  });
}

export function getTopTracks({ limit = 5, period = "overall", artistId = null }, callback) {
  logger.info(`getTopTracks called with limit=${limit}, period=${period}, artistId=${artistId}`);
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
    if (err) logger.error(`getTopTracks DB error: ${err}`);
    else logger.info(`getTopTracks returned ${rows.length} tracks`);
    callback(err, rows.map(row => ({
      trackId: row.trackId,
      track: row.track,
      artist: row.artist,
      album: row.album,
      playcount: row.playcount
    })));
  });
}

export function getTopAlbums({ limit = 5, period = "overall", artistId = null }, callback) {
  logger.info(`getTopAlbums called with limit=${limit}, period=${period}, artistId=${artistId}`);
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
    if (err) logger.error(`getTopAlbums DB error: ${err}`);
    else logger.info(`getTopAlbums returned ${rows.length} albums`);
    callback(err, rows.map(row => ({
      albumId: row.albumId,
      album: row.album,
      artist: row.artist,
      image: row.image,
      playcount: row.playcount
    })));
  });
}

export function getRecentTracks(limit = 5, callback) {
  logger.info(`getRecentTracks called with limit=${limit}`);
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
    if (err) logger.error(`getRecentTracks DB error: ${err}`);
    else logger.info(`getRecentTracks returned ${rows.length} tracks`);
    callback(err, rows.map(row => ({
      track: row.track,
      artist: row.artist,
      album: row.album,
      timestamp: row.timestamp
    })));
  });
}

export function searchAll(query, callback) {
  logger.info(`searchAll called with query="${query}"`);
  const likeQuery = `%${query}%`;
  db.all(
    `SELECT id, name FROM artists WHERE name LIKE ? LIMIT 10`,
    [likeQuery],
    (err, artists) => {
      if (err) {
        logger.error(`searchAll DB error (artists): ${err}`);
        return callback(err);
      }

      const artistIds = artists.map(a => a.id);

      let tracksQuery = `SELECT id, name FROM tracks WHERE name LIKE ?`;
      let tracksParams = [likeQuery];
      if (artistIds.length > 0) {
        tracksQuery += ` OR artist_id IN (${artistIds.map(() => '?').join(',')})`;
        tracksParams = [likeQuery, ...artistIds];
      }
      tracksQuery += ` LIMIT 10`;

      let albumsQuery = `SELECT id, name FROM albums WHERE name LIKE ?`;
      let albumsParams = [likeQuery];
      if (artistIds.length > 0) {
        albumsQuery += ` OR artist_id IN (${artistIds.map(() => '?').join(',')})`;
        albumsParams = [likeQuery, ...artistIds];
      }
      albumsQuery += ` LIMIT 10`;

      db.all(tracksQuery, tracksParams, (err2, tracks) => {
        if (err2) {
          logger.error(`searchAll DB error (tracks): ${err2}`);
          return callback(err2);
        }
        db.all(albumsQuery, albumsParams, (err3, albums) => {
          if (err3) {
            logger.error(`searchAll DB error (albums): ${err3}`);
            return callback(err3);
          }
          logger.info(`searchAll returned ${artists.length} artists, ${tracks.length} tracks, ${albums.length} albums`);
          callback(null, { artists, tracks, albums });
        });
      });
    }
  );
}