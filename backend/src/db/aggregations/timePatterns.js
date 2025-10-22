/**
 * Time Patterns Queries
 * Handles listening time pattern analysis (peak hours, days, etc.)
 */

import { getPool } from '../connection.js';
import logger from '../../utils/logger.js';

const pool = () => getPool();

/**
 * Get listening time patterns (peak hours, days, sessions)
 * @param {Function} callback - Callback function
 */
export async function getListeningTimePatterns(callback) {
  logger.info('getListeningTimePatterns called');

  try {
    // Get hourly distribution
    const hourlyResult = await pool().query(`
      SELECT
        EXTRACT(HOUR FROM played_at) as hour,
        COUNT(*) as play_count
      FROM plays
      GROUP BY hour
      ORDER BY play_count DESC
    `);

    // Get daily distribution (day of week)
    const dailyResult = await pool().query(`
      SELECT
        EXTRACT(DOW FROM played_at) as dow,
        COUNT(*) as play_count
      FROM plays
      GROUP BY dow
      ORDER BY play_count DESC
    `);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const patterns = {
      peakHours: hourlyResult.rows.slice(0, 3).map(row => ({
        hour: parseInt(row.hour),
        hourFormatted: formatHour(parseInt(row.hour)),
        plays: parseInt(row.play_count)
      })),
      hourlyDistribution: hourlyResult.rows.map(row => ({
        hour: parseInt(row.hour),
        plays: parseInt(row.play_count)
      })),
      peakDays: dailyResult.rows.slice(0, 3).map(row => ({
        dayIndex: parseInt(row.dow),
        dayName: dayNames[parseInt(row.dow)],
        plays: parseInt(row.play_count)
      })),
      dailyDistribution: dailyResult.rows.map(row => ({
        dayIndex: parseInt(row.dow),
        dayName: dayNames[parseInt(row.dow)],
        plays: parseInt(row.play_count)
      }))
    };

    logger.info('getListeningTimePatterns returned patterns');
    callback(null, patterns);
  } catch (err) {
    logger.error(`getListeningTimePatterns DB error: ${err}`);
    callback(err);
  }
}

/**
 * Helper function to format hour (24h to 12h AM/PM)
 * @param {number} hour - Hour in 24h format (0-23)
 * @returns {string} Formatted hour (e.g., "8PM", "11AM")
 */
function formatHour(hour) {
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${hour12}${ampm}`;
}
