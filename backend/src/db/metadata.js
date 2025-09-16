import { getPool } from './connection.js';
import logger from '../utils/logger.js';

const pool = () => getPool();

// Set a metadata value
export async function setMetadata(key, value) {
  logger.info(`Setting metadata: ${key} = ${value}`);

  try {
    const query = `
      INSERT INTO metadata (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = NOW()
    `;

    await pool().query(query, [key, value]);
    logger.info(`Successfully set metadata: ${key}`);
  } catch (err) {
    logger.error(`Error setting metadata ${key}: ${err.message}`);
    throw err;
  }
}

// Get a metadata value
export async function getMetadata(key) {
  try {
    const query = `SELECT value FROM metadata WHERE key = $1`;
    const result = await pool().query(query, [key]);

    if (result.rows.length > 0) {
      return result.rows[0].value;
    }
    return null;
  } catch (err) {
    logger.error(`Error getting metadata ${key}: ${err.message}`);
    throw err;
  }
}

// Get multiple metadata values
export async function getMultipleMetadata(keys) {
  try {
    const query = `SELECT key, value FROM metadata WHERE key = ANY($1)`;
    const result = await pool().query(query, [keys]);

    const metadata = {};
    result.rows.forEach(row => {
      metadata[row.key] = row.value;
    });

    return metadata;
  } catch (err) {
    logger.error(`Error getting multiple metadata: ${err.message}`);
    throw err;
  }
}

// Update sync statistics
export async function updateSyncStats(syncResult) {
  const {
    method,
    success,
    addedPlays = 0,
    processedTracks = 0,
    startTime,
    endTime,
    error = null
  } = syncResult;

  try {
    // Get current counts
    const currentStats = await getMultipleMetadata([
      'total_syncs',
      'failed_syncs',
      'total_plays_synced'
    ]);

    const totalSyncs = parseInt(currentStats.total_syncs || '0') + 1;
    const failedSyncs = parseInt(currentStats.failed_syncs || '0') + (success ? 0 : 1);
    const totalPlaysSynced = parseInt(currentStats.total_plays_synced || '0') + addedPlays;

    // Calculate duration if times provided
    let duration = null;
    if (startTime && endTime) {
      duration = Math.round((new Date(endTime) - new Date(startTime)) / 1000);
    }

    // Update all sync-related metadata
    const updates = [
      ['last_sync_time', endTime || new Date().toISOString()],
      ['sync_method', method],
      ['total_syncs', totalSyncs.toString()],
      ['failed_syncs', failedSyncs.toString()],
      ['total_plays_synced', totalPlaysSynced.toString()],
      ['last_sync_records_added', addedPlays.toString()],
      ['last_sync_processed_tracks', processedTracks.toString()],
      ['last_sync_success', success.toString()]
    ];

    if (duration !== null) {
      updates.push(['last_sync_duration', duration.toString()]);
    }

    if (error) {
      updates.push(['last_sync_error', error]);
    }

    // Execute all updates in a transaction
    const client = await pool().connect();
    try {
      await client.query('BEGIN');

      for (const [key, value] of updates) {
        await client.query(`
          INSERT INTO metadata (key, value, updated_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (key) DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = NOW()
        `, [key, value]);
      }

      await client.query('COMMIT');
      logger.info(`Updated sync statistics: ${addedPlays} plays added, total syncs: ${totalSyncs}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    logger.error(`Error updating sync stats: ${err.message}`);
    throw err;
  }
}

// Get sync statistics summary
export async function getSyncStats() {
  try {
    const keys = [
      'last_sync_time',
      'sync_method',
      'total_syncs',
      'failed_syncs',
      'total_plays_synced',
      'last_sync_records_added',
      'last_sync_processed_tracks',
      'last_sync_success',
      'last_sync_duration',
      'last_sync_error'
    ];

    const metadata = await getMultipleMetadata(keys);

    return {
      lastSyncTime: metadata.last_sync_time || null,
      syncMethod: metadata.sync_method || 'unknown',
      totalSyncs: parseInt(metadata.total_syncs || '0'),
      failedSyncs: parseInt(metadata.failed_syncs || '0'),
      totalPlaysSynced: parseInt(metadata.total_plays_synced || '0'),
      lastSyncRecordsAdded: parseInt(metadata.last_sync_records_added || '0'),
      lastSyncProcessedTracks: parseInt(metadata.last_sync_processed_tracks || '0'),
      lastSyncSuccess: metadata.last_sync_success === 'true',
      lastSyncDuration: parseInt(metadata.last_sync_duration || '0'),
      lastSyncError: metadata.last_sync_error || null
    };
  } catch (err) {
    logger.error(`Error getting sync stats: ${err.message}`);
    throw err;
  }
}

// Update deduplication statistics
export async function updateDeduplicationStats(deduplicationResult) {
  const {
    duplicatesFound = 0,
    duplicatesCleaned = 0,
    recordsMerged = 0,
    recordsDeleted = 0,
    success = true
  } = deduplicationResult;

  try {
    const updates = [
      ['last_deduplication_run', new Date().toISOString()],
      ['duplicates_found', duplicatesFound.toString()],
      ['duplicates_cleaned', duplicatesCleaned.toString()],
      ['total_records_merged', recordsMerged.toString()],
      ['total_records_deleted', recordsDeleted.toString()],
      ['last_deduplication_success', success.toString()]
    ];

    for (const [key, value] of updates) {
      await setMetadata(key, value);
    }

    logger.info(`Updated deduplication statistics: ${duplicatesCleaned} duplicates cleaned`);
  } catch (err) {
    logger.error(`Error updating deduplication stats: ${err.message}`);
    throw err;
  }
}