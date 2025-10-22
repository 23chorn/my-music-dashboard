import { getPool } from '../../connection.js';
import logger from '../../../utils/logger.js';

export async function getRecentDiscoveries(type, limit = 5) {
  const pool = getPool();
  
  try {
    let query;
    let params = [limit];
    
    switch (type) {
      case 'tracks':
        query = `
          WITH first_track_plays AS (
            SELECT
              p.track_id,
              MIN(p.played_at) as first_played_at
            FROM plays p
            GROUP BY p.track_id
          )
          SELECT DISTINCT
            t.id,
            t.name as track_name,
            a.name as artist_name,
            al.name as album_name,
            ftp.first_played_at
          FROM first_track_plays ftp
          JOIN tracks t ON ftp.track_id = t.id
          JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
          JOIN artists a ON ta.artist_id = a.id
          LEFT JOIN track_albums tal ON t.id = tal.track_id
          LEFT JOIN albums al ON tal.album_id = al.id
          ORDER BY ftp.first_played_at DESC
          LIMIT $1
        `;
        break;
        
      case 'artists':
        query = `
          WITH first_artist_plays AS (
            SELECT
              ta.artist_id,
              MIN(p.played_at) as first_played_at
            FROM plays p
            JOIN track_artists ta ON p.track_id = ta.track_id
            GROUP BY ta.artist_id
          )
          SELECT DISTINCT
            a.id,
            a.name as artist_name,
            fap.first_played_at,
            COUNT(DISTINCT t.id) as track_count
          FROM first_artist_plays fap
          JOIN artists a ON fap.artist_id = a.id
          JOIN track_artists ta ON a.id = ta.artist_id
          JOIN tracks t ON ta.track_id = t.id
          GROUP BY a.id, a.name, fap.first_played_at
          ORDER BY fap.first_played_at DESC
          LIMIT $1
        `;
        break;
        
      case 'albums':
        query = `
          WITH first_album_plays AS (
            SELECT
              tal.album_id,
              MIN(p.played_at) as first_played_at
            FROM plays p
            JOIN track_albums tal ON p.track_id = tal.track_id
            WHERE tal.album_id IS NOT NULL
            GROUP BY tal.album_id
          )
          SELECT DISTINCT
            al.id,
            al.name as album_name,
            a.name as artist_name,
            fap.first_played_at,
            COUNT(DISTINCT t.id) as track_count
          FROM first_album_plays fap
          JOIN albums al ON fap.album_id = al.id
          JOIN track_albums tal ON al.id = tal.album_id
          JOIN tracks t ON tal.track_id = t.id
          JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
          JOIN artists a ON ta.artist_id = a.id
          WHERE al.id IS NOT NULL
          GROUP BY al.id, al.name, a.name, fap.first_played_at
          ORDER BY fap.first_played_at DESC
          LIMIT $1
        `;
        break;
        
      default:
        throw new Error(`Invalid discovery type: ${type}`);
    }
    
    logger.info(`Executing recent ${type} discoveries query with limit ${limit}`);
    
    const result = await pool.query(query, params);
    const rows = result.rows;
    
    logger.info(`Found ${rows.length} recent ${type} discoveries`);
    return rows;
    
  } catch (error) {
    logger.error(`Error in getRecentDiscoveries for ${type}:`, error);
    throw error;
  }
}