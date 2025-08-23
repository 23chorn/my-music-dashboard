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
    `SELECT tracks.id, tracks.name, COUNT(*) AS playcount
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
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

module.exports = {
  getArtistInfo,
  getArtistTopTracks,
  getArtistTopAlbums,
  getArtistRecentPlays,
};