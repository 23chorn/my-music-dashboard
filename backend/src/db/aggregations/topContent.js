/**
 * Top Content Queries
 * Handles queries for top artists, tracks, and albums
 * Consolidated from db/topQueries.js
 */

import { getPool } from '../connection.js';
import { getPeriodTimestamp, parsePeriodOrDateRange } from '../../utils/period.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Get top artists for a period or custom date range
 * @param {number} limit - Maximum number of artists to return
 * @param {string|Object} periodOrOptions - Period code (e.g., "1month") OR options object { period, startDate, endDate }
 * @param {Function} callback - Callback function
 *
 * @example
 * // Old style (backward compatible)
 * getTopArtists(10, "1month", callback)
 *
 * @example
 * // New style with period
 * getTopArtists(10, { period: "1month" }, callback)
 *
 * @example
 * // New style with date range
 * getTopArtists(10, { startDate: "2025-08-01", endDate: "2025-08-31" }, callback)
 */
export async function getTopArtists(limit, periodOrOptions = "overall", callback) {
  // Parse period or date range (backward compatible)
  const { period, startDate, endDate, fromTimestamp, toTimestamp } = parsePeriodOrDateRange(periodOrOptions);

  logger.info(`getTopArtists called with limit=${limit}, period=${period}, dates=${startDate} to ${endDate}`);

  let query = `
    SELECT
      a.id,
      a.name,
      a.image_url,
      COUNT(DISTINCT p.id) as playcount
    FROM artists a
    JOIN track_artists ta ON a.id = ta.artist_id
    JOIN plays p ON ta.track_id = p.track_id
  `;

  const params = [limit];
  const conditions = [];

  // Add date range conditions
  if (fromTimestamp !== null) {
    params.push(fromTimestamp);
    conditions.push(`p.played_at >= to_timestamp($${params.length})`);
  }

  if (toTimestamp !== null) {
    params.push(toTimestamp);
    conditions.push(`p.played_at <= to_timestamp($${params.length})`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(' AND ');
  }

  query += `
    GROUP BY a.id, a.name, a.image_url
    ORDER BY playcount DESC
    LIMIT $1
  `;

  try {
    const result = await pool().query(query, params);
    const artists = result.rows.map(row => ({
      artistId: parseInt(row.id),
      artist: row.name,
      image: row.image_url,
      playcount: parseInt(row.playcount)
    }));

    logger.info(`getTopArtists returned ${artists.length} artists`);
    callback(null, artists);
  } catch (err) {
    logger.error(`getTopArtists DB error: ${err}`);
    callback(err);
  }
}

/**
 * Get top tracks for a period or custom date range
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of tracks to return
 * @param {string} options.period - Time period (7day, 1month, 3month, etc.)
 * @param {string} options.startDate - Optional: Start date in YYYY-MM-DD format
 * @param {string} options.endDate - Optional: End date in YYYY-MM-DD format
 * @param {number|null} options.artistId - Optional artist filter
 * @param {number|null} options.albumId - Optional album filter
 * @param {Function} callback - Callback function
 *
 * @example
 * // Period-based query
 * getTopTracks({ limit: 10, period: "1month" }, callback)
 *
 * @example
 * // Custom date range query
 * getTopTracks({ limit: 10, startDate: "2025-08-01", endDate: "2025-08-31" }, callback)
 */
export async function getTopTracks({
  limit,
  period = "overall",
  startDate = null,
  endDate = null,
  artistId = null,
  albumId = null
}, callback) {
  // Parse period or date range
  const { fromTimestamp, toTimestamp } = parsePeriodOrDateRange(
    startDate && endDate ? { startDate, endDate } : period
  );

  logger.info(`getTopTracks called with limit=${limit}, period=${period}, dates=${startDate} to ${endDate}, artistId=${artistId}, albumId=${albumId}`);

  let query = `
    WITH album_track_counts AS (
      SELECT album_id, COUNT(*) AS track_count
      FROM track_albums
      GROUP BY album_id
    ),
    ranked_albums AS (
      SELECT
        t.id as track_id,
        tal.album_id,
        al.name as album_name,
        al.image_url as album_image,
        al.release_date,
        ROW_NUMBER() OVER (
          PARTITION BY t.id
          ORDER BY
            COALESCE(atc.track_count, 0) DESC,  -- prefer the album over a single/EP
            al.release_date DESC NULLS LAST,
            al.id DESC
        ) as album_rank
      FROM tracks t
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      LEFT JOIN album_track_counts atc ON tal.album_id = atc.album_id
    )
    SELECT
      t.id,
      t.name as track_name,
      (
        SELECT STRING_AGG(name, ', ' ORDER BY is_primary DESC, name)
        FROM (
          SELECT DISTINCT a2.name, ta2.is_primary
          FROM track_artists ta2
          JOIN artists a2 ON ta2.artist_id = a2.id
          WHERE ta2.track_id = t.id
        ) artist_data
      ) as artist_names,
      ra.album_id,
      ra.album_name,
      ra.album_image,
      COUNT(DISTINCT p.id) as playcount
    FROM tracks t
    JOIN track_artists ta ON t.id = ta.track_id
    JOIN artists a ON ta.artist_id = a.id
    JOIN plays p ON t.id = p.track_id
    LEFT JOIN ranked_albums ra ON t.id = ra.track_id AND ra.album_rank = 1
  `;

  const conditions = [];
  const params = [];
  let paramCount = 0;

  // Add date range conditions
  if (fromTimestamp !== null) {
    paramCount++;
    conditions.push(`p.played_at >= to_timestamp($${paramCount})`);
    params.push(fromTimestamp);
  }

  if (toTimestamp !== null) {
    paramCount++;
    conditions.push(`p.played_at <= to_timestamp($${paramCount})`);
    params.push(toTimestamp);
  }

  if (artistId !== null) {
    paramCount++;
    conditions.push(`ta.artist_id = $${paramCount}`);
    params.push(artistId);
  }

  if (albumId !== null) {
    paramCount++;
    conditions.push(`ra.album_id = $${paramCount}`);
    params.push(albumId);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += `
    GROUP BY t.id, t.name, ra.album_id, ra.album_name, ra.album_image
    ORDER BY playcount DESC
    LIMIT $${paramCount + 1}
  `;
  params.push(limit);

  try {
    const result = await pool().query(query, params);
    const tracks = result.rows.map(row => ({
      id: parseInt(row.id),
      track: row.track_name,
      artist: row.artist_names,
      albumId: row.album_id ? parseInt(row.album_id) : null,
      album: row.album_name,
      albumImage: row.album_image,
      playcount: parseInt(row.playcount)
    }));

    logger.info(`getTopTracks returned ${tracks.length} tracks`);
    callback(null, tracks);
  } catch (err) {
    logger.error(`getTopTracks DB error: ${err}`);
    callback(err);
  }
}

/**
 * Get top albums for a period or custom date range
 * @param {Object} options - Query options
 * @param {number} options.limit - Maximum number of albums to return
 * @param {string} options.period - Time period (7day, 1month, 3month, etc.)
 * @param {string} options.startDate - Optional: Start date in YYYY-MM-DD format
 * @param {string} options.endDate - Optional: End date in YYYY-MM-DD format
 * @param {number|null} options.artistId - Optional artist filter
 * @param {Function} callback - Callback function
 *
 * @example
 * // Period-based query
 * getTopAlbums({ limit: 10, period: "1month" }, callback)
 *
 * @example
 * // Custom date range query
 * getTopAlbums({ limit: 10, startDate: "2025-08-01", endDate: "2025-08-31" }, callback)
 */
export async function getTopAlbums({
  limit,
  period = "overall",
  startDate = null,
  endDate = null,
  artistId = null
}, callback) {
  // Parse period or date range
  const { fromTimestamp, toTimestamp } = parsePeriodOrDateRange(
    startDate && endDate ? { startDate, endDate } : period
  );

  logger.info(`getTopAlbums called with limit=${limit}, period=${period}, dates=${startDate} to ${endDate}, artistId=${artistId}`);

  let query = `
    SELECT
      al.id,
      al.name as album_name,
      STRING_AGG(DISTINCT a.name, ', ' ORDER BY a.name) as artist_name,
      al.image_url,
      COUNT(DISTINCT p.id) as playcount
    FROM albums al
    LEFT JOIN album_artists aa ON al.id = aa.album_id
    LEFT JOIN artists a ON aa.artist_id = a.id
    JOIN track_albums tal ON al.id = tal.album_id
    JOIN plays p ON tal.track_id = p.track_id
  `;

  const conditions = [];
  const params = [];
  let paramCount = 0;

  // Add date range conditions
  if (fromTimestamp !== null) {
    paramCount++;
    conditions.push(`p.played_at >= to_timestamp($${paramCount})`);
    params.push(fromTimestamp);
  }

  if (toTimestamp !== null) {
    paramCount++;
    conditions.push(`p.played_at <= to_timestamp($${paramCount})`);
    params.push(toTimestamp);
  }

  if (artistId !== null) {
    paramCount++;
    conditions.push(`a.id = $${paramCount}`);
    params.push(artistId);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += `
    GROUP BY al.id, al.name, al.image_url
    ORDER BY playcount DESC
    LIMIT $${paramCount + 1}
  `;
  params.push(limit);

  try {
    const result = await pool().query(query, params);
    const albums = result.rows.map(row => ({
      albumId: parseInt(row.id),
      album: row.album_name,
      artist: row.artist_name,
      image: row.image_url,
      playcount: parseInt(row.playcount)
    }));

    logger.info(`getTopAlbums returned ${albums.length} albums`);
    callback(null, albums);
  } catch (err) {
    logger.error(`getTopAlbums DB error: ${err}`);
    callback(err);
  }
}

/**
 * Get top tracks for playlist creation (simplified version without album info)
 * @param {number} limit - Maximum number of tracks to return
 * @param {string} period - Time period (7d, 1m, 3m, 6m, 1y, all)
 * @returns {Promise<Array>} Array of top tracks
 */
export async function getTopTracksForPlaylist(limit, period = "overall") {
  logger.info(`getTopTracksForPlaylist called with limit=${limit}, period=${period}`);
  const fromTimestamp = getPeriodTimestamp(period);

  let query = `
    SELECT t.id, t.name as track, a.name as artist, COUNT(DISTINCT p.id) as playcount
    FROM tracks t
    JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
    JOIN artists a ON ta.artist_id = a.id
    JOIN plays p ON t.id = p.track_id
  `;

  const params = [limit];

  if (fromTimestamp !== null) {
    query += ` WHERE p.played_at >= to_timestamp($2)`;
    params.push(fromTimestamp);
  }

  query += `
    GROUP BY t.id, t.name, a.name
    ORDER BY playcount DESC
    LIMIT $1
  `;

  try {
    const result = await pool().query(query, params);
    const tracks = result.rows.map(row => ({
      id: parseInt(row.id),
      track: row.track,
      artist: row.artist,
      playcount: parseInt(row.playcount)
    }));

    logger.info(`getTopTracksForPlaylist returned ${tracks.length} tracks`);
    return tracks;
  } catch (err) {
    logger.error(`getTopTracksForPlaylist DB error: ${err}`);
    throw err;
  }
}
