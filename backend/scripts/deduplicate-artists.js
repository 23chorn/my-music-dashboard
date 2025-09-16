#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config({ path: '.env' });

// Set timezone for the application
process.env.TZ = process.env.TZ || 'Europe/London';

import { initializeDatabase, getPool, closeDatabase } from '../src/db/connection.js';
import { updateDeduplicationStats } from '../src/db/metadata.js';
import logger from '../src/utils/logger.js';

class ArtistDeduplicator {
  constructor(dryRun = true) {
    this.dryRun = dryRun;
    this.pool = null;
  }

  async initialize() {
    initializeDatabase();
    this.pool = getPool();
    logger.info(`Artist deduplication script started (dry-run: ${this.dryRun})`);
  }

  async findDuplicateArtists() {
    const query = `
      SELECT
        TRIM(name) as name,
        array_agg(id ORDER BY id) as artist_ids,
        count(*) as duplicate_count
      FROM artists
      GROUP BY LOWER(TRIM(name)), TRIM(name)
      HAVING count(*) > 1
      ORDER BY duplicate_count DESC, TRIM(name)
    `;

    const result = await this.pool.query(query);
    logger.info(`Found ${result.rows.length} sets of duplicate artist names`);

    return result.rows;
  }

  async getArtistWithExternalIds(artistIds) {
    const query = `
      SELECT
        a.id,
        a.name,
        a.image_url,
        a.last_fetched,
        CASE WHEN e.entity_id IS NOT NULL THEN true ELSE false END as has_external_id,
        array_agg(DISTINCT e.source) FILTER (WHERE e.source IS NOT NULL) as external_sources
      FROM artists a
      LEFT JOIN external_ids e ON e.entity_type = 'artist' AND e.entity_id = a.id
      WHERE a.id = ANY($1)
      GROUP BY a.id, a.name, a.image_url, a.last_fetched, (e.entity_id IS NOT NULL)
      ORDER BY has_external_id DESC, a.id ASC
    `;

    const result = await this.pool.query(query, [artistIds]);
    return result.rows;
  }

  async getArtistRelationshipCounts(artistId) {
    const queries = [
      { name: 'track_artists', query: 'SELECT count(*) as count FROM track_artists WHERE artist_id = $1' },
      { name: 'album_artists', query: 'SELECT count(*) as count FROM album_artists WHERE artist_id = $1' },
      { name: 'artist_genres', query: 'SELECT count(*) as count FROM artist_genres WHERE artist_id = $1' }
    ];

    const counts = {};
    for (const { name, query } of queries) {
      const result = await this.pool.query(query, [artistId]);
      counts[name] = parseInt(result.rows[0].count);
    }

    return counts;
  }

  async updateTrackArtists(fromArtistId, toArtistId) {
    if (this.dryRun) {
      const countQuery = 'SELECT count(*) as count FROM track_artists WHERE artist_id = $1';
      const result = await this.pool.query(countQuery, [fromArtistId]);
      return { action: 'would_update', count: parseInt(result.rows[0].count) };
    }

    // Step 1: Get tracks where the source artist is primary (we need to preserve this info)
    const primaryTracks = await this.pool.query(`
      SELECT track_id FROM track_artists
      WHERE artist_id = $1 AND is_primary = TRUE
    `, [fromArtistId]);

    const primaryTrackIds = primaryTracks.rows.map(row => row.track_id);

    // Step 2: Clear primary status from source artist to prevent constraint violations
    await this.pool.query(`
      UPDATE track_artists
      SET is_primary = FALSE
      WHERE artist_id = $1 AND is_primary = TRUE
    `, [fromArtistId]);

    // Step 3: Insert relationships for tracks where target artist doesn't exist
    let result1;
    if (primaryTrackIds.length > 0) {
      result1 = await this.pool.query(`
        INSERT INTO track_artists (track_id, artist_id, is_primary)
        SELECT ta.track_id, $2,
          CASE
            WHEN ta.track_id = ANY($3::INTEGER[]) THEN TRUE
            ELSE ta.is_primary
          END as is_primary
        FROM track_artists ta
        WHERE ta.artist_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM track_artists existing
            WHERE existing.track_id = ta.track_id AND existing.artist_id = $2
          )
      `, [fromArtistId, toArtistId, primaryTrackIds]);
    } else {
      result1 = await this.pool.query(`
        INSERT INTO track_artists (track_id, artist_id, is_primary)
        SELECT ta.track_id, $2, ta.is_primary
        FROM track_artists ta
        WHERE ta.artist_id = $1
          AND NOT EXISTS (
            SELECT 1 FROM track_artists existing
            WHERE existing.track_id = ta.track_id AND existing.artist_id = $2
          )
      `, [fromArtistId, toArtistId]);
    }

    // Step 4: For tracks where target artist already exists, make it primary if source was primary
    let result2 = { rowCount: 0 };
    if (primaryTrackIds.length > 0) {
      result2 = await this.pool.query(`
        UPDATE track_artists
        SET is_primary = TRUE
        WHERE artist_id = $1
          AND track_id = ANY($2::INTEGER[])
          AND is_primary = FALSE
      `, [toArtistId, primaryTrackIds]);
    }

    return { action: 'updated', count: result1.rowCount + result2.rowCount };
  }

  async updateReferences(fromArtistId, toArtistId) {
    // Handle track_artists specially due to primary artist constraint
    const trackArtistsResult = await this.updateTrackArtists(fromArtistId, toArtistId);

    const updateQueries = [
      {
        name: 'album_artists',
        query: `
          INSERT INTO album_artists (album_id, artist_id)
          SELECT album_id, $2
          FROM album_artists
          WHERE artist_id = $1
          ON CONFLICT (album_id, artist_id) DO NOTHING
        `
      },
      {
        name: 'artist_genres',
        query: `
          INSERT INTO artist_genres (artist_id, genre_id)
          SELECT $2, genre_id
          FROM artist_genres
          WHERE artist_id = $1
          ON CONFLICT (artist_id, genre_id) DO NOTHING
        `
      }
    ];

    const results = { track_artists: trackArtistsResult };

    for (const { name, query } of updateQueries) {
      if (this.dryRun) {
        // For dry run, just count existing relationships that would be moved
        let countQuery;
        if (name === 'album_artists') {
          countQuery = 'SELECT count(*) as count FROM album_artists WHERE artist_id = $1';
        } else if (name === 'artist_genres') {
          countQuery = 'SELECT count(*) as count FROM artist_genres WHERE artist_id = $1';
        }
        const result = await this.pool.query(countQuery, [fromArtistId]);
        results[name] = { action: 'would_update', count: parseInt(result.rows[0].count) };
      } else {
        const result = await this.pool.query(query, [fromArtistId, toArtistId]);
        results[name] = { action: 'updated', count: result.rowCount };
      }
    }

    return results;
  }

  async deleteArtist(artistId) {
    if (this.dryRun) {
      logger.info(`[DRY RUN] Would delete artist ID: ${artistId}`);
      return { action: 'would_delete', artistId };
    } else {
      // First delete from track_artists, album_artists, artist_genres to avoid constraint issues
      await this.pool.query('DELETE FROM track_artists WHERE artist_id = $1', [artistId]);
      await this.pool.query('DELETE FROM album_artists WHERE artist_id = $1', [artistId]);
      await this.pool.query('DELETE FROM artist_genres WHERE artist_id = $1', [artistId]);

      // Then delete the artist
      const result = await this.pool.query('DELETE FROM artists WHERE id = $1', [artistId]);
      logger.info(`Deleted artist ID: ${artistId}`);
      return { action: 'deleted', artistId, rowCount: result.rowCount };
    }
  }

  async processArtistGroup(duplicateGroup) {
    const { name, artist_ids } = duplicateGroup;
    logger.info(`\n--- Processing duplicate group: "${name}" (${artist_ids.length} duplicates) ---`);

    // Get detailed info about each artist including external ID status
    const artists = await this.getArtistWithExternalIds(artist_ids);

    // Find the artist to keep (prioritize those with external IDs, then lowest ID)
    const artistsWithExternalIds = artists.filter(a => a.has_external_id);
    const artistToKeep = artistsWithExternalIds.length > 0
      ? artistsWithExternalIds[0]  // First one with external ID
      : artists[0];  // If none have external IDs, keep the first (lowest ID)

    const artistsToDelete = artists.filter(a => a.id !== artistToKeep.id);

    logger.info(`Keeping artist: ID ${artistToKeep.id} (has_external_id: ${artistToKeep.has_external_id}, sources: ${artistToKeep.external_sources?.join(', ') || 'none'})`);

    let totalReferencesUpdated = 0;

    // Process each artist to delete
    for (const artistToDelete of artistsToDelete) {
      logger.info(`\nProcessing artist to delete: ID ${artistToDelete.id} (has_external_id: ${artistToDelete.has_external_id})`);

      // Get relationship counts
      const relationshipCounts = await this.getArtistRelationshipCounts(artistToDelete.id);
      logger.info(`  Relationships: tracks=${relationshipCounts.track_artists}, albums=${relationshipCounts.album_artists}, genres=${relationshipCounts.artist_genres}`);

      // Update references to point to the kept artist
      if (relationshipCounts.track_artists > 0 || relationshipCounts.album_artists > 0 || relationshipCounts.artist_genres > 0) {
        const updateResults = await this.updateReferences(artistToDelete.id, artistToKeep.id);
        logger.info(`  Reference updates:`, updateResults);

        totalReferencesUpdated += Object.values(updateResults).reduce((sum, result) => sum + result.count, 0);
      }

      // Delete the duplicate artist
      const deleteResult = await this.deleteArtist(artistToDelete.id);
      logger.info(`  Deletion result:`, deleteResult);
    }

    return {
      groupName: name,
      keptArtist: artistToKeep,
      deletedArtists: artistsToDelete,
      totalReferencesUpdated
    };
  }

  async run() {
    try {
      await this.initialize();

      // Find all duplicate artist groups
      const duplicateGroups = await this.findDuplicateArtists();

      if (duplicateGroups.length === 0) {
        logger.info('No duplicate artists found.');
        return;
      }

      logger.info(`\nProcessing ${duplicateGroups.length} duplicate artist groups...\n`);

      const results = [];
      let totalDeleted = 0;
      let totalReferencesUpdated = 0;

      // Use a transaction if not in dry-run mode
      const client = await this.pool.connect();

      try {
        if (!this.dryRun) {
          await client.query('BEGIN');
        }

        // Process each duplicate group
        for (const group of duplicateGroups) {
          const result = await this.processArtistGroup(group);
          results.push(result);
          totalDeleted += result.deletedArtists.length;
          totalReferencesUpdated += result.totalReferencesUpdated;
        }

        if (!this.dryRun) {
          await client.query('COMMIT');
          logger.info('\nTransaction committed successfully.');
        }

      } catch (error) {
        if (!this.dryRun) {
          await client.query('ROLLBACK');
          logger.error('Transaction rolled back due to error:', error);
        }
        throw error;
      } finally {
        client.release();
      }

      // Summary
      logger.info(`\n=== DEDUPLICATION SUMMARY ===`);
      logger.info(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE RUN'}`);
      logger.info(`Duplicate groups processed: ${duplicateGroups.length}`);
      logger.info(`Artists ${this.dryRun ? 'that would be deleted' : 'deleted'}: ${totalDeleted}`);
      logger.info(`References ${this.dryRun ? 'that would be updated' : 'updated'}: ${totalReferencesUpdated}`);

      // Update deduplication statistics (only for live runs)
      if (!this.dryRun) {
        try {
          await updateDeduplicationStats({
            duplicatesFound: duplicateGroups.reduce((sum, group) => sum + group.artist_ids.length - 1, 0),
            duplicatesCleaned: totalDeleted,
            recordsMerged: totalReferencesUpdated,
            recordsDeleted: totalDeleted,
            success: true
          });
          logger.info('Updated deduplication metadata');
        } catch (metadataError) {
          logger.error(`Failed to update deduplication metadata: ${metadataError.message}`);
        }
      }

      return results;

    } catch (error) {
      logger.error('Error during artist deduplication:', error);
      throw error;
    } finally {
      await closeDatabase();
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');

  if (dryRun) {
    console.log('Running in DRY RUN mode. Use --execute flag to actually perform the deduplication.');
  } else {
    console.log('Running in EXECUTION mode. Changes will be made to the database.');
    console.log('Press Ctrl+C within 5 seconds to cancel...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  const deduplicator = new ArtistDeduplicator(dryRun);
  await deduplicator.run();
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ArtistDeduplicator;