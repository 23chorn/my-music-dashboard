import pkg from 'pg';
const { Pool } = pkg;
import logger from '../utils/logger.js';

// Use the same pool from db.js
let pool;

export function initializeAlbumDatabase() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Get album info by albumId
export async function getAlbumInfo(albumId, callback) {
  logger.info(`getAlbumInfo called with albumId=${albumId}`);
  try {
    const result = await pool.query(
      `SELECT al.id, al.name, al.image_url, a.name AS artist, a.id AS artist_id
       FROM albums al
       JOIN album_artists aa ON al.id = aa.album_id
       JOIN artists a ON aa.artist_id = a.id
       WHERE al.id = $1`,
      [albumId]
    );
    const album = result.rows[0] || null;
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
    const result = await pool.query(
      `SELECT t.id, t.name AS track, COUNT(p.id) AS playcount
       FROM tracks t
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       LEFT JOIN plays p ON p.track_id = t.id
       WHERE al.id = $1
       GROUP BY t.id, t.name
       ORDER BY playcount DESC
       LIMIT $2`,
      [albumId, limit]
    );
    logger.info(`getAlbumTopTracks returned ${result.rows.length} tracks`);
    callback(null, result.rows.map(row => ({
      id: parseInt(row.id),
      track: row.track,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getAlbumTopTracks DB error: ${err}`);
    callback(err);
  }
}

export async function getAlbumRecentPlays(albumId, limit, callback) {
  logger.info(`getAlbumRecentPlays called with albumId=${albumId}, limit=${limit}`);
  try {
    const result = await pool.query(
      `SELECT EXTRACT(EPOCH FROM p.played_at) AS timestamp, t.name AS track, al.name AS album
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1
       ORDER BY p.played_at DESC
       LIMIT $2`,
      [albumId, limit]
    );
    const plays = result.rows;
    logger.info(`getAlbumRecentPlays returned ${plays.length} plays`);
    if (!plays || plays.length === 0) logger.warn(`No recent plays found for albumId=${albumId}`);
    callback(null, plays.map(row => ({
      timestamp: parseInt(row.timestamp),
      track: row.track,
      album: row.album
    })));
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
    const result = await pool.query(
      `SELECT EXTRACT(EPOCH FROM MIN(p.played_at)) AS first_play, 
              EXTRACT(EPOCH FROM MAX(p.played_at)) AS last_play
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1`,
      [albumId]
    );
    const row = result.rows[0];

    // Total streams for this album
    const totalResult = await pool.query(
      `SELECT COUNT(*) AS total_streams
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1`,
      [albumId]
    );
    const totalRow = totalResult.rows[0];

    // Top day
    const topDayResult = await pool.query(
      `SELECT DATE(p.played_at) AS day, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1
       GROUP BY DATE(p.played_at)
       ORDER BY count DESC
       LIMIT 1`,
      [albumId]
    );
    const topDayRow = topDayResult.rows[0];

    // Top year
    const topYearResult = await pool.query(
      `SELECT EXTRACT(YEAR FROM p.played_at) AS year, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1
       GROUP BY EXTRACT(YEAR FROM p.played_at)
       ORDER BY count DESC
       LIMIT 1`,
      [albumId]
    );
    const topYearRow = topYearResult.rows[0];

    // Rank among all albums
    const albumRanksResult = await pool.query(
      `SELECT al.id, al.name, COUNT(p.id) AS playcount
       FROM albums al
       LEFT JOIN track_albums ta ON al.id = ta.album_id
       LEFT JOIN tracks t ON ta.track_id = t.id
       LEFT JOIN plays p ON t.id = p.track_id
       GROUP BY al.id, al.name
       ORDER BY playcount DESC`
    );
    const albumRanks = albumRanksResult.rows;
    const rank = albumRanks.findIndex(a => parseInt(a.id) === parseInt(albumId)) + 1; // 1-based rank

    logger.info(`getAlbumStats succeeded for albumId=${albumId}`);
    callback(null, {
      first_play: parseInt(row.first_play),
      last_play: parseInt(row.last_play),
      total_streams: parseInt(totalRow.total_streams),
      top_day: topDayRow ? { day: topDayRow.day, count: parseInt(topDayRow.count) } : null,
      top_year: topYearRow ? { year: parseInt(topYearRow.year), count: parseInt(topYearRow.count) } : null,
      rank: rank > 0 ? rank : null,
      total_albums: albumRanks.length,
    });
  } catch (err) {
    logger.error(`getAlbumStats DB error: ${err}`);
    callback(err);
  }
}