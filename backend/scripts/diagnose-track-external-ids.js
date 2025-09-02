#!/usr/bin/env node

// Load environment variables
import 'dotenv/config';

import { initializeDatabase, getPool } from '../src/db/db.js';
import logger from '../src/utils/logger.js';

class TrackExternalIdsDiagnostic {
  constructor() {
    this.pool = null;
  }

  async initialize() {
    logger.info('🎵 Track External IDs Diagnostic Tool');
    
    initializeDatabase();
    this.pool = getPool();
    
    logger.info('✅ Database connection initialized');
  }

  async diagnose() {
    try {
      await this.initialize();
      
      // 1. Check track-external_ids linkage
      logger.info('\n📊 Checking track-external_ids linkage...');
      
      const linkageQuery = `
        SELECT 
          (SELECT COUNT(*) FROM tracks) as total_tracks,
          (SELECT COUNT(DISTINCT entity_id) FROM external_ids WHERE entity_type = 'track' AND source = 'spotify') as tracks_with_correct_external_ids,
          (SELECT COUNT(*) FROM tracks t WHERE NOT EXISTS (SELECT 1 FROM external_ids ei WHERE ei.entity_id = t.id AND ei.entity_type = 'track' AND ei.source = 'spotify')) as tracks_without_external_ids
      `;
      
      const linkageResult = await this.pool.query(linkageQuery);
      const linkageStats = linkageResult.rows[0];
      
      logger.info(`   Total tracks: ${linkageStats.total_tracks}`);
      logger.info(`   Tracks with correct external_ids: ${linkageStats.tracks_with_correct_external_ids}`);
      logger.info(`   Tracks WITHOUT external_ids: ${linkageStats.tracks_without_external_ids}`);

      // 2. Check for external_ids pointing to tracks but with wrong entity_type
      logger.info('\n🔍 Checking for tracks with incorrect entity_type in external_ids...');
      
      const incorrectTypeQuery = `
        SELECT 
          COUNT(*) as total_incorrect,
          COUNT(CASE WHEN ei.entity_type = 'artist' THEN 1 END) as marked_as_artist,
          COUNT(CASE WHEN ei.entity_type = 'album' THEN 1 END) as marked_as_album,
          COUNT(CASE WHEN ei.entity_type NOT IN ('track', 'artist', 'album') THEN 1 END) as other_types
        FROM external_ids ei
        JOIN tracks t ON ei.entity_id = t.id
        WHERE ei.source = 'spotify' 
          AND ei.external_id LIKE 'spotify:track:%'
          AND ei.entity_type != 'track'
      `;
      
      const incorrectResult = await this.pool.query(incorrectTypeQuery);
      const incorrectStats = incorrectResult.rows[0];
      
      logger.info(`   Tracks with incorrect entity_type: ${incorrectStats.total_incorrect}`);
      logger.info(`   Marked as 'artist': ${incorrectStats.marked_as_artist}`);
      logger.info(`   Marked as 'album': ${incorrectStats.marked_as_album}`);
      logger.info(`   Other types: ${incorrectStats.other_types}`);

      // 3. Show sample tracks with incorrect entity_type
      if (parseInt(incorrectStats.total_incorrect) > 0) {
        logger.info('\n📋 Sample tracks with incorrect entity_type:');
        
        const sampleIncorrectQuery = `
          SELECT t.id, t.name, ei.entity_type, ei.external_id
          FROM tracks t
          JOIN external_ids ei ON t.id = ei.entity_id
          WHERE ei.source = 'spotify' 
            AND ei.external_id LIKE 'spotify:track:%'
            AND ei.entity_type != 'track'
          LIMIT 10
        `;
        
        const sampleIncorrectResult = await this.pool.query(sampleIncorrectQuery);
        
        sampleIncorrectResult.rows.forEach((row, idx) => {
          logger.info(`   ${idx + 1}. ID: ${row.id}, Name: "${row.name}", Entity Type: ${row.entity_type}, URI: ${row.external_id}`);
        });
      }

      // 4. Check tracks without external_ids (with artist info)
      if (parseInt(linkageStats.tracks_without_external_ids) > 0) {
        logger.info('\n📋 Sample tracks without external_ids:');
        
        const unlinkedQuery = `
          SELECT 
            t.id, 
            t.name as track_name, 
            t.last_fetched,
            string_agg(DISTINCT ar.name, ', ') as artist_names,
            a.name as album_name
          FROM tracks t
          JOIN track_artists ta ON t.id = ta.track_id
          JOIN artists ar ON ta.artist_id = ar.id
          LEFT JOIN track_albums tal ON t.id = tal.track_id
          LEFT JOIN albums a ON tal.album_id = a.id
          WHERE NOT EXISTS (
            SELECT 1 FROM external_ids ei 
            WHERE ei.entity_id = t.id 
              AND ei.entity_type = 'track' 
              AND ei.source = 'spotify'
          )
          GROUP BY t.id, t.name, t.last_fetched, a.name
          ORDER BY t.id
          LIMIT 15
        `;
        
        const unlinkedResult = await this.pool.query(unlinkedQuery);
        
        unlinkedResult.rows.forEach((row, idx) => {
          const albumInfo = row.album_name ? ` from "${row.album_name}"` : '';
          logger.info(`   ${idx + 1}. ID: ${row.id}, Track: "${row.track_name}" by ${row.artist_names}${albumInfo}, Last Fetched: ${row.last_fetched || 'NULL'}`);
        });
      }

      // 5. Check tracks with old last_fetched
      logger.info('\n📅 Checking tracks with old last_fetched...');
      
      const oldFetchedQuery = `
        SELECT 
          COUNT(*) as total_old_fetched,
          COUNT(CASE WHEN last_fetched IS NULL THEN 1 END) as never_fetched,
          COUNT(CASE WHEN last_fetched < '2025-09-02'::date THEN 1 END) as old_fetched_total
        FROM tracks
        WHERE last_fetched IS NULL OR last_fetched < '2025-09-02'::date
      `;
      
      const oldFetchedResult = await this.pool.query(oldFetchedQuery);
      const oldStats = oldFetchedResult.rows[0];
      
      logger.info(`   Tracks with old last_fetched: ${oldStats.total_old_fetched}`);
      logger.info(`   Never fetched: ${oldStats.never_fetched}`);
      logger.info(`   Old fetched (< 2025-09-02): ${oldStats.old_fetched_total}`);

      // 6. Check track complexity (multiple artists/albums)
      logger.info('\n🔗 Analyzing track complexity...');
      
      const complexityQuery = `
        SELECT 
          COUNT(*) as total_tracks_with_artists,
          COUNT(CASE WHEN artist_count = 1 THEN 1 END) as single_artist_tracks,
          COUNT(CASE WHEN artist_count > 1 THEN 1 END) as multi_artist_tracks,
          COUNT(CASE WHEN album_count > 0 THEN 1 END) as tracks_with_albums,
          AVG(artist_count) as avg_artists_per_track
        FROM (
          SELECT 
            t.id,
            COUNT(DISTINCT ta.artist_id) as artist_count,
            COUNT(DISTINCT tal.album_id) as album_count
          FROM tracks t
          LEFT JOIN track_artists ta ON t.id = ta.track_id
          LEFT JOIN track_albums tal ON t.id = tal.track_id
          GROUP BY t.id
        ) track_stats
      `;
      
      const complexityResult = await this.pool.query(complexityQuery);
      const complexityStats = complexityResult.rows[0];
      
      logger.info(`   Tracks with artists linked: ${complexityStats.total_tracks_with_artists}`);
      logger.info(`   Single artist tracks: ${complexityStats.single_artist_tracks}`);
      logger.info(`   Multi-artist tracks: ${complexityStats.multi_artist_tracks}`);
      logger.info(`   Tracks with albums: ${complexityStats.tracks_with_albums}`);
      logger.info(`   Average artists per track: ${parseFloat(complexityStats.avg_artists_per_track).toFixed(2)}`);

      // 7. Check external_ids that might be orphaned
      logger.info('\n🔗 Checking track external_ids integrity...');
      
      const orphanedQuery = `
        SELECT 
          COUNT(*) as total_spotify_track_externals,
          COUNT(CASE WHEN NOT EXISTS (SELECT 1 FROM tracks t WHERE t.id = ei.entity_id) THEN 1 END) as orphaned_externals
        FROM external_ids ei
        WHERE ei.source = 'spotify' AND ei.external_id LIKE 'spotify:track:%'
      `;
      
      const orphanedResult = await this.pool.query(orphanedQuery);
      const orphanedStats = orphanedResult.rows[0];
      
      logger.info(`   Total Spotify track external_ids: ${orphanedStats.total_spotify_track_externals}`);
      logger.info(`   Orphaned external_ids (no matching track): ${orphanedStats.orphaned_externals}`);

      // 8. Sample tracks with existing external_ids for comparison
      logger.info('\n📋 Sample tracks with existing external_ids:');
      
      const existingQuery = `
        SELECT 
          t.id, 
          t.name as track_name, 
          string_agg(DISTINCT ar.name, ', ') as artist_names,
          ei.external_id,
          t.last_fetched
        FROM tracks t
        JOIN external_ids ei ON t.id = ei.entity_id AND ei.entity_type = 'track' AND ei.source = 'spotify'
        JOIN track_artists ta ON t.id = ta.track_id
        JOIN artists ar ON ta.artist_id = ar.id
        WHERE t.last_fetched IS NULL OR t.last_fetched < '2025-09-02'::date
        GROUP BY t.id, t.name, ei.external_id, t.last_fetched
        ORDER BY t.id
        LIMIT 10
      `;
      
      const existingResult = await this.pool.query(existingQuery);
      
      existingResult.rows.forEach((row, idx) => {
        logger.info(`   ${idx + 1}. ID: ${row.id}, Track: "${row.track_name}" by ${row.artist_names}, URI: ${row.external_id}, Last Fetched: ${row.last_fetched || 'NULL'}`);
      });

    } catch (error) {
      logger.error(`💥 Diagnostic failed: ${error.message}`);
      throw error;
    } finally {
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}

// Run the diagnostic
const diagnostic = new TrackExternalIdsDiagnostic();
diagnostic.diagnose().catch(error => {
  logger.error(`Fatal error: ${error.message}`);
  process.exit(1);
});