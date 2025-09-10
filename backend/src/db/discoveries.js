import { getPool } from './connection.js';
import logger from '../utils/logger.js';

export async function getRecentDiscoveries(type, limit = 5) {
  const pool = getPool();
  
  try {
    let query;
    let params = [limit];
    
    switch (type) {
      case 'tracks':
        query = `
          SELECT DISTINCT
            t.id,
            t.name as track_name,
            a.name as artist_name,
            al.name as album_name,
            MIN(p.played_at) as first_played_at
          FROM tracks t
          JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
          JOIN artists a ON ta.artist_id = a.id
          LEFT JOIN track_albums tal ON t.id = tal.track_id
          LEFT JOIN albums al ON tal.album_id = al.id
          JOIN plays p ON t.id = p.track_id
          GROUP BY t.id, t.name, a.name, al.name
          ORDER BY first_played_at DESC
          LIMIT $1
        `;
        break;
        
      case 'artists':
        query = `
          SELECT DISTINCT
            a.id,
            a.name as artist_name,
            MIN(p.played_at) as first_played_at,
            COUNT(DISTINCT t.id) as track_count
          FROM artists a
          JOIN track_artists ta ON a.id = ta.artist_id
          JOIN tracks t ON ta.track_id = t.id
          JOIN plays p ON t.id = p.track_id
          GROUP BY a.id, a.name
          ORDER BY first_played_at DESC
          LIMIT $1
        `;
        break;
        
      case 'albums':
        query = `
          SELECT DISTINCT
            al.id,
            al.name as album_name,
            a.name as artist_name,
            MIN(p.played_at) as first_played_at,
            COUNT(DISTINCT t.id) as track_count
          FROM albums al
          JOIN track_albums tal ON al.id = tal.album_id
          JOIN tracks t ON tal.track_id = t.id
          JOIN track_artists ta ON t.id = ta.track_id AND ta.is_primary = true
          JOIN artists a ON ta.artist_id = a.id
          JOIN plays p ON t.id = p.track_id
          GROUP BY al.id, al.name, a.name
          ORDER BY first_played_at DESC
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