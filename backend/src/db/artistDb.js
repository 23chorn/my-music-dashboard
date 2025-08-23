const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(__dirname + '/../../data/recentTracks.db');

function getArtistInfo(artistId, callback) {
  db.get(
    `SELECT id, name, image_url FROM artists WHERE id = ?`,
    [artistId],
    callback
  );
}

function getArtistTopTracks(artistId, callback) {
  db.all(
    `SELECT tracks.id, tracks.name, albums.name AS album, COUNT(*) AS playcount
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     LEFT JOIN albums ON tracks.album_id = albums.id
     WHERE tracks.artist_id = ?
     GROUP BY tracks.id
     ORDER BY playcount DESC
     LIMIT 10`,
    [artistId],
    callback
  );
}

function getArtistTopAlbums(artistId, callback) {
  db.all(
    `SELECT albums.id, albums.name, COUNT(*) AS playcount
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     JOIN albums ON tracks.album_id = albums.id
     WHERE albums.artist_id = ?
     GROUP BY albums.id
     ORDER BY playcount DESC
     LIMIT 10`,
    [artistId],
    callback
  );
}

function getArtistRecentPlays(artistId, callback) {
  db.all(
    `SELECT plays.timestamp, tracks.name AS track, albums.name AS album
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     LEFT JOIN albums ON tracks.album_id = albums.id
     WHERE tracks.artist_id = ?
     ORDER BY plays.timestamp DESC
     LIMIT 10`,
    [artistId],
    callback
  );
}

function getArtistStats(artistId, callback) {
  // First and most recent play
  db.get(
    `SELECT MIN(plays.timestamp) AS first_play, MAX(plays.timestamp) AS last_play
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     WHERE tracks.artist_id = ?`,
    [artistId],
    (err, row) => {
      if (err) return callback(err);

      // Top day
      db.get(
        `SELECT DATE(plays.timestamp, 'unixepoch') AS day, COUNT(*) AS count
         FROM plays
         JOIN tracks ON plays.track_id = tracks.id
         WHERE tracks.artist_id = ?
         GROUP BY day
         ORDER BY count DESC
         LIMIT 1`,
        [artistId],
        (err2, topDayRow) => {
          if (err2) return callback(err2);

          // Top month
          db.get(
            `SELECT strftime('%Y-%m', plays.timestamp, 'unixepoch') AS month, COUNT(*) AS count
             FROM plays
             JOIN tracks ON plays.track_id = tracks.id
             WHERE tracks.artist_id = ?
             GROUP BY month
             ORDER BY count DESC
             LIMIT 1`,
            [artistId],
            (err3, topMonthRow) => {
              if (err3) return callback(err3);

              // Top year
              db.get(
                `SELECT strftime('%Y', plays.timestamp, 'unixepoch') AS year, COUNT(*) AS count
                 FROM plays
                 JOIN tracks ON plays.track_id = tracks.id
                 WHERE tracks.artist_id = ?
                 GROUP BY year
                 ORDER BY count DESC
                 LIMIT 1`,
                [artistId],
                (err4, topYearRow) => {
                  if (err4) return callback(err4);

                  callback(null, {
                    first_play: row.first_play,
                    last_play: row.last_play,
                    top_day: topDayRow,
                    top_month: topMonthRow,
                    top_year: topYearRow,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
}

module.exports = {
  getArtistInfo,
  getArtistTopTracks,
  getArtistTopAlbums,
  getArtistRecentPlays,
  getArtistStats,
};