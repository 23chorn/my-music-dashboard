const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const db = new sqlite3.Database(__dirname + '/../../data/recentTracks.db');
const dbGet = util.promisify(db.get).bind(db);
const dbAll = util.promisify(db.all).bind(db);

function getArtistInfo(artistId, callback) {
  db.get(
    `SELECT id, name, image_url FROM artists WHERE id = ?`,
    [artistId],
    (err, artist) => {
      callback(err, artist);
    }
  );
}

function getArtistTopTracks(artistId, callback) {
  db.all(
    `SELECT tracks.id, tracks.name, albums.name AS album, COUNT(*) AS playcount
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     LEFT JOIN albums ON tracks.album_id = albums.id
     WHERE tracks.artist_id = ?
     GROUP BY tracks.id
     ORDER BY playcount DESC
     LIMIT 10`,
    [artistId],
    (err, tracks) => {
      callback(err, tracks);
    }
  );
}

function getArtistRecentPlays(artistId, limit = 10, callback) {
  db.all(
    `SELECT plays.timestamp, tracks.name AS track, albums.name AS album
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     LEFT JOIN albums ON tracks.album_id = albums.id
     WHERE tracks.artist_id = ?
     ORDER BY plays.timestamp DESC
     LIMIT ?`,
    [artistId, limit],
    (err, plays) => {
      callback(err, plays);
    }
  );
}

function getArtistTopAlbums(artistId, callback) {
  console.log('getArtistTopAlbums called with', artistId);
  db.all(
    `SELECT albums.id, albums.name, COUNT(*) AS playcount
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     JOIN albums ON tracks.album_id = albums.id
     WHERE albums.artist_id = ?
     GROUP BY albums.id
     ORDER BY playcount DESC
     LIMIT 10`,
    [artistId],
    (err, albums) => {
      console.log('getArtistTopAlbums result', err, albums);
      callback(err, albums);
    }
  );
}

function getArtistMilestones(artistId, callback) {
  const milestones = [1, 100, 500, 1000, 5000];
  db.all(
    `SELECT plays.timestamp, tracks.name AS track, albums.name AS album
     FROM plays
     JOIN tracks ON plays.track_id = tracks.id
     LEFT JOIN albums ON tracks.album_id = albums.id
     WHERE tracks.artist_id = ?
     ORDER BY plays.timestamp ASC`,
    [artistId],
    (err, allPlays) => {
      if (err) return callback(err);
      const milestonePlays = milestones
        .map(n => {
          const play = allPlays[n - 1];
          if (!play) return null;
          return { milestone: n, ...play };
        })
        .filter(Boolean);
      callback(null, milestonePlays);
    }
  );
}

async function getArtistStats(artistId, callback) {
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
    callback(err);
  }
}

function getArtistDailyPlays(artistId, days = 30, callback) {
  db.all(
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
    ],
    (err, rows) => {
      callback(err, rows);
    }
  );
}

module.exports = {
  getArtistInfo,
  getArtistTopTracks,
  getArtistTopAlbums,
  getArtistRecentPlays,
  getArtistStats,
  getArtistMilestones,
  getArtistDailyPlays,
};