import logger from './logger.js';

// Get the configured timezone or default to Europe/London
const TIMEZONE = process.env.TZ || 'Europe/London';

logger.info(`Using timezone: ${TIMEZONE}`);


/**
 * Format a date for database insertion with timezone awareness
 * @param {number|Date|string} input - Unix timestamp in seconds, Date object, or date string
 * @returns {Date} - Date object for PostgreSQL
 */
export function formatTimestampForDB(input) {
  if (!input) {
    logger.warn('formatTimestampForDB received null/undefined input');
    return null;
  }
  
  let date;
  
  if (input instanceof Date) {
    date = input;
  } else if (typeof input === 'number') {
    // Validate timestamp range
    if (input <= 0) {
      logger.warn(`formatTimestampForDB received invalid timestamp: ${input}`);
      return null;
    }
    
    // Check if it looks like milliseconds (> year 2001 in seconds)
    const threshold = 1000000000; // ~September 2001
    if (input > threshold && input < threshold * 1000) {
      // Looks like seconds, convert to milliseconds
      date = new Date(input * 1000);
    } else if (input >= threshold * 1000) {
      // Looks like milliseconds
      date = new Date(input);
    } else {
      logger.warn(`formatTimestampForDB received suspicious timestamp: ${input}`);
      return null;
    }
  } else if (typeof input === 'string') {
    date = new Date(input);
  } else {
    logger.warn(`formatTimestampForDB received unsupported input type: ${typeof input}`);
    return null;
  }
  
  // Validate the resulting date
  if (isNaN(date.getTime())) {
    logger.warn(`formatTimestampForDB resulted in invalid date from input: ${input}`);
    return null;
  }
  
  // Check if date is reasonable (between 1990 and future)
  const minYear = new Date('1990-01-01').getTime();
  const maxYear = new Date().getTime() + (365 * 24 * 60 * 60 * 1000); // 1 year from now
  
  if (date.getTime() < minYear || date.getTime() > maxYear) {
    logger.warn(`formatTimestampForDB received date outside reasonable range: ${date.toISOString()} from input: ${input}`);
    return null;
  }
  
  logger.debug(`Converting input ${input} to date: ${date.toISOString()}`);
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