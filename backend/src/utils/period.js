import logger from '../utils/logger.js';

export function getPeriodTimestamp(period) {
  const now = Math.floor(Date.now() / 1000);
  logger.info(`getPeriodTimestamp called with period="${period}"`);
  switch (period) {
    case "7day":
      return now - 7 * 24 * 60 * 60;
    case "1month":
      return now - 30 * 24 * 60 * 60;
    case "3month":
      return now - 90 * 24 * 60 * 60;
    case "6month":
      return now - 180 * 24 * 60 * 60;
    case "12month":
      return now - 365 * 24 * 60 * 60;
    case "overall":
    default:
      return null;
  }
}

/**
 * Parse period string OR options object to get timestamps
 * Supports backward compatibility with both period codes and custom date ranges
 *
 * @param {string|Object} periodOrOptions - Period code string OR options object with period/startDate/endDate
 * @returns {Object} { period, startDate, endDate, fromTimestamp, toTimestamp }
 *
 * @example
 * // Old style (period string)
 * parsePeriodOrDateRange("1month")
 * // Returns: { period: "1month", startDate: null, endDate: null, fromTimestamp: <30 days ago>, toTimestamp: null }
 *
 * @example
 * // New style (options object with period)
 * parsePeriodOrDateRange({ period: "1month" })
 * // Returns: { period: "1month", startDate: null, endDate: null, fromTimestamp: <30 days ago>, toTimestamp: null }
 *
 * @example
 * // New style (options object with date range)
 * parsePeriodOrDateRange({ startDate: "2025-08-01", endDate: "2025-08-31" })
 * // Returns: { period: null, startDate: "2025-08-01", endDate: "2025-08-31", fromTimestamp: <Aug 1>, toTimestamp: <Aug 31> }
 */
export function parsePeriodOrDateRange(periodOrOptions = "overall") {
  let period = "overall";
  let startDate = null;
  let endDate = null;

  // Handle backward compatibility: string parameter (old style)
  if (typeof periodOrOptions === 'string') {
    period = periodOrOptions;
    logger.info(`parsePeriodOrDateRange: period string "${period}"`);
  }
  // New style: options object
  else if (typeof periodOrOptions === 'object' && periodOrOptions !== null) {
    period = periodOrOptions.period || "overall";
    startDate = periodOrOptions.startDate || null;
    endDate = periodOrOptions.endDate || null;
    logger.info(`parsePeriodOrDateRange: options object - period="${period}", dates=${startDate} to ${endDate}`);
  }

  let fromTimestamp = null;
  let toTimestamp = null;

  // Custom date range takes precedence over period
  if (startDate && endDate) {
    try {
      // Parse dates and convert to Unix timestamps (seconds)
      // Set start of day for startDate (00:00:00)
      const startDateObj = new Date(startDate + 'T00:00:00');
      fromTimestamp = Math.floor(startDateObj.getTime() / 1000);

      // Set end of day for endDate (23:59:59)
      const endDateObj = new Date(endDate + 'T23:59:59');
      toTimestamp = Math.floor(endDateObj.getTime() / 1000);

      logger.info(`Custom date range: ${startDate} (${fromTimestamp}) to ${endDate} (${toTimestamp})`);
    } catch (error) {
      logger.error(`Invalid date format: ${error.message}. Falling back to period.`);
      // Fall back to period if date parsing fails
      fromTimestamp = getPeriodTimestamp(period);
      toTimestamp = null;
    }
  }
  // Use period-based timestamp
  else if (period) {
    fromTimestamp = getPeriodTimestamp(period);
    toTimestamp = null; // No upper bound (current time)
    logger.info(`Period-based range: ${period} (from ${fromTimestamp})`);
  }

  return {
    period,
    startDate,
    endDate,
    fromTimestamp,
    toTimestamp
  };
}