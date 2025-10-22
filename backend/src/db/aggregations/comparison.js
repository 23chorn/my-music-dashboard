/**
 * Comparison Queries
 * Handles comparison operations between artists, albums, tracks, etc.
 */

import { getPool } from '../connection.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Compare two artists
 * @param {string} artist1Name - First artist name
 * @param {string} artist2Name - Second artist name
 * @param {Function} callback - Callback function
 */
export async function compareArtists(artist1Name, artist2Name, callback) {
  logger.info(`compareArtists called for ${artist1Name} vs ${artist2Name}`);

  try {
    const result = await pool().query(`
      WITH artist_stats AS (
        SELECT
          a.id,
          a.name,
          COUNT(DISTINCT p.id) as play_count,
          COUNT(DISTINCT p.track_id) as unique_tracks,
          MIN(p.played_at) as first_played,
          MAX(p.played_at) as last_played
        FROM artists a
        JOIN track_artists ta ON a.id = ta.artist_id
        JOIN plays p ON ta.track_id = p.track_id
        WHERE LOWER(a.name) = LOWER($1) OR LOWER(a.name) = LOWER($2)
        GROUP BY a.id, a.name
      )
      SELECT * FROM artist_stats
    `, [artist1Name, artist2Name]);

    if (result.rows.length === 0) {
      return callback(null, { error: 'Neither artist found in listening history' });
    }

    const comparison = result.rows.map(row => ({
      name: row.name,
      plays: parseInt(row.play_count),
      uniqueTracks: parseInt(row.unique_tracks),
      firstPlayed: row.first_played,
      lastPlayed: row.last_played
    }));

    logger.info(`compareArtists returned comparison`);
    callback(null, comparison);
  } catch (err) {
    logger.error(`compareArtists DB error: ${err}`);
    callback(err);
  }
}
