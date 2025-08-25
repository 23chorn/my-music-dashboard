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
export async function getAlbumInfo(albumId, callback) {
  logger.info(`getAlbumInfo called with albumId=${albumId}`);
  try {
    const album = await dbGet(
      `SELECT albums.id, albums.name, albums.image_url, artists.name AS artist
       FROM albums
       JOIN artists ON albums.artist_id = artists.id
       WHERE albums.id = ?`,
      [albumId]
    );
    logger.info(`getAlbumInfo returned: ${album ? 'found' : 'not found'}`);
    callback(null, album);
  } catch (err) {
    logger.error(`getAlbumInfo DB error: ${err}`);
    callback(err);
  }
}

// Get top tracks for an album
export async function getAlbumTopTracks(albumId, limit, callback) {
  logger.info(`getAlbumTopTracks called with albumId=${albumId}, limit=${limit}`);
  try {
    const tracks = await dbAll(
      `SELECT tracks.id, tracks.name AS track, artists.name AS artist, COUNT(plays.id) AS playcount
       FROM tracks
       JOIN artists ON tracks.artist_id = artists.id
       LEFT JOIN plays ON plays.track_id = tracks.id
       WHERE tracks.album_id = ?
       GROUP BY tracks.id
       ORDER BY playcount DESC
       LIMIT ?`,
      [albumId, limit]
    );
    logger.info(`getAlbumTopTracks returned ${tracks.length} tracks`);
    callback(null, tracks);
  } catch (err) {
    logger.error(`getAlbumTopTracks DB error: ${err}`);
    callback(err);
  }
}

export async function getAlbumRecentPlays(albumId, limit, callback) {
  logger.info(`getAlbumRecentPlays called with albumId=${albumId}, limit=${limit}`);
  try {
    const plays = await dbAll(
      `SELECT plays.timestamp, tracks.name AS track, artists.name AS artist, albums.name AS album
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       LEFT JOIN artists ON tracks.artist_id = artists.id
       LEFT JOIN albums ON tracks.album_id = albums.id
       WHERE tracks.album_id = ?
       ORDER BY plays.timestamp DESC
       LIMIT ?`,
      [albumId, limit]
    );
    logger.info(`getAlbumRecentPlays callback called for albumId=${albumId}, plays=${JSON.stringify(plays)}`);
    logger.info(`getAlbumRecentPlays returned ${plays.length} plays`);
    logger.info(`getAlbumRecentPlays raw result: ${JSON.stringify(plays)}`);
    if (!plays || plays.length === 0) logger.warn(`No recent plays found for albumId=${albumId}`);
    callback(null, plays);
  } catch (err) {
    logger.error(`getAlbumRecentPlays DB error: ${err}`);
    callback(err);
  }
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