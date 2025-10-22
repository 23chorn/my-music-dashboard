/**
 * Genre Queries
 * Handles genre-related database queries
 */

import { getPool } from '../connection.js';
import { getPeriodTimestamp } from '../../utils/period.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Get genre breakdown and distribution for a period
 * @param {string} period - Time period (7d, 1m, 3m, 6m, 1y, all)
 * @param {Function} callback - Callback function
 */
export async function getGenreBreakdown(period = 'all', callback) {
  logger.info(`getGenreBreakdown called with period=${period}`);
  const fromTimestamp = getPeriodTimestamp(period);

  let query = `
    WITH period_plays AS (
      SELECT p.id, p.track_id
      FROM plays p
  `;

  const params = [];
  if (fromTimestamp !== null) {
    query += ` WHERE p.played_at >= to_timestamp($1)`;
    params.push(fromTimestamp);
  }

  query += `
    )
    SELECT
      g.name as genre_name,
      COUNT(DISTINCT pp.id) as play_count,
      ROUND(COUNT(DISTINCT pp.id) * 100.0 / NULLIF((SELECT COUNT(*) FROM period_plays), 0), 1) as percentage
    FROM period_plays pp
    JOIN track_artists ta ON pp.track_id = ta.track_id
    JOIN artist_genres ag ON ta.artist_id = ag.artist_id
    JOIN genres g ON ag.genre_id = g.id
    GROUP BY g.name
    ORDER BY play_count DESC
    LIMIT 20
  `;

  try {
    const result = await pool().query(query, params);
    const genres = result.rows.map(row => ({
      name: row.genre_name,
      plays: parseInt(row.play_count),
      percentage: parseFloat(row.percentage) || 0
    }));

    logger.info(`getGenreBreakdown returned ${genres.length} genres`);
    callback(null, genres);
  } catch (err) {
    logger.error(`getGenreBreakdown DB error: ${err}`);
    callback(err);
  }
}
