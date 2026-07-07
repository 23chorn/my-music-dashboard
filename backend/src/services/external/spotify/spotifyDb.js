import logger from '../../../utils/logger.js';
import { getPool } from '../../../db/connection.js';

// Use the shared pool from connection.js
function getSharedPool() {
  return getPool();
}

// Normalize Spotify release_date to PostgreSQL date format
function normalizeReleaseDate(releaseDate) {
  if (!releaseDate) return null;
  
  // Handle different Spotify date formats:
  // "2005" -> "2005-01-01"
  // "2005-07" -> "2005-07-01"  
  // "2005-07-15" -> "2005-07-15" (already correct)
  
  if (/^\d{4}$/.test(releaseDate)) {
    // Year only: "2005"
    return `${releaseDate}-01-01`;
  } else if (/^\d{4}-\d{2}$/.test(releaseDate)) {
    // Year-Month: "2005-07"
    return `${releaseDate}-01`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    // Full date: "2005-07-15" (already correct)
    return releaseDate;
  } else {
    // Invalid format, return null
    logger.warn(`Invalid release_date format: ${releaseDate}`);
    return null;
  }
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
      // Normalize Spotify ID to base form for consistent lookup
      const baseSpotifyId = artistData.spotifyId.replace('spotify:artist:', '');
      
      // First try to find by Spotify ID in external_ids (check both URI and base formats)
      const externalId = await getSharedPool().query(
        `SELECT entity_id FROM external_ids 
         WHERE entity_type = 'artist' AND source = 'spotify' 
         AND (external_id = $1 OR external_id = $2)`,
        [baseSpotifyId, `spotify:artist:${baseSpotifyId}`]
      );

      if (externalId.rows.length > 0) {
        return externalId.rows[0].entity_id;
      }

      // Normalize artist name for better matching
      const normalizedName = artistData.name.trim().replace(/\s+/g, ' ');

      // Try to find by normalized name (case insensitive)
      const existing = await getSharedPool().query(
        `SELECT id FROM artists 
         WHERE LOWER(TRIM(REGEXP_REPLACE(name, '\\s+', ' ', 'g'))) = LOWER($1)
         LIMIT 1`,
        [normalizedName]
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
      const spotifyUri = `spotify:artist:${baseSpotifyId}`;
        
      await getSharedPool().query(
        `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
         VALUES ('artist', $1, 'spotify', $2) 
         ON CONFLICT DO NOTHING`,
        [artistId, spotifyUri]
      );

      return artistId;
    } catch (error) {
      logger.error(`Error finding/creating artist ${artistData.name}: ${error.message}`);
      throw error;
    }
  }

  // Find or create album by name, return internal ID
  // artistIds (internal ids of the album's artists) disambiguates albums that
  // share a title but belong to different artists (e.g. two albums both called
  // "Radio") so they don't get merged onto the same row by the name fallback below.
  async findOrCreateAlbum(albumData, artistIds = []) {
    try {
      // Normalize Spotify ID to base form for consistent lookup
      const baseSpotifyId = albumData.spotifyId.replace('spotify:album:', '');

      // First try to find by Spotify ID (check both URI and base formats)
      const externalId = await getSharedPool().query(
        `SELECT entity_id FROM external_ids
         WHERE entity_type = 'album' AND source = 'spotify'
         AND (external_id = $1 OR external_id = $2)`,
        [baseSpotifyId, `spotify:album:${baseSpotifyId}`]
      );

      if (externalId.rows.length > 0) {
        return externalId.rows[0].entity_id;
      }

      // Normalize the album name for better matching (trim, case insensitive, remove extra spaces)
      const normalizedName = albumData.name.trim().replace(/\s+/g, ' ');

      // Try to find by normalized name (case insensitive), but only reuse a row
      // belonging to one of the same artists when we know who the artists are
      const existing = await getSharedPool().query(
        `SELECT id, name FROM albums al
         WHERE LOWER(TRIM(REGEXP_REPLACE(al.name, '\\s+', ' ', 'g'))) = LOWER($1)
         AND ($3::int[] IS NULL OR EXISTS (
           SELECT 1 FROM album_artists aa WHERE aa.album_id = al.id AND aa.artist_id = ANY($3::int[])
         ))
         ORDER BY
           CASE WHEN al.name = $2 THEN 1 ELSE 2 END, -- Prefer exact match
           LENGTH(al.name) -- Then prefer shorter names
         LIMIT 1`,
        [normalizedName, albumData.name, artistIds.length > 0 ? artistIds : null]
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
          [shouldUpdateName, albumData.name, albumData.image_url, normalizeReleaseDate(albumData.release_date), albumId]
        );
        
        if (shouldUpdateName) {
          logger.info(`Updated album name from "${existingName}" to "${albumData.name}"`);
        }
      } else {
        // Create new album
        const result = await getSharedPool().query(
          `INSERT INTO albums (name, image_url, release_date, last_fetched) 
           VALUES ($1, $2, $3, NOW()) RETURNING id`,
          [albumData.name, albumData.image_url, normalizeReleaseDate(albumData.release_date)]
        );
        albumId = result.rows[0].id;
      }

      // Store Spotify ID mapping (ensure proper URI format)
      const spotifyUri = `spotify:album:${baseSpotifyId}`;
        
      await getSharedPool().query(
        `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
         VALUES ('album', $1, 'spotify', $2) 
         ON CONFLICT DO NOTHING`,
        [albumId, spotifyUri]
      );

      return albumId;
    } catch (error) {
      logger.error(`Error finding/creating album ${albumData.name}: ${error.message}`);
      throw error;
    }
  }

  // Find or create track by name, return internal ID
  // artistIds disambiguates tracks that share a title but belong to different
  // artists, the same way findOrCreateAlbum does for albums.
  async findOrCreateTrack(trackData, artistIds = []) {
    try {
      // Normalize Spotify ID to base form for consistent lookup
      const baseSpotifyId = trackData.spotifyId.replace('spotify:track:', '');

      // First try to find by Spotify ID (check both URI and base formats)
      const externalId = await getSharedPool().query(
        `SELECT entity_id FROM external_ids
         WHERE entity_type = 'track' AND source = 'spotify'
         AND (external_id = $1 OR external_id = $2)`,
        [baseSpotifyId, `spotify:track:${baseSpotifyId}`]
      );

      if (externalId.rows.length > 0) {
        return externalId.rows[0].entity_id;
      }

      // Normalize track name for better matching
      const normalizedName = trackData.name.trim().replace(/\s+/g, ' ');

      // For duplicate prevention, try to find by normalized name, but only reuse
      // a row belonging to one of the same artists when we know who they are
      const existing = await getSharedPool().query(
        `SELECT id FROM tracks t
         WHERE LOWER(TRIM(REGEXP_REPLACE(t.name, '\\s+', ' ', 'g'))) = LOWER($1)
         AND ($2::int[] IS NULL OR EXISTS (
           SELECT 1 FROM track_artists ta WHERE ta.track_id = t.id AND ta.artist_id = ANY($2::int[])
         ))
         LIMIT 1`,
        [normalizedName, artistIds.length > 0 ? artistIds : null]
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
      const spotifyUri = `spotify:track:${baseSpotifyId}`;
        
      await getSharedPool().query(
        `INSERT INTO external_ids (entity_type, entity_id, source, external_id) 
         VALUES ('track', $1, 'spotify', $2) 
         ON CONFLICT DO NOTHING`,
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
      if (isPrimary) {
        // If setting as primary, first remove primary flag from other artists for this track
        await getSharedPool().query(
          'UPDATE track_artists SET is_primary = false WHERE track_id = $1 AND artist_id != $2',
          [trackId, artistId]
        );
      }
      
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
      // Validate playedAt timestamp
      let validTimestamp = playedAt;
      
      if (playedAt instanceof Date) {
        if (isNaN(playedAt.getTime())) {
          logger.warn(`Skipping play with invalid Date object for track ID: ${trackId}`);
          return false;
        }
      } else if (typeof playedAt === 'string') {
        validTimestamp = new Date(playedAt);
        if (isNaN(validTimestamp.getTime())) {
          logger.warn(`Skipping play with invalid date string '${playedAt}' for track ID: ${trackId}`);
          return false;
        }
      } else if (typeof playedAt === 'number') {
        // Validate numeric timestamp
        if (playedAt <= 0) {
          logger.warn(`Skipping play with zero/negative timestamp ${playedAt} for track ID: ${trackId}`);
          return false;
        }
        
        // Convert if it looks like seconds (before year 3000)
        const threshold = 32503680000; // Year 3000 in seconds
        if (playedAt < threshold) {
          validTimestamp = new Date(playedAt * 1000);
        } else {
          validTimestamp = new Date(playedAt);
        }
        
        if (isNaN(validTimestamp.getTime())) {
          logger.warn(`Skipping play with timestamp that produces invalid date: ${playedAt} for track ID: ${trackId}`);
          return false;
        }
      } else {
        logger.warn(`Skipping play with unsupported timestamp type '${typeof playedAt}': ${playedAt} for track ID: ${trackId}`);
        return false;
      }
      
      // Additional validation - ensure timestamp is reasonable
      const now = new Date();
      const minDate = new Date('1990-01-01');
      const maxDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day in future max
      
      if (validTimestamp < minDate || validTimestamp > maxDate) {
        logger.warn(`Skipping play with unreasonable timestamp: ${validTimestamp.toISOString()} (${playedAt}) for track ID: ${trackId}`);
        return false;
      }

      // Check for duplicate play (same track + timestamp within 1 minute)
      const existing = await getSharedPool().query(
        `SELECT id FROM plays 
         WHERE track_id = $1 
         AND ABS(EXTRACT(EPOCH FROM (played_at - $2))) < 60`,
        [trackId, validTimestamp]
      );

      if (existing.rows.length > 0) {
        return false; // Duplicate play
      }

      await getSharedPool().query(
        'INSERT INTO plays (track_id, played_at) VALUES ($1, $2)',
        [trackId, validTimestamp]
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