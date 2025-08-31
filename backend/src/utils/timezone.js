import logger from './logger.js';

// Get the configured timezone or default to Europe/London
const TIMEZONE = process.env.TZ || 'Europe/London';

logger.info(`Using timezone: ${TIMEZONE}`);

/**
 * Create a Date object with timezone awareness
 * @param {number|string|Date} input - Timestamp, date string, or Date object
 * @returns {Date} - Date object adjusted for the configured timezone
 */
export function createTimezoneAwareDate(input) {
  if (!input) return null;
  
  let date;
  if (typeof input === 'number') {
    // Assume Unix timestamp in seconds, convert to milliseconds
    date = new Date(input * 1000);
  } else {
    date = new Date(input);
  }
  
  return date;
}

/**
 * Format a date for database insertion with timezone awareness
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {Date} - Date object for PostgreSQL
 */
export function formatTimestampForDB(timestamp) {
  if (!timestamp) return null;
  
  const date = new Date(timestamp * 1000);
  logger.debug(`Converting timestamp ${timestamp} to date: ${date.toISOString()} (${date.toString()})`);
  return date;
}

/**
 * Get current timezone info
 * @returns {object} - Timezone information
 */
export function getTimezoneInfo() {
  const now = new Date();
  return {
    timezone: TIMEZONE,
    offset: now.getTimezoneOffset(),
    localTime: now.toString(),
    utcTime: now.toISOString()
  };
}