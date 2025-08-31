import pkg from 'pg';
const { Pool } = pkg;
import logger from '../utils/logger.js';

// Use the same pool from db.js
let pool;

export function initializeArtistDatabase() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

export async function getArtistInfo(artistId, callback) {
  logger.info(`getArtistInfo called with artistId=${artistId}`);
  try {
    const result = await pool.query(
      `SELECT id, name, image_url FROM artists WHERE id = $1`,
      [artistId]
    );
    const artist = result.rows[0] || null;
    logger.info(`getArtistInfo returned: ${artist ? 'found' : 'not found'}`);
    callback(null, artist);
  } catch (err) {
    logger.error(`getArtistInfo DB error: ${err}`);
    callback(err);
  }
}

export async function getArtistRecentPlays(artistId, limit, callback) {
  logger.info(`getArtistRecentPlays called with artistId=${artistId}, limit=${limit}`);
  try {
    const result = await pool.query(
      `SELECT EXTRACT(EPOCH FROM p.played_at) AS timestamp, t.name AS track, al.name AS album, a.name AS artist
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       LEFT JOIN track_albums tal ON t.id = tal.track_id
       LEFT JOIN albums al ON tal.album_id = al.id
       WHERE a.id = $1
       ORDER BY p.played_at DESC
       LIMIT $2`,
      [artistId, limit]
    );
    logger.info(`getArtistRecentPlays returned ${result.rows.length} plays`);
    callback(null, result.rows);
  } catch (err) {
    logger.error(`getArtistRecentPlays DB error: ${err}`);
    callback(err);
  }
}

export async function getArtistMilestones(artistId, callback) {
  logger.info(`getArtistMilestones called with artistId=${artistId}`);
  const milestones = [1, 100, 500, 1000, 5000];
  try {
    const result = await pool.query(
      `SELECT EXTRACT(EPOCH FROM p.played_at) AS timestamp, t.name AS track, al.name AS album
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       LEFT JOIN track_albums tal ON t.id = tal.track_id
       LEFT JOIN albums al ON tal.album_id = al.id
       WHERE a.id = $1
       ORDER BY p.played_at ASC`,
      [artistId]
    );
    const allPlays = result.rows;
    logger.info(`getArtistMilestones returned ${allPlays.length} plays`);
    const milestonePlays = milestones
      .map(n => {
        const play = allPlays[n - 1];
        if (!play) return null;
        return { milestone: n, ...play };
      })
      .filter(Boolean);
    callback(null, milestonePlays);
  } catch (err) {
    logger.error(`getArtistMilestones DB error: ${err}`);
    callback(err);
  }
}

export async function getArtistStats(artistId, callback) {
  logger.info(`getArtistStats called with artistId=${artistId}`);
  try {
    // First and most recent play
    const result = await pool.query(
      `SELECT EXTRACT(EPOCH FROM MIN(p.played_at)) AS first_play, 
              EXTRACT(EPOCH FROM MAX(p.played_at)) AS last_play
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       WHERE a.id = $1`,
      [artistId]
    );
    const row = result.rows[0];

    // Total streams for this artist
    const totalResult = await pool.query(
      `SELECT COUNT(*) AS total_streams
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       WHERE a.id = $1`,
      [artistId]
    );
    const totalRow = totalResult.rows[0];

    // Total streams overall
    const overallResult = await pool.query(
      `SELECT COUNT(*) AS overall_streams FROM plays`
    );
    const overallRow = overallResult.rows[0];

    const percent = overallRow.overall_streams
      ? ((parseInt(totalRow.total_streams) / parseInt(overallRow.overall_streams)) * 100).toFixed(2)
      : null;

    // Top day
    const topDayResult = await pool.query(
      `SELECT DATE(p.played_at) AS day, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       WHERE a.id = $1
       GROUP BY DATE(p.played_at)
       ORDER BY count DESC
       LIMIT 1`,
      [artistId]
    );
    const topDayRow = topDayResult.rows[0];

    // Top month
    const topMonthResult = await pool.query(
      `SELECT TO_CHAR(p.played_at, 'YYYY-MM') AS month, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       WHERE a.id = $1
       GROUP BY TO_CHAR(p.played_at, 'YYYY-MM')
       ORDER BY count DESC
       LIMIT 1`,
      [artistId]
    );
    const topMonthRow = topMonthResult.rows[0];

    // Top year
    const topYearResult = await pool.query(
      `SELECT EXTRACT(YEAR FROM p.played_at) AS year, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       WHERE a.id = $1
       GROUP BY EXTRACT(YEAR FROM p.played_at)
       ORDER BY count DESC
       LIMIT 1`,
      [artistId]
    );
    const topYearRow = topYearResult.rows[0];

    // Longest streak
    const streakResult = await pool.query(
      `SELECT DATE(p.played_at) AS day
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       WHERE a.id = $1
       GROUP BY DATE(p.played_at)
       ORDER BY day ASC`,
      [artistId]
    );
    const streakRows = streakResult.rows;
    let longestStreak = 0;
    let currentStreak = 0;
    let prevDate = null;
    streakRows.forEach(row => {
      const date = new Date(row.day);
      if (prevDate) {
        const diff = (date - prevDate) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      if (currentStreak > longestStreak) longestStreak = currentStreak;
      prevDate = date;
    });

    // Rank among all artists
    const artistRanksResult = await pool.query(
      `SELECT a.id, a.name, COUNT(p.id) AS playcount
       FROM artists a
       LEFT JOIN track_artists ta ON a.id = ta.artist_id
       LEFT JOIN tracks t ON ta.track_id = t.id
       LEFT JOIN plays p ON t.id = p.track_id
       GROUP BY a.id, a.name
       ORDER BY playcount DESC`
    );
    const artistRanks = artistRanksResult.rows;
    const rank =
      artistRanks.findIndex(a => parseInt(a.id) === parseInt(artistId)) + 1; // 1-based rank

    logger.info(`getArtistStats succeeded for artistId=${artistId}`);
    callback(null, {
      first_play: parseInt(row.first_play),
      last_play: parseInt(row.last_play),
      total_streams: parseInt(totalRow.total_streams),
      percent_of_total: percent,
      top_day: topDayRow ? { day: topDayRow.day, count: parseInt(topDayRow.count) } : null,
      top_month: topMonthRow ? { month: topMonthRow.month, count: parseInt(topMonthRow.count) } : null,
      top_year: topYearRow ? { year: parseInt(topYearRow.year), count: parseInt(topYearRow.count) } : null,
      longest_streak: longestStreak,
      rank: rank > 0 ? rank : null,
      total_artists: artistRanks.length,
    });
  } catch (err) {
    logger.error(`getArtistStats DB error: ${err}`);
    callback(err);
  }
}

export async function getArtistDailyPlays(artistId, days = 30, callback) {
  logger.info(`getArtistDailyPlays called with artistId=${artistId}, days=${days}`);
  try {
    const result = await pool.query(
      `SELECT DATE(p.played_at) AS day, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_artists ta ON t.id = ta.track_id
       JOIN artists a ON ta.artist_id = a.id
       WHERE a.id = $1
         AND p.played_at >= NOW() - INTERVAL '${days - 1} days'
       GROUP BY DATE(p.played_at)
       ORDER BY day ASC`,
      [artistId]
    );
    logger.info(`getArtistDailyPlays returned ${result.rows.length} rows`);
    callback(null, result.rows.map(row => ({
      day: row.day.toISOString().split('T')[0],
      count: parseInt(row.count)
    })));
  } catch (err) {
    logger.error(`getArtistDailyPlays DB error: ${err}`);
    callback(err);
  }
}

export async function getAllArtistsWithPlaycount(callback) {
  logger.info(`getAllArtistsWithPlaycount called`);
  try {
    const result = await pool.query(
      `SELECT a.id, a.name, COUNT(p.id) AS playcount
       FROM artists a
       LEFT JOIN track_artists ta ON a.id = ta.artist_id
       LEFT JOIN tracks t ON ta.track_id = t.id
       LEFT JOIN plays p ON t.id = p.track_id
       GROUP BY a.id, a.name
       ORDER BY a.name ASC`
    );
    logger.info(`getAllArtistsWithPlaycount returned ${result.rows.length} artists`);
    callback(null, result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getAllArtistsWithPlaycount DB error: ${err}`);
    callback(err);
  }
}