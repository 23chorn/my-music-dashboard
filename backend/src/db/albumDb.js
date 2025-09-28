import logger from '../utils/logger.js';
import { getPool } from './connection.js';

// Use the shared pool from connection.js
function getSharedPool() {
  return getPool();
}


// Get album info by albumId
export async function getAlbumInfo(albumId, callback) {
  logger.info(`getAlbumInfo called with albumId=${albumId}`);
  try {
    const result = await getSharedPool().query(
      `SELECT al.id, al.name, al.image_url, a.name AS artist, a.id AS artist_id
       FROM albums al
       JOIN album_artists aa ON al.id = aa.album_id
       JOIN artists a ON aa.artist_id = a.id
       WHERE al.id = $1`,
      [albumId]
    );
    const album = result.rows[0] || null;
    logger.info(`getAlbumInfo returned: ${album ? 'found' : 'not found'}`);
    callback(null, album);
  } catch (err) {
    logger.error(`getAlbumInfo DB error: ${err}`);
    callback(err);
  }
}

// Get top tracks for an album
export async function getAlbumTopTracks(albumId, limit, callback) {
  logger.info(`getAlbumTopTracks called with albumId=${albumId}, limit=${limit}`);
  try {
    const result = await getSharedPool().query(
      `SELECT t.id, t.name AS track, COUNT(p.id) AS playcount
       FROM tracks t
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       LEFT JOIN plays p ON p.track_id = t.id
       WHERE al.id = $1
       GROUP BY t.id, t.name
       ORDER BY playcount DESC
       LIMIT $2`,
      [albumId, limit]
    );
    logger.info(`getAlbumTopTracks returned ${result.rows.length} tracks`);
    callback(null, result.rows.map(row => ({
      id: parseInt(row.id),
      track: row.track,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getAlbumTopTracks DB error: ${err}`);
    callback(err);
  }
}

export async function getAlbumRecentPlays(albumId, limit, callback) {
  logger.info(`getAlbumRecentPlays called with albumId=${albumId}, limit=${limit}`);
  try {
    const result = await getSharedPool().query(
      `SELECT p.played_at, t.name AS track, al.name AS album
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1
       ORDER BY p.played_at DESC
       LIMIT $2`,
      [albumId, limit]
    );
    const plays = result.rows;
    logger.info(`getAlbumRecentPlays returned ${plays.length} plays`);
    if (!plays || plays.length === 0) logger.warn(`No recent plays found for albumId=${albumId}`);
    callback(null, plays.map(row => ({
      timestamp: Math.floor(new Date(row.played_at).getTime() / 1000),
      track: row.track,
      album: row.album
    })));
  } catch (err) {
    logger.error(`getAlbumRecentPlays DB error: ${err}`);
    callback(err);
  }
}

// Get album stats (total streams, first/last play, top day/year, rank)
export async function getAlbumStats(albumId, callback) {
  logger.info(`getAlbumStats called with albumId=${albumId}`);
  try {
    // First and most recent play
    const result = await getSharedPool().query(
      `SELECT EXTRACT(EPOCH FROM MIN(p.played_at)) AS first_play, 
              EXTRACT(EPOCH FROM MAX(p.played_at)) AS last_play
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1`,
      [albumId]
    );
    const row = result.rows[0];

    // Total streams for this album
    const totalResult = await getSharedPool().query(
      `SELECT COUNT(*) AS total_streams
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1`,
      [albumId]
    );
    const totalRow = totalResult.rows[0];

    // Top day
    const topDayResult = await getSharedPool().query(
      `SELECT DATE(p.played_at) AS day, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1
       GROUP BY DATE(p.played_at)
       ORDER BY count DESC
       LIMIT 1`,
      [albumId]
    );
    const topDayRow = topDayResult.rows[0];

    // Top year
    const topYearResult = await getSharedPool().query(
      `SELECT EXTRACT(YEAR FROM p.played_at) AS year, COUNT(*) AS count
       FROM plays p
       JOIN tracks t ON p.track_id = t.id
       JOIN track_albums ta ON t.id = ta.track_id
       JOIN albums al ON ta.album_id = al.id
       WHERE al.id = $1
       GROUP BY EXTRACT(YEAR FROM p.played_at)
       ORDER BY count DESC
       LIMIT 1`,
      [albumId]
    );
    const topYearRow = topYearResult.rows[0];

    // Rank among all albums
    const albumRanksResult = await getSharedPool().query(
      `SELECT al.id, al.name, COUNT(p.id) AS playcount
       FROM albums al
       LEFT JOIN track_albums ta ON al.id = ta.album_id
       LEFT JOIN tracks t ON ta.track_id = t.id
       LEFT JOIN plays p ON t.id = p.track_id
       GROUP BY al.id, al.name
       ORDER BY playcount DESC`
    );
    const albumRanks = albumRanksResult.rows;
    const rank = albumRanks.findIndex(a => parseInt(a.id) === parseInt(albumId)) + 1; // 1-based rank

    logger.info(`getAlbumStats succeeded for albumId=${albumId}`);
    callback(null, {
      first_play: parseInt(row.first_play),
      last_play: parseInt(row.last_play),
      total_streams: parseInt(totalRow.total_streams),
      top_day: topDayRow ? { day: topDayRow.day, count: parseInt(topDayRow.count) } : null,
      top_year: topYearRow ? { year: parseInt(topYearRow.year), count: parseInt(topYearRow.count) } : null,
      rank: rank > 0 ? rank : null,
      total_albums: albumRanks.length,
    });
  } catch (err) {
    logger.error(`getAlbumStats DB error: ${err}`);
    callback(err);
  }
}

// Get all tracks for an album with play counts, with configurable sorting
export async function getAlbumTracklist(albumId, sortBy = 'trackNumber', callback) {
  logger.info(`getAlbumTracklist called with albumId=${albumId}, sortBy=${sortBy}`);
  try {
    // Determine ORDER BY clause based on sortBy parameter
    let orderBy;
    if (sortBy === 'playCount') {
      orderBy = `play_counts.playcount DESC, t.name ASC`;
    } else { // default to 'trackNumber'
      orderBy = `
        COALESCE(ta.disc_number, 1) ASC,
        COALESCE(ta.track_number, 999) ASC,
        t.name ASC
      `;
    }

    const query = `
      SELECT
        t.id,
        t.name,
        t.duration_ms,
        ta.track_number,
        ta.disc_number,
        COALESCE(play_counts.playcount, 0) AS playcount,
        STRING_AGG(DISTINCT ar.name, ', ' ORDER BY ar.name) AS artists
      FROM tracks t
      JOIN track_albums ta ON t.id = ta.track_id
      LEFT JOIN track_artists ta_artists ON t.id = ta_artists.track_id
      LEFT JOIN artists ar ON ta_artists.artist_id = ar.id
      LEFT JOIN (
        SELECT track_id, COUNT(*) AS playcount
        FROM plays
        GROUP BY track_id
      ) play_counts ON play_counts.track_id = t.id
      WHERE ta.album_id = $1
      GROUP BY t.id, t.name, t.duration_ms, ta.track_number, ta.disc_number, play_counts.playcount
      ORDER BY ${orderBy}
    `;

    const result = await getSharedPool().query(query, [albumId]);

    const tracks = result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      duration_ms: row.duration_ms,
      track_number: row.track_number,
      disc_number: row.disc_number,
      playcount: parseInt(row.playcount),
      artists: row.artists
    }));

    logger.info(`getAlbumTracklist returned ${tracks.length} tracks for album ${albumId} (sorted by ${sortBy})`);
    callback(null, tracks);
  } catch (err) {
    logger.error(`getAlbumTracklist DB error: ${err}`);
    callback(err);
  }
}

export async function getAllAlbumsWithPlaycount(options = {}, callback) {
  // Handle backward compatibility - if first param is callback
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  const { page = 1, limit = 50, sortBy = 'alpha', alphaCategory = null, minPlays = null, maxPlays = null } = options;
  logger.info(`getAllAlbumsWithPlaycount called with page=${page}, limit=${limit}, sortBy=${sortBy}, alphaCategory=${alphaCategory}, minPlays=${minPlays}, maxPlays=${maxPlays}`);
  
  try {
    let query;
    let queryParams = [];
    let paramCount = 0;

    if (sortBy === 'plays') {
      // Sort by playcount descending with pagination
      let havingClause = 'HAVING COUNT(p.id) > 0';
      
      if (minPlays !== null || maxPlays !== null) {
        const conditions = [];
        if (minPlays !== null) {
          conditions.push(`COUNT(p.id) >= $${++paramCount}`);
          queryParams.push(minPlays);
        }
        if (maxPlays !== null) {
          conditions.push(`COUNT(p.id) <= $${++paramCount}`);
          queryParams.push(maxPlays);
        }
        havingClause = `HAVING ${conditions.join(' AND ')}`;
      }
      
      query = `
        SELECT al.id, al.name, al.image_url, COUNT(p.id) AS playcount
        FROM albums al
        LEFT JOIN track_albums ta ON al.id = ta.album_id
        LEFT JOIN tracks t ON ta.track_id = t.id
        LEFT JOIN plays p ON t.id = p.track_id
        GROUP BY al.id, al.name, al.image_url
        ${havingClause}
        ORDER BY playcount DESC, al.name ASC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      queryParams.push(limit, (page - 1) * limit);
    } else {
      // Alphabetical sorting with category filtering
      let havingClause = 'HAVING COUNT(p.id) > 0';
      
      if (minPlays !== null || maxPlays !== null) {
        const conditions = [];
        if (minPlays !== null) {
          conditions.push(`COUNT(p.id) >= $${++paramCount}`);
          queryParams.push(minPlays);
        }
        if (maxPlays !== null) {
          conditions.push(`COUNT(p.id) <= $${++paramCount}`);
          queryParams.push(maxPlays);
        }
        havingClause = `HAVING ${conditions.join(' AND ')}`;
      }
      
      if (alphaCategory && alphaCategory !== '#') {
        query = `
          SELECT al.id, al.name, al.image_url, COUNT(p.id) AS playcount
          FROM albums al
          LEFT JOIN track_albums ta ON al.id = ta.album_id
          LEFT JOIN tracks t ON ta.track_id = t.id
          LEFT JOIN plays p ON t.id = p.track_id
          WHERE UPPER(al.name) LIKE $${++paramCount}
          GROUP BY al.id, al.name, al.image_url
          ${havingClause}
          ORDER BY al.name ASC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
        queryParams.push(`${alphaCategory}%`, limit, (page - 1) * limit);
      } else if (alphaCategory === '#') {
        query = `
          SELECT al.id, al.name, al.image_url, COUNT(p.id) AS playcount
          FROM albums al
          LEFT JOIN track_albums ta ON al.id = ta.album_id
          LEFT JOIN tracks t ON ta.track_id = t.id
          LEFT JOIN plays p ON t.id = p.track_id
          WHERE NOT (UPPER(al.name) ~ '^[A-Z]')
          GROUP BY al.id, al.name, al.image_url
          ${havingClause}
          ORDER BY al.name ASC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
        queryParams.push(limit, (page - 1) * limit);
      } else {
        // Default alphabetical sort
        query = `
          SELECT al.id, al.name, al.image_url, COUNT(p.id) AS playcount
          FROM albums al
          LEFT JOIN track_albums ta ON al.id = ta.album_id
          LEFT JOIN tracks t ON ta.track_id = t.id
          LEFT JOIN plays p ON t.id = p.track_id
          GROUP BY al.id, al.name, al.image_url
          ${havingClause}
          ORDER BY al.name ASC
          LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;
        queryParams.push(limit, (page - 1) * limit);
      }
    }

    const result = await getSharedPool().query(query, queryParams);
    logger.info(`getAllAlbumsWithPlaycount returned ${result.rows.length} albums`);
    callback(null, result.rows.map(row => ({
      id: parseInt(row.id),
      name: row.name,
      image_url: row.image_url,
      playcount: parseInt(row.playcount)
    })));
  } catch (err) {
    logger.error(`getAllAlbumsWithPlaycount DB error: ${err}`);
    callback(err);
  }
}