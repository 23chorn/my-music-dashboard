import sqlite3 from 'sqlite3';
import util from 'util';
import path from 'path';
import logger from '../utils/logger.js';

// Get string path for sqlite3
const dbPath = path.resolve(path.dirname(import.meta.url.replace('file://', '')), '../../data/recentTracks.db');
const db = new sqlite3.Database(dbPath);

const dbGet = util.promisify(db.get).bind(db);
const dbAll = util.promisify(db.all).bind(db);

// Get album info by albumId
export function getAlbumInfo(albumId, callback) {
  logger.info(`getAlbumInfo called with albumId=${albumId}`);
  db.get(
    `SELECT albums.id, albums.name, albums.image_url, artists.name AS artist
     FROM albums
     JOIN artists ON albums.artist_id = artists.id
     WHERE albums.id = ?`,
    [albumId],
    (err, album) => {
      if (err) logger.error(`getAlbumInfo DB error: ${err}`);
      else logger.info(`getAlbumInfo returned: ${album ? 'found' : 'not found'}`);
      callback(err, album);
    }
  );
}

// Get top tracks for an album
export function getAlbumTopTracks(albumId, limit = 10, callback) {
  logger.info(`getAlbumTopTracks called with albumId=${albumId}, limit=${limit}`);
  dbAll(
    `SELECT tracks.id, tracks.name AS track, artists.name AS artist, COUNT(plays.id) AS playcount
     FROM tracks
     JOIN artists ON tracks.artist_id = artists.id
     LEFT JOIN plays ON plays.track_id = tracks.id
     WHERE tracks.album_id = ?
     GROUP BY tracks.id
     ORDER BY playcount DESC
     LIMIT ?`,
    [albumId, limit],
    (err, tracks) => {
      if (err) logger.error(`getAlbumTopTracks DB error: ${err}`);
      else logger.info(`getAlbumTopTracks returned ${tracks.length} tracks`);
      callback(err, tracks);
    }
  );
}

// Get recent plays for an album
export function getAlbumRecentPlays(albumId, limit = 10, callback) {
  logger.info(`getAlbumRecentPlays called with albumId=${albumId}, limit=${limit}`);
  dbAll(
    `SELECT plays.timestamp, tracks.name AS track, artists.name AS artist
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     JOIN artists ON tracks.artist_id = artists.id
     WHERE tracks.album_id = ?
     ORDER BY plays.timestamp DESC
     LIMIT ?`,
    [albumId, limit],
    (err, plays) => {
      if (err) logger.error(`getAlbumRecentPlays DB error: ${err}`);
      else logger.info(`getAlbumRecentPlays returned ${plays.length} plays`);
      callback(err, plays);
    }
  );
}

// Get album stats (total streams, first/last play, top day/year, rank)
export async function getAlbumStats(albumId, callback) {
  logger.info(`getAlbumStats called with albumId=${albumId}`);
  try {
    // First and most recent play
    const row = await dbGet(
      `SELECT MIN(plays.timestamp) AS first_play, MAX(plays.timestamp) AS last_play
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.album_id = ?`,
      [albumId]
    );

    // Total streams for this album
    const totalRow = await dbGet(
      `SELECT COUNT(*) AS total_streams
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.album_id = ?`,
      [albumId]
    );

    // Top day
    const topDayRow = await dbGet(
      `SELECT DATE(plays.timestamp, 'unixepoch') AS day, COUNT(*) AS count
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.album_id = ?
       GROUP BY day
       ORDER BY count DESC
       LIMIT 1`,
      [albumId]
    );

    // Top year
    const topYearRow = await dbGet(
      `SELECT strftime('%Y', plays.timestamp, 'unixepoch') AS year, COUNT(*) AS count
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.album_id = ?
       GROUP BY year
       ORDER BY count DESC
       LIMIT 1`,
      [albumId]
    );

    // Rank among all albums
    const albumRanks = await dbAll(
      `SELECT albums.id, albums.name, COUNT(plays.id) AS playcount
       FROM albums
       LEFT JOIN tracks ON tracks.album_id = albums.id
       LEFT JOIN plays ON plays.track_id = tracks.id
       GROUP BY albums.id
       ORDER BY playcount DESC`
    );
    const rank =
      albumRanks.findIndex(a => a.id === Number(albumId)) + 1; // 1-based rank

    logger.info(`getAlbumStats succeeded for albumId=${albumId}`);
    callback(null, {
      first_play: row.first_play,
      last_play: row.last_play,
      total_streams: totalRow.total_streams,
      top_day: topDayRow,
      top_year: topYearRow,
      rank: rank > 0 ? rank : null,
      total_albums: albumRanks.length,
    });
  } catch (err) {
    logger.error(`getAlbumStats DB error: ${err}`);
    callback(err);
  }
}