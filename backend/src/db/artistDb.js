import sqlite3 from 'sqlite3';
import util from 'util';
import path from 'path';
import logger from '../utils/logger.js';

// Fix for ES modules: get string path for sqlite3
const dbPath = path.resolve(path.dirname(import.meta.url.replace('file://', '')), '../../data/recentTracks.db');
const db = new sqlite3.Database(dbPath);

const dbGet = util.promisify(db.get).bind(db);
const dbAll = util.promisify(db.all).bind(db);

export async function getArtistInfo(artistId, callback) {
  logger.info(`getArtistInfo called with artistId=${artistId}`);
  try {
    const artist = await dbGet(
      `SELECT id, name, image_url FROM artists WHERE id = ?`,
      [artistId]
    );
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
    const plays = await dbAll(
      `SELECT plays.timestamp, tracks.name AS track, albums.name AS album, artists.name AS artist
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       LEFT JOIN albums ON tracks.album_id = albums.id
       LEFT JOIN artists ON tracks.artist_id = artists.id
       WHERE tracks.artist_id = ?
       ORDER BY plays.timestamp DESC
       LIMIT ?`,
      [artistId, limit]
    );
    logger.info(`getArtistRecentPlays returned ${plays.length} plays`);
    callback(null, plays);
  } catch (err) {
    logger.error(`getArtistRecentPlays DB error: ${err}`);
    callback(err);
  }
}

export async function getArtistMilestones(artistId, callback) {
  logger.info(`getArtistMilestones called with artistId=${artistId}`);
  const milestones = [1, 100, 500, 1000, 5000];
  try {
    const allPlays = await dbAll(
      `SELECT plays.timestamp, tracks.name AS track, albums.name AS album
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       LEFT JOIN albums ON tracks.album_id = albums.id
       WHERE tracks.artist_id = ?
       ORDER BY plays.timestamp ASC`,
      [artistId]
    );
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
    const row = await dbGet(
      `SELECT MIN(plays.timestamp) AS first_play, MAX(plays.timestamp) AS last_play
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.artist_id = ?`,
      [artistId]
    );

    // Total streams for this artist
    const totalRow = await dbGet(
      `SELECT COUNT(*) AS total_streams
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.artist_id = ?`,
      [artistId]
    );

    // Total streams overall
    const overallRow = await dbGet(
      `SELECT COUNT(*) AS overall_streams FROM plays`
    );

    const percent = overallRow.overall_streams
      ? ((totalRow.total_streams / overallRow.overall_streams) * 100).toFixed(2)
      : null;

    // Top day
    const topDayRow = await dbGet(
      `SELECT DATE(plays.timestamp, 'unixepoch') AS day, COUNT(*) AS count
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.artist_id = ?
       GROUP BY day
       ORDER BY count DESC
       LIMIT 1`,
      [artistId]
    );

    // Top month
    const topMonthRow = await dbGet(
      `SELECT strftime('%Y-%m', plays.timestamp, 'unixepoch') AS month, COUNT(*) AS count
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.artist_id = ?
       GROUP BY month
       ORDER BY count DESC
       LIMIT 1`,
      [artistId]
    );

    // Top year
    const topYearRow = await dbGet(
      `SELECT strftime('%Y', plays.timestamp, 'unixepoch') AS year, COUNT(*) AS count
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.artist_id = ?
       GROUP BY year
       ORDER BY count DESC
       LIMIT 1`,
      [artistId]
    );

    // Longest streak
    const streakRows = await dbAll(
      `SELECT DATE(plays.timestamp, 'unixepoch') AS day
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.artist_id = ?
       GROUP BY day
       ORDER BY day ASC`,
      [artistId]
    );
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
    const artistRanks = await dbAll(
      `SELECT artists.id, artists.name, COUNT(plays.id) AS playcount
       FROM artists
       LEFT JOIN tracks ON tracks.artist_id = artists.id
       LEFT JOIN plays ON plays.track_id = tracks.id
       GROUP BY artists.id
       ORDER BY playcount DESC`
    );
    const rank =
      artistRanks.findIndex(a => a.id === Number(artistId)) + 1; // 1-based rank

    logger.info(`getArtistStats succeeded for artistId=${artistId}`);
    callback(null, {
      first_play: row.first_play,
      last_play: row.last_play,
      total_streams: totalRow.total_streams,
      percent_of_total: percent,
      top_day: topDayRow,
      top_month: topMonthRow,
      top_year: topYearRow,
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
    const rows = await dbAll(
      `SELECT DATE(plays.timestamp, 'unixepoch') AS day, COUNT(*) AS count
       FROM plays
       JOIN tracks ON plays.track_id = tracks.id
       WHERE tracks.artist_id = ?
         AND plays.timestamp >= strftime('%s', 'now', ?)
       GROUP BY day
       ORDER BY day ASC`,
      [
        artistId,
        `-${days - 1} days`
      ]
    );
    logger.info(`getArtistDailyPlays returned ${rows.length} rows`);
    callback(null, rows);
  } catch (err) {
    logger.error(`getArtistDailyPlays DB error: ${err}`);
    callback(err);
  }
}

export async function getAllArtistsWithPlaycount(callback) {
  logger.info(`getAllArtistsWithPlaycount called`);
  try {
    const rows = await dbAll(
      `SELECT artists.id, artists.name, COUNT(plays.id) AS playcount
       FROM artists
       LEFT JOIN tracks ON tracks.artist_id = artists.id
       LEFT JOIN plays ON plays.track_id = tracks.id
       GROUP BY artists.id
       ORDER BY artists.name ASC`,
      []
    );
    logger.info(`getAllArtistsWithPlaycount returned ${rows.length} artists`);
    callback(null, rows);
  } catch (err) {
    logger.error(`getAllArtistsWithPlaycount DB error: ${err}`);
    callback(err);
  }
}