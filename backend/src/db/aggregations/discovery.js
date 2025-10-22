/**
 * Discovery Queries
 * Handles music discovery statistics and recent discoveries
 */

import { getPool } from '../connection.js';
import { getPeriodTimestamp } from '../../utils/period.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Get discovery statistics for a period
 * @param {string} period - Time period (7d, 1m, 3m, 6m, 1y, all)
 * @param {Function} callback - Callback function
 */
export async function getDiscoveryStats(period = 'all', callback) {
  logger.info(`getDiscoveryStats called with period=${period}`);
  const fromTimestamp = getPeriodTimestamp(period);

  const params = [];
  let whereClause = '';
  if (fromTimestamp !== null) {
    whereClause = ' WHERE p.played_at >= to_timestamp($1)';
    params.push(fromTimestamp);
  }

  try {
    const result = await pool().query(`
      WITH first_plays AS (
        SELECT
          track_id,
          MIN(played_at) as first_played_at
        FROM plays
        GROUP BY track_id
      ),
      first_artist_plays AS (
        SELECT
          ta.artist_id,
          MIN(p.played_at) as first_played_at
        FROM plays p
        JOIN track_artists ta ON p.track_id = ta.track_id
        GROUP BY ta.artist_id
      ),
      first_album_plays AS (
        SELECT
          tal.album_id,
          MIN(p.played_at) as first_played_at
        FROM plays p
        JOIN track_albums tal ON p.track_id = tal.track_id
        WHERE tal.album_id IS NOT NULL
        GROUP BY tal.album_id
      )
      SELECT
        (SELECT COUNT(*) FROM first_plays fp ${whereClause.replace('p.played_at', 'fp.first_played_at')}) as new_tracks,
        (SELECT COUNT(*) FROM first_artist_plays fap ${whereClause.replace('p.played_at', 'fap.first_played_at')}) as new_artists,
        (SELECT COUNT(*) FROM first_album_plays falp ${whereClause.replace('p.played_at', 'falp.first_played_at')}) as new_albums,
        (SELECT COUNT(*) FROM plays p ${whereClause}) as total_plays
    `, params);

    const stats = {
      newTracks: parseInt(result.rows[0].new_tracks) || 0,
      newArtists: parseInt(result.rows[0].new_artists) || 0,
      newAlbums: parseInt(result.rows[0].new_albums) || 0,
      totalPlays: parseInt(result.rows[0].total_plays) || 0,
      discoveryRate: result.rows[0].total_plays > 0
        ? parseFloat((parseInt(result.rows[0].new_tracks) / parseInt(result.rows[0].total_plays) * 100).toFixed(1))
        : 0
    };

    logger.info(`getDiscoveryStats returned stats for period ${period}`);
    callback(null, stats);
  } catch (err) {
    logger.error(`getDiscoveryStats DB error: ${err}`);
    callback(err);
  }
}

/**
 * Get recently discovered music
 * @param {number} limit - Maximum number of discoveries to return
 * @param {Function} callback - Callback function
 */
export async function getRecentDiscoveries(limit = 10, callback) {
  logger.info(`getRecentDiscoveries called with limit=${limit}`);

  try {
    const result = await pool().query(`
      WITH first_plays AS (
        SELECT
          track_id,
          MIN(played_at) as first_played_at
        FROM plays
        GROUP BY track_id
      )
      SELECT
        t.id,
        t.name as track_name,
        (
          SELECT STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC, a.name)
          FROM track_artists ta
          JOIN artists a ON ta.artist_id = a.id
          WHERE ta.track_id = t.id
        ) as artist_names,
        fp.first_played_at,
        COUNT(p.id) as total_plays
      FROM first_plays fp
      JOIN tracks t ON fp.track_id = t.id
      JOIN plays p ON t.id = p.track_id
      GROUP BY t.id, t.name, fp.first_played_at
      ORDER BY fp.first_played_at DESC
      LIMIT $1
    `, [limit]);

    const discoveries = result.rows.map(row => ({
      trackId: parseInt(row.id),
      trackName: row.track_name,
      artistNames: row.artist_names,
      firstPlayedAt: row.first_played_at,
      totalPlays: parseInt(row.total_plays)
    }));

    logger.info(`getRecentDiscoveries returned ${discoveries.length} discoveries`);
    callback(null, discoveries);
  } catch (err) {
    logger.error(`getRecentDiscoveries DB error: ${err}`);
    callback(err);
  }
}
