import logger from '../utils/logger.js';
import { getPool } from './db.js';

// Use the shared pool from db.js
function getSharedPool() {
  return getPool();
}

export function initializeLegacySpotifyDatabase() {
  // No longer needed - using shared pool
  logger.info('Legacy Spotify database will use shared connection pool');
}

export class LegacySpotifyDatabaseService {
  async beginTransaction() {
    await getSharedPool().query('BEGIN');
  }

  async commitTransaction() {
    await getSharedPool().query('COMMIT');
  }

  async rollbackTransaction() {
    await getSharedPool().query('ROLLBACK');
  }

  // Find or create genre by name, return ID
  async findOrCreateGenre(genreName) {
    try {
      // First try to find existing genre
      const existing = await getSharedPool().query(
        'SELECT id FROM genres WHERE name = $1',
        [genreName]
      );

      if (existing.rows.length > 0) {
        return existing.rows[0].id;
      }

      // Create new genre
      const result = await getSharedPool().query(
        'INSERT INTO genres (name) VALUES ($1) RETURNING id',
        [genreName]
      );

      return result.rows[0].id;
    } catch (error) {
      logger.error(`Error finding/creating genre ${genreName}: ${error.message}`);
      throw error;
    }
  }

  // Find or create artist by name, return internal ID
  async findOrCreateArtist(artistData) {
    try {
      // First try to find by Spotify ID in external_ids
      const externalId = await getSharedPool().query(
        `SELECT entity_id FROM external_ids 
         WHERE entity_type = 'artist' AND source = 'spotify' AND external_id = $1`,
        [artistData.spotifyId]
      );

      if (externalId.rows.length > 0) {
        return externalId.rows[0].entity_id;
      }

      // Try to find by name (case insensitive)
      const existing = await getSharedPool().query(
        'SELECT id FROM artists WHERE LOWER(name) = LOWER($1)',
        [artistData.name]
      );

      let artistId;

      if (existing.rows.length > 0) {
        artistId = existing.rows[0].id;
        
        // Update image if we have one and it's missing
        if (artistData.image_url) {
          await getSharedPool().query(
            'UPDATE artists SET image_url = COALESCE(image_url, $1), last_fetched = NOW() WHERE id = $2',
            [artistData.image_url, artistId]
          );
        }
      } else {
        // Create new artist
        const result = await getSharedPool().query(
          'INSERT INTO artists (name, image_url, last_fetched) VALUES ($1, $2, NOW()) RETURNING id',
          [artistData.name, artistData.image_url]
        );
        artistId = result.rows[0].id;
      }

      // Store Spotify ID mapping (ensure proper URI format)
      const spotifyUri = artistData.spotifyId.startsWith('spotify:') 
        ? artistData.spotifyId 
        : `spotify:artist:${artistData.spotifyId}`;
        
      await getSharedPool().query(
        `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
         VALUES ('artist', $1, 'spotify', $2) 
         ON CONFLICT ON CONSTRAINT external_ids_unique_entity_source DO NOTHING`,
        [artistId, spotifyUri]
      );

      return artistId;
    } catch (error) {
      logger.error(`Error finding/creating artist ${artistData.name}: ${error.message}`);
      throw error;
    }
  }

  // Find or create album by name, return internal ID
  async findOrCreateAlbum(albumData) {
    try {
      // First try to find by Spotify ID
      const externalId = await getSharedPool().query(
        `SELECT entity_id FROM external_ids 
         WHERE entity_type = 'album' AND source = 'spotify' AND external_id = $1`,
        [albumData.spotifyId]
      );

      if (externalId.rows.length > 0) {
        return externalId.rows[0].entity_id;
      }

      // Normalize the album name for better matching (trim, case insensitive, remove extra spaces)
      const normalizedName = albumData.name.trim().replace(/\s+/g, ' ');

      // Try to find by normalized name (case insensitive)
      const existing = await getSharedPool().query(
        `SELECT id, name FROM albums 
         WHERE LOWER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g'))) = LOWER($1)
         ORDER BY 
           CASE WHEN name = $2 THEN 1 ELSE 2 END, -- Prefer exact match
           LENGTH(name) -- Then prefer shorter names
         LIMIT 1`,
        [normalizedName.toLowerCase(), albumData.name]
      );

      let albumId;

      if (existing.rows.length > 0) {
        albumId = existing.rows[0].id;
        
        // Update fields if they're missing, but keep the original name unless it's clearly better
        const existingName = existing.rows[0].name;
        const shouldUpdateName = 
          existingName.toUpperCase() === existingName && // Existing is all caps
          albumData.name !== albumData.name.toUpperCase(); // New is not all caps
        
        await getSharedPool().query(
          `UPDATE albums SET 
           name = CASE WHEN $1 THEN $2 ELSE name END,
           image_url = COALESCE(image_url, $3), 
           release_date = COALESCE(release_date, $4),
           last_fetched = NOW() 
           WHERE id = $5`,
          [shouldUpdateName, albumData.name, albumData.image_url, albumData.release_date, albumId]
        );
        
        if (shouldUpdateName) {
          logger.info(`Updated album name from "${existingName}" to "${albumData.name}"`);
        }
      } else {
        // Create new album
        const result = await getSharedPool().query(
          `INSERT INTO albums (name, image_url, release_date, last_fetched) 
           VALUES ($1, $2, $3, NOW()) RETURNING id`,
          [albumData.name, albumData.image_url, albumData.release_date]
        );
        albumId = result.rows[0].id;
      }

      // Store Spotify ID mapping (ensure proper URI format)
      const spotifyUri = albumData.spotifyId.startsWith('spotify:') 
        ? albumData.spotifyId 
        : `spotify:album:${albumData.spotifyId}`;
        
      await getSharedPool().query(
        `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
         VALUES ('album', $1, 'spotify', $2) 
         ON CONFLICT ON CONSTRAINT external_ids_unique_entity_source DO NOTHING`,
        [albumId, spotifyUri]
      );

      return albumId;
    } catch (error) {
      logger.error(`Error finding/creating album ${albumData.name}: ${error.message}`);
      throw error;
    }
  }

  // Find or create track by name, return internal ID
  async findOrCreateTrack(trackData) {
    try {
      // First try to find by Spotify ID
      const externalId = await getSharedPool().query(
        `SELECT entity_id FROM external_ids 
         WHERE entity_type = 'track' AND source = 'spotify' AND external_id = $1`,
        [trackData.spotifyId]
      );

      if (externalId.rows.length > 0) {
        return externalId.rows[0].entity_id;
      }

      // Try to find by name (case insensitive) - could match multiple, that's ok
      const existing = await getSharedPool().query(
        'SELECT id FROM tracks WHERE LOWER(name) = LOWER($1) LIMIT 1',
        [trackData.name]
      );

      let trackId;

      if (existing.rows.length > 0) {
        trackId = existing.rows[0].id;
        
        // Update fields if they're missing or newer
        await getSharedPool().query(
          `UPDATE tracks SET 
           duration_ms = COALESCE(duration_ms, $1),
           popularity = GREATEST(COALESCE(popularity, 0), COALESCE($2, 0)),
           last_fetched = NOW()
           WHERE id = $3`,
          [trackData.duration_ms, trackData.popularity, trackId]
        );
      } else {
        // Create new track
        const result = await getSharedPool().query(
          `INSERT INTO tracks (name, duration_ms, popularity, last_fetched) 
           VALUES ($1, $2, $3, NOW()) RETURNING id`,
          [trackData.name, trackData.duration_ms, trackData.popularity]
        );
        trackId = result.rows[0].id;
      }

      // Store Spotify ID mapping (ensure proper URI format)
      const spotifyUri = trackData.spotifyId.startsWith('spotify:') 
        ? trackData.spotifyId 
        : `spotify:track:${trackData.spotifyId}`;
        
      await getSharedPool().query(
        `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
         VALUES ('track', $1, 'spotify', $2) 
         ON CONFLICT ON CONSTRAINT external_ids_unique_entity_source DO NOTHING`,
        [trackId, spotifyUri]
      );

      return trackId;
    } catch (error) {
      logger.error(`Error finding/creating track ${trackData.name}: ${error.message}`);
      throw error;
    }
  }

  // Insert track-artist relationship
  async insertTrackArtistRelationship(trackId, artistId, isPrimary = false) {
    try {
      await getSharedPool().query(
        `INSERT INTO track_artists (track_id, artist_id, is_primary) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (track_id, artist_id) DO UPDATE SET
         is_primary = EXCLUDED.is_primary`,
        [trackId, artistId, isPrimary]
      );
    } catch (error) {
      logger.error(`Error inserting track-artist relationship: ${error.message}`);
      throw error;
    }
  }

  // Insert track-album relationship
  async insertTrackAlbumRelationship(trackId, albumId, trackNumber = null, discNumber = null) {
    try {
      await getSharedPool().query(
        `INSERT INTO track_albums (track_id, album_id, track_number, disc_number) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (track_id, album_id) DO UPDATE SET
         track_number = COALESCE(track_albums.track_number, $3),
         disc_number = COALESCE(track_albums.disc_number, $4)`,
        [trackId, albumId, trackNumber, discNumber]
      );
    } catch (error) {
      logger.error(`Error inserting track-album relationship: ${error.message}`);
      throw error;
    }
  }

  // Insert album-artist relationship
  async insertAlbumArtistRelationship(albumId, artistId) {
    try {
      await getSharedPool().query(
        `INSERT INTO album_artists (album_id, artist_id) 
         VALUES ($1, $2) 
         ON CONFLICT (album_id, artist_id) DO NOTHING`,
        [albumId, artistId]
      );
    } catch (error) {
      logger.error(`Error inserting album-artist relationship: ${error.message}`);
      throw error;
    }
  }

  // Insert artist-genre relationship
  async insertArtistGenreRelationship(artistId, genreId) {
    try {
      await getSharedPool().query(
        `INSERT INTO artist_genres (artist_id, genre_id) 
         VALUES ($1, $2) 
         ON CONFLICT (artist_id, genre_id) DO NOTHING`,
        [artistId, genreId]
      );
    } catch (error) {
      logger.error(`Error inserting artist-genre relationship: ${error.message}`);
      throw error;
    }
  }

  // Insert play record
  async insertPlay(trackId, playedAt) {
    try {
      // Check for duplicate play (same track + timestamp within 1 minute)
      const existing = await getSharedPool().query(
        `SELECT id FROM plays 
         WHERE track_id = $1 
         AND ABS(EXTRACT(EPOCH FROM (played_at - $2))) < 60`,
        [trackId, playedAt]
      );

      if (existing.rows.length > 0) {
        return false; // Duplicate play
      }

      await getSharedPool().query(
        'INSERT INTO plays (track_id, played_at) VALUES ($1, $2)',
        [trackId, playedAt]
      );

      return true; // New play inserted
    } catch (error) {
      logger.error(`Error inserting play: ${error.message}`);
      throw error;
    }
  }

  // Get last sync timestamp
  async getLastSyncTimestamp() {
    try {
      const result = await getSharedPool().query(
        'SELECT MAX(played_at) as last_sync FROM plays'
      );
      return result.rows[0]?.last_sync || null;
    } catch (error) {
      logger.error(`Error getting last sync timestamp: ${error.message}`);
      throw error;
    }
  }
}

export default LegacySpotifyDatabaseService;