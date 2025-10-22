/**
 * Entity Details Queries
 * Handles detailed queries for specific artists, albums, and tracks
 */

import { getPool } from '../connection.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Get album details with tracks
 * @param {string} albumName - Album name to search for
 * @param {Function} callback - Callback function
 */
export async function getAlbumDetailsByName(albumName, callback) {
  logger.info(`getAlbumDetailsByName called for ${albumName}`);

  try {
    const albumResult = await pool().query(`
      SELECT
        al.id,
        al.name,
        al.image_url,
        al.release_date,
        (
          SELECT STRING_AGG(DISTINCT a.name, ', ')
          FROM track_albums ta
          JOIN track_artists tar ON ta.track_id = tar.track_id
          JOIN artists a ON tar.artist_id = a.id
          WHERE ta.album_id = al.id
        ) as artist_names,
        COUNT(DISTINCT p.id) as total_plays
      FROM albums al
      LEFT JOIN track_albums ta ON al.id = ta.album_id
      LEFT JOIN plays p ON ta.track_id = p.track_id
      WHERE LOWER(al.name) LIKE LOWER($1)
      GROUP BY al.id, al.name, al.image_url, al.release_date
      LIMIT 1
    `, [`%${albumName}%`]);

    if (albumResult.rows.length === 0) {
      return callback(null, { error: 'Album not found in listening history' });
    }

    const album = albumResult.rows[0];

    // Get tracks for this album
    const tracksResult = await pool().query(`
      SELECT
        t.id,
        t.name as track_name,
        ta.track_number,
        COUNT(p.id) as plays
      FROM track_albums ta
      JOIN tracks t ON ta.track_id = t.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE ta.album_id = $1
      GROUP BY t.id, t.name, ta.track_number
      ORDER BY ta.track_number
    `, [album.id]);

    const details = {
      albumId: parseInt(album.id),
      name: album.name,
      artist: album.artist_names,
      image: album.image_url,
      releaseDate: album.release_date,
      totalPlays: parseInt(album.total_plays) || 0,
      tracks: tracksResult.rows.map(row => ({
        trackId: parseInt(row.id),
        name: row.track_name,
        trackNumber: row.track_number,
        plays: parseInt(row.plays) || 0
      }))
    };

    logger.info(`getAlbumDetailsByName returned album details`);
    callback(null, details);
  } catch (err) {
    logger.error(`getAlbumDetailsByName DB error: ${err}`);
    callback(err);
  }
}

/**
 * Get track details and play history
 * @param {string} trackName - Track name to search for
 * @param {Function} callback - Callback function
 */
export async function getTrackDetailsByName(trackName, callback) {
  logger.info(`getTrackDetailsByName called for ${trackName}`);

  try {
    const result = await pool().query(`
      SELECT
        t.id,
        t.name as track_name,
        t.duration_ms,
        (
          SELECT STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC, a.name)
          FROM track_artists ta
          JOIN artists a ON ta.artist_id = a.id
          WHERE ta.track_id = t.id
        ) as artist_names,
        (
          SELECT al.name
          FROM track_albums tal
          JOIN albums al ON tal.album_id = al.id
          WHERE tal.track_id = t.id
          LIMIT 1
        ) as album_name,
        COUNT(p.id) as total_plays,
        MIN(p.played_at) as first_played,
        MAX(p.played_at) as last_played
      FROM tracks t
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE LOWER(t.name) LIKE LOWER($1)
      GROUP BY t.id, t.name, t.duration_ms
      ORDER BY total_plays DESC
      LIMIT 1
    `, [`%${trackName}%`]);

    if (result.rows.length === 0) {
      return callback(null, { error: 'Track not found in listening history' });
    }

    const track = result.rows[0];
    const details = {
      trackId: parseInt(track.id),
      name: track.track_name,
      artist: track.artist_names,
      album: track.album_name,
      durationMs: track.duration_ms,
      totalPlays: parseInt(track.total_plays) || 0,
      firstPlayed: track.first_played,
      lastPlayed: track.last_played
    };

    logger.info(`getTrackDetailsByName returned track details`);
    callback(null, details);
  } catch (err) {
    logger.error(`getTrackDetailsByName DB error: ${err}`);
    callback(err);
  }
}
