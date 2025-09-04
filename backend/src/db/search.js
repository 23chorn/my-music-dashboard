import { getPool } from './connection.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Search across artists, albums, and tracks
export async function searchAll(query, callback) {
  logger.info(`searchAll called with query="${query}"`);
  
  if (!query || query.trim().length === 0) {
    callback(null, { artists: [], albums: [], tracks: [] });
    return;
  }
  
  const searchQuery = `%${query.trim().toLowerCase()}%`;
  
  try {
    // Search artists
    const artistsResult = await pool().query(`
      SELECT 
        id,
        name,
        image_url,
        (SELECT COUNT(*) FROM plays p 
         JOIN track_artists ta ON p.track_id = ta.track_id 
         WHERE ta.artist_id = artists.id) as playcount
      FROM artists 
      WHERE LOWER(name) LIKE $1 
      ORDER BY playcount DESC, name ASC
      LIMIT 10
    `, [searchQuery]);
    
    // Search albums  
    const albumsResult = await pool().query(`
      SELECT 
        albums.id,
        albums.name,
        albums.image_url,
        STRING_AGG(DISTINCT artists.name, ', ' ORDER BY artists.name) as artist_names,
        (SELECT COUNT(*) FROM plays p 
         JOIN track_albums ta ON p.track_id = ta.track_id 
         WHERE ta.album_id = albums.id) as playcount
      FROM albums 
      LEFT JOIN album_artists aa ON albums.id = aa.album_id
      LEFT JOIN artists ON aa.artist_id = artists.id
      WHERE LOWER(albums.name) LIKE $1 
      GROUP BY albums.id, albums.name, albums.image_url
      ORDER BY playcount DESC, albums.name ASC
      LIMIT 10
    `, [searchQuery]);
    
    // Search tracks
    const tracksResult = await pool().query(`
      WITH track_albums_agg AS (
        SELECT 
          t.id as track_id,
          STRING_AGG(DISTINCT al.name, ', ' ORDER BY al.name) as album_names
        FROM tracks t
        LEFT JOIN track_albums tal ON t.id = tal.track_id
        LEFT JOIN albums al ON tal.album_id = al.id
        GROUP BY t.id
      ),
      track_artists_agg AS (
        SELECT 
          t.id as track_id,
          (
            SELECT STRING_AGG(name, ', ' ORDER BY is_primary DESC, name)
            FROM (
              SELECT DISTINCT a2.name, ta2.is_primary
              FROM track_artists ta2
              JOIN artists a2 ON ta2.artist_id = a2.id
              WHERE ta2.track_id = t.id
            ) artist_data
          ) as artist_names
        FROM tracks t
      )
      SELECT 
        t.id,
        t.name,
        taa.artist_names,
        tab.album_names,
        (SELECT COUNT(*) FROM plays p WHERE p.track_id = t.id) as playcount
      FROM tracks t
      LEFT JOIN track_artists_agg taa ON t.id = taa.track_id
      LEFT JOIN track_albums_agg tab ON t.id = tab.track_id
      WHERE LOWER(t.name) LIKE $1 
      ORDER BY playcount DESC, t.name ASC
      LIMIT 10
    `, [searchQuery]);
    
    const results = {
      artists: artistsResult.rows.map(row => ({
        id: parseInt(row.id),
        name: row.name,
        image: row.image_url,
        playcount: parseInt(row.playcount) || 0,
        type: 'artist'
      })),
      albums: albumsResult.rows.map(row => ({
        id: parseInt(row.id),
        name: row.name,
        artist: row.artist_names,
        image: row.image_url,
        playcount: parseInt(row.playcount) || 0,
        type: 'album'
      })),
      tracks: tracksResult.rows.map(row => ({
        id: parseInt(row.id),
        name: row.name,
        artist: row.artist_names,
        album: row.album_names,
        playcount: parseInt(row.playcount) || 0,
        type: 'track'
      }))
    };
    
    logger.info(`searchAll returned artists=${results.artists.length}, tracks=${results.tracks.length}, albums=${results.albums.length}`);
    callback(null, results);
    
  } catch (err) {
    logger.error(`searchAll DB error: ${err}`);
    callback(err);
  }
}