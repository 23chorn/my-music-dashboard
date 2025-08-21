function getPeriodTimestamp(period) {
  const now = Math.floor(Date.now() / 1000);
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
      return 0;
  }
}

module.exports = { getPeriodTimestamp };