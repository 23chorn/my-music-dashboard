import { getPool } from './connection.js';
import { getSyncStats } from './metadata.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Get external ID coverage statistics
export async function getExternalIdCoverage() {
  logger.info('getExternalIdCoverage called');

  try {
    const queries = await Promise.all([
      // Artists with external IDs
      pool().query(`
        SELECT
          COUNT(DISTINCT a.id) as total_artists,
          COUNT(DISTINCT CASE WHEN e.external_id IS NOT NULL THEN a.id END) as artists_with_external_id
        FROM artists a
        LEFT JOIN external_ids e ON e.entity_type = 'artist' AND e.entity_id = a.id
      `),
      // Albums with external IDs
      pool().query(`
        SELECT
          COUNT(DISTINCT a.id) as total_albums,
          COUNT(DISTINCT CASE WHEN e.external_id IS NOT NULL THEN a.id END) as albums_with_external_id
        FROM albums a
        LEFT JOIN external_ids e ON e.entity_type = 'album' AND e.entity_id = a.id
      `),
      // Tracks with external IDs
      pool().query(`
        SELECT
          COUNT(DISTINCT t.id) as total_tracks,
          COUNT(DISTINCT CASE WHEN e.external_id IS NOT NULL THEN t.id END) as tracks_with_external_id
        FROM tracks t
        LEFT JOIN external_ids e ON e.entity_type = 'track' AND e.entity_id = t.id
      `)
    ]);

    const result = {
      totalArtists: parseInt(queries[0].rows[0].total_artists),
      artistsWithSpotifyId: parseInt(queries[0].rows[0].artists_with_external_id),
      totalAlbums: parseInt(queries[1].rows[0].total_albums),
      albumsWithSpotifyId: parseInt(queries[1].rows[0].albums_with_external_id),
      totalTracks: parseInt(queries[2].rows[0].total_tracks),
      tracksWithSpotifyId: parseInt(queries[2].rows[0].tracks_with_external_id)
    };

    logger.info('getExternalIdCoverage completed successfully');
    return result;
  } catch (err) {
    logger.error(`Error in getExternalIdCoverage: ${err.message}`);
    throw err;
  }
}

// Get metadata completion statistics
export async function getMetadataCompletion() {
  logger.info('getMetadataCompletion called');

  try {
    const queries = await Promise.all([
      // Artists with images
      pool().query(`
        SELECT
          COUNT(*) as total_artists,
          COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as artists_with_images
        FROM artists
      `),
      // Albums with images and release dates
      pool().query(`
        SELECT
          COUNT(*) as total_albums,
          COUNT(CASE WHEN image_url IS NOT NULL AND image_url != '' THEN 1 END) as albums_with_images,
          COUNT(CASE WHEN release_date IS NOT NULL THEN 1 END) as albums_with_release_date
        FROM albums
      `),
      // Tracks with duration and release dates
      pool().query(`
        SELECT
          COUNT(*) as total_tracks,
          COUNT(CASE WHEN duration_ms IS NOT NULL AND duration_ms > 0 THEN 1 END) as tracks_with_duration,
          COUNT(CASE WHEN release_date IS NOT NULL THEN 1 END) as tracks_with_release_date
        FROM tracks
      `)
    ]);

    const result = {
      totalArtists: parseInt(queries[0].rows[0].total_artists),
      artistsWithImages: parseInt(queries[0].rows[0].artists_with_images),
      totalAlbums: parseInt(queries[1].rows[0].total_albums),
      albumsWithImages: parseInt(queries[1].rows[0].albums_with_images),
      albumsWithReleaseDate: parseInt(queries[1].rows[0].albums_with_release_date),
      totalTracks: parseInt(queries[2].rows[0].total_tracks),
      tracksWithDuration: parseInt(queries[2].rows[0].tracks_with_duration),
      tracksWithReleaseDate: parseInt(queries[2].rows[0].tracks_with_release_date)
    };

    logger.info('getMetadataCompletion completed successfully');
    return result;
  } catch (err) {
    logger.error(`Error in getMetadataCompletion: ${err.message}`);
    throw err;
  }
}

// Get database health statistics
export async function getDatabaseHealth() {
  logger.info('getDatabaseHealth called');

  try {
    const queries = await Promise.all([
      // Total records across main tables
      pool().query(`
        SELECT
          (SELECT COUNT(*) FROM artists) as artists,
          (SELECT COUNT(*) FROM albums) as albums,
          (SELECT COUNT(*) FROM tracks) as tracks,
          (SELECT COUNT(*) FROM plays) as plays,
          (SELECT COUNT(*) FROM external_ids) as external_ids
      `),
      // Database size (PostgreSQL specific)
      pool().query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as db_size,
               pg_database_size(current_database()) as db_size_bytes
      `),
      // Check for orphaned records
      pool().query(`
        SELECT
          (SELECT COUNT(*) FROM plays p WHERE NOT EXISTS (SELECT 1 FROM tracks t WHERE t.id = p.track_id)) as orphaned_plays,
          (SELECT COUNT(*) FROM track_artists ta WHERE NOT EXISTS (SELECT 1 FROM tracks t WHERE t.id = ta.track_id)) as orphaned_track_artists,
          (SELECT COUNT(*) FROM track_artists ta WHERE NOT EXISTS (SELECT 1 FROM artists a WHERE a.id = ta.artist_id)) as orphaned_artist_refs
      `)
    ]);

    const tableStats = queries[0].rows[0];
    const sizeInfo = queries[1].rows[0];
    const orphanedInfo = queries[2].rows[0];

    const totalRecords = Object.values(tableStats).reduce((sum, count) => sum + parseInt(count), 0);
    const totalOrphaned = parseInt(orphanedInfo.orphaned_plays) +
                         parseInt(orphanedInfo.orphaned_track_artists) +
                         parseInt(orphanedInfo.orphaned_artist_refs);

    const result = {
      totalRecords,
      databaseSize: parseInt(sizeInfo.db_size_bytes),
      tableStats: {
        artists: parseInt(tableStats.artists),
        albums: parseInt(tableStats.albums),
        tracks: parseInt(tableStats.tracks),
        plays: parseInt(tableStats.plays),
        external_ids: parseInt(tableStats.external_ids)
      },
      orphanedRecords: totalOrphaned,
      performanceScore: totalOrphaned === 0 ? 100 : Math.max(50, 100 - (totalOrphaned / totalRecords * 100)),
      indexHealth: 100 // Placeholder - could be enhanced with actual index analysis
    };

    logger.info('getDatabaseHealth completed successfully');
    return result;
  } catch (err) {
    logger.error(`Error in getDatabaseHealth: ${err.message}`);
    throw err;
  }
}

// Get sync status information
export async function getSyncStatus() {
  logger.info('getSyncStatus called');

  try {
    const syncStats = await getSyncStats();

    const result = {
      lastSyncTime: syncStats.lastSyncTime,
      syncMethod: syncStats.syncMethod,
      totalSyncs: syncStats.totalSyncs,
      failedSyncs: syncStats.failedSyncs,
      lastSyncRecordsAdded: syncStats.lastSyncRecordsAdded,
      avgSyncDuration: syncStats.lastSyncDuration, // Use last sync duration as avg for now
      nextScheduledSync: null, // Placeholder - could be calculated based on sync frequency
      syncHealthScore: syncStats.totalSyncs > 0 ?
        Math.round(((syncStats.totalSyncs - syncStats.failedSyncs) / syncStats.totalSyncs) * 100) : 100
    };

    logger.info('getSyncStatus completed successfully');
    return result;
  } catch (err) {
    logger.warn('Could not fetch sync status from metadata table:', err.message);
    return {
      lastSyncTime: null,
      syncMethod: 'Unknown',
      totalSyncs: 0,
      failedSyncs: 0,
      lastSyncRecordsAdded: 0,
      avgSyncDuration: 0,
      nextScheduledSync: null,
      syncHealthScore: 100
    };
  }
}

// Get duplicate tracking information
export async function getDuplicateTracking() {
  logger.info('getDuplicateTracking called');

  try {
    // Find current duplicates by name matching
    const duplicateQueries = await Promise.all([
      // Duplicate artists
      pool().query(`
        SELECT COUNT(*) as duplicate_groups, SUM(duplicate_count - 1) as total_duplicates
        FROM (
          SELECT COUNT(*) as duplicate_count
          FROM artists
          GROUP BY LOWER(TRIM(name))
          HAVING COUNT(*) > 1
        ) dups
      `),
      // Duplicate albums
      pool().query(`
        SELECT COUNT(*) as duplicate_groups, SUM(duplicate_count - 1) as total_duplicates
        FROM (
          SELECT COUNT(*) as duplicate_count
          FROM albums
          GROUP BY LOWER(TRIM(name))
          HAVING COUNT(*) > 1
        ) dups
      `),
      // Duplicate tracks
      pool().query(`
        SELECT COUNT(*) as duplicate_groups, SUM(duplicate_count - 1) as total_duplicates
        FROM (
          SELECT COUNT(*) as duplicate_count
          FROM tracks
          GROUP BY LOWER(TRIM(name))
          HAVING COUNT(*) > 1
        ) dups
      `)
    ]);

    // Check metadata for deduplication history
    const cleanupInfo = await pool().query(`
      SELECT key, value FROM metadata
      WHERE key IN ('last_deduplication_run', 'total_records_merged', 'total_records_deleted', 'duplicates_cleaned')
    `);

    const cleanupMetadata = {};
    cleanupInfo.rows.forEach(row => {
      cleanupMetadata[row.key] = row.value;
    });

    const result = {
      duplicateArtistsFound: parseInt(duplicateQueries[0].rows[0]?.total_duplicates || 0),
      duplicateArtistsCleaned: parseInt(cleanupMetadata.duplicates_cleaned || 0),
      duplicateAlbumsFound: parseInt(duplicateQueries[1].rows[0]?.total_duplicates || 0),
      duplicateAlbumsCleaned: 0,
      duplicateTracksFound: parseInt(duplicateQueries[2].rows[0]?.total_duplicates || 0),
      duplicateTracksCleaned: 0,
      lastDeduplicationRun: cleanupMetadata.last_deduplication_run || null,
      totalRecordsMerged: parseInt(cleanupMetadata.total_records_merged || 0),
      totalRecordsDeleted: parseInt(cleanupMetadata.total_records_deleted || 0)
    };

    logger.info('getDuplicateTracking completed successfully');
    return result;
  } catch (err) {
    logger.warn('Could not fetch duplicate tracking data:', err.message);
    return {
      duplicateArtistsFound: 0,
      duplicateArtistsCleaned: 0,
      duplicateAlbumsFound: 0,
      duplicateAlbumsCleaned: 0,
      duplicateTracksFound: 0,
      duplicateTracksCleaned: 0,
      lastDeduplicationRun: null,
      totalRecordsMerged: 0,
      totalRecordsDeleted: 0
    };
  }
}

// Get all insights data in a single call
export async function getAllInsights() {
  logger.info('getAllInsights called');

  try {
    const [
      externalIdCoverage,
      metadataCompletion,
      databaseHealth,
      syncStatus,
      duplicateTracking
    ] = await Promise.all([
      getExternalIdCoverage(),
      getMetadataCompletion(),
      getDatabaseHealth(),
      getSyncStatus(),
      getDuplicateTracking()
    ]);

    const result = {
      externalIdCoverage,
      metadataCompletion,
      databaseHealth,
      syncStatus,
      duplicateTracking
    };

    logger.info('getAllInsights completed successfully');
    return result;
  } catch (err) {
    logger.error(`Error in getAllInsights: ${err.message}`);
    throw err;
  }
}