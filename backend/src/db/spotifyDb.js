import logger from '../utils/logger.js';
import { getPool } from './db.js';

// Use the shared pool from db.js
function getSharedPool() {
  return getPool();
}

export function initializeSpotifyDatabase() {
  // No longer needed - using shared pool
  logger.info('Spotify database will use shared connection pool');
}

export class SpotifyDatabaseService {
  async beginTransaction() {
    await getSharedPool().query('BEGIN');
  }

  async commitTransaction() {
    await getSharedPool().query('COMMIT');
  }

  async rollbackTransaction() {
    await getSharedPool().query('ROLLBACK');
  }

  // Genre operations
  async insertGenreIfNotExists(genreName) {
    try {
      const result = await getSharedPool().query(
        `INSERT INTO genres (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING id`,
        [genreName]
      );
      return result.rows[0]?.id || null;
    } catch (error) {
      logger.error(`Error inserting genre ${genreName}: ${error.message}`);
      throw error;
    }
  }

  // Artist operations
  async insertOrUpdateArtist(artist) {
    try {
      const result = await getSharedPool().query(
        `INSERT INTO artists (id, name, spotify_uri, popularity, followers, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           spotify_uri = EXCLUDED.spotify_uri,
           popularity = EXCLUDED.popularity,
           followers = EXCLUDED.followers,
           image_url = COALESCE(EXCLUDED.image_url, artists.image_url)
         RETURNING id`,
        [
          artist.id, 
          artist.name, 
          artist.spotify_uri, 
          artist.popularity, 
          artist.followers, 
          artist.image_url
        ]
      );
      return result.rows[0]?.id;
    } catch (error) {
      logger.error(`Error inserting/updating artist ${artist.id}: ${error.message}`);
      throw error;
    }
  }

  // Artist-Genre relationship
  async insertArtistGenreIfNotExists(artistId, genreName) {
    try {
      await getSharedPool().query(
        `INSERT INTO artist_genres (artist_id, genre_name) 
         VALUES ($1, $2) 
         ON CONFLICT (artist_id, genre_name) DO NOTHING`,
        [artistId, genreName]
      );
    } catch (error) {
      logger.error(`Error inserting artist-genre relationship ${artistId}-${genreName}: ${error.message}`);
      throw error;
    }
  }

  // Album operations
  async insertOrUpdateAlbum(album) {
    try {
      const result = await getSharedPool().query(
        `INSERT INTO albums (id, name, spotify_uri, release_date, release_date_precision, total_tracks, album_type, image_url) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           spotify_uri = EXCLUDED.spotify_uri,
           release_date = EXCLUDED.release_date,
           release_date_precision = EXCLUDED.release_date_precision,
           total_tracks = EXCLUDED.total_tracks,
           album_type = EXCLUDED.album_type,
           image_url = COALESCE(EXCLUDED.image_url, albums.image_url)
         RETURNING id`,
        [
          album.id,
          album.name,
          album.spotify_uri,
          album.release_date,
          album.release_date_precision,
          album.total_tracks,
          album.album_type,
          album.image_url
        ]
      );
      return result.rows[0]?.id;
    } catch (error) {
      logger.error(`Error inserting/updating album ${album.id}: ${error.message}`);
      throw error;
    }
  }

  // Album-Artist relationship
  async insertAlbumArtistIfNotExists(albumId, artistId) {
    try {
      await getSharedPool().query(
        `INSERT INTO album_artists (album_id, artist_id) 
         VALUES ($1, $2) 
         ON CONFLICT (album_id, artist_id) DO NOTHING`,
        [albumId, artistId]
      );
    } catch (error) {
      logger.error(`Error inserting album-artist relationship ${albumId}-${artistId}: ${error.message}`);
      throw error;
    }
  }

  // Track operations
  async insertOrUpdateTrack(track) {
    try {
      const result = await getSharedPool().query(
        `INSERT INTO tracks (id, name, spotify_uri, duration_ms, explicit, popularity, preview_url, track_number, disc_number, is_local) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET 
           name = EXCLUDED.name,
           spotify_uri = EXCLUDED.spotify_uri,
           duration_ms = EXCLUDED.duration_ms,
           explicit = EXCLUDED.explicit,
           popularity = EXCLUDED.popularity,
           preview_url = EXCLUDED.preview_url,
           track_number = EXCLUDED.track_number,
           disc_number = EXCLUDED.disc_number,
           is_local = EXCLUDED.is_local
         RETURNING id`,
        [
          track.id,
          track.name,
          track.spotify_uri,
          track.duration_ms,
          track.explicit,
          track.popularity,
          track.preview_url,
          track.track_number,
          track.disc_number,
          track.is_local
        ]
      );
      return result.rows[0]?.id;
    } catch (error) {
      logger.error(`Error inserting/updating track ${track.id}: ${error.message}`);
      throw error;
    }
  }

  // Track-Artist relationship
  async insertTrackArtistIfNotExists(trackId, artistId) {
    try {
      await getSharedPool().query(
        `INSERT INTO track_artists (track_id, artist_id) 
         VALUES ($1, $2) 
         ON CONFLICT (track_id, artist_id) DO NOTHING`,
        [trackId, artistId]
      );
    } catch (error) {
      logger.error(`Error inserting track-artist relationship ${trackId}-${artistId}: ${error.message}`);
      throw error;
    }
  }

  // Track-Album relationship
  async insertTrackAlbumIfNotExists(trackId, albumId) {
    try {
      await getSharedPool().query(
        `INSERT INTO track_albums (track_id, album_id) 
         VALUES ($1, $2) 
         ON CONFLICT (track_id, album_id) DO NOTHING`,
        [trackId, albumId]
      );
    } catch (error) {
      logger.error(`Error inserting track-album relationship ${trackId}-${albumId}: ${error.message}`);
      throw error;
    }
  }

  // Play operations
  async insertPlayIfNotExists(play) {
    try {
      const result = await getSharedPool().query(
        `INSERT INTO plays (track_id, played_at, context_type, context_uri) 
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (track_id, played_at) DO NOTHING
         RETURNING id`,
        [
          play.track_id,
          play.played_at,
          play.context_type,
          play.context_uri
        ]
      );
      return result.rows.length > 0; // Returns true if inserted, false if duplicate
    } catch (error) {
      logger.error(`Error inserting play for track ${play.track_id}: ${error.message}`);
      throw error;
    }
  }

  // Utility functions for sync management
  async getLastSyncTimestamp() {
    try {
      const result = await getSharedPool().query(
        `SELECT MAX(played_at) as last_sync FROM plays`
      );
      return result.rows[0]?.last_sync || null;
    } catch (error) {
      logger.error(`Error getting last sync timestamp: ${error.message}`);
      throw error;
    }
  }

  async updateSyncStatus(status, timestamp = null) {
    try {
      // This would require a sync_status table - for now just log
      logger.info(`Sync status updated: ${status} at ${timestamp || new Date()}`);
    } catch (error) {
      logger.error(`Error updating sync status: ${error.message}`);
      throw error;
    }
  }

  // Check if track exists
  async trackExists(trackId) {
    try {
      const result = await getSharedPool().query(
        `SELECT id FROM tracks WHERE id = $1`,
        [trackId]
      );
      return result.rows.length > 0;
    } catch (error) {
      logger.error(`Error checking if track exists ${trackId}: ${error.message}`);
      throw error;
    }
  }

  // Get artist with genres
  async getArtistWithGenres(artistId) {
    try {
      const result = await getSharedPool().query(
        `SELECT 
           a.id, a.name, a.spotify_uri, a.popularity, a.followers, a.image_url,
           ARRAY_AGG(ag.genre_name) FILTER (WHERE ag.genre_name IS NOT NULL) as genres
         FROM artists a
         LEFT JOIN artist_genres ag ON a.id = ag.artist_id
         WHERE a.id = $1
         GROUP BY a.id, a.name, a.spotify_uri, a.popularity, a.followers, a.image_url`,
        [artistId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting artist with genres ${artistId}: ${error.message}`);
      throw error;
    }
  }

  // Get tracks with all related data
  async getTrackWithFullDetails(trackId) {
    try {
      const result = await getSharedPool().query(
        `SELECT 
           t.id, t.name, t.spotify_uri, t.duration_ms, t.explicit, t.popularity,
           t.preview_url, t.track_number, t.disc_number, t.is_local,
           ARRAY_AGG(DISTINCT jsonb_build_object('id', ta_artist.id, 'name', ta_artist.name)) FILTER (WHERE ta_artist.id IS NOT NULL) as artists,
           jsonb_build_object('id', al.id, 'name', al.name, 'image_url', al.image_url) as album
         FROM tracks t
         LEFT JOIN track_artists ta ON t.id = ta.track_id
         LEFT JOIN artists ta_artist ON ta.artist_id = ta_artist.id
         LEFT JOIN track_albums tal ON t.id = tal.track_id
         LEFT JOIN albums al ON tal.album_id = al.id
         WHERE t.id = $1
         GROUP BY t.id, t.name, t.spotify_uri, t.duration_ms, t.explicit, t.popularity,
                  t.preview_url, t.track_number, t.disc_number, t.is_local, al.id, al.name, al.image_url`,
        [trackId]
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error getting track with full details ${trackId}: ${error.message}`);
      throw error;
    }
  }

  // Clean up old data (if needed)
  async cleanupOldPlays(daysToKeep = 365) {
    try {
      const result = await getSharedPool().query(
        `DELETE FROM plays WHERE played_at < NOW() - INTERVAL '${daysToKeep} days'`
      );
      logger.info(`Cleaned up ${result.rowCount} old plays (older than ${daysToKeep} days)`);
      return result.rowCount;
    } catch (error) {
      logger.error(`Error cleaning up old plays: ${error.message}`);
      throw error;
    }
  }
}

export default SpotifyDatabaseService;