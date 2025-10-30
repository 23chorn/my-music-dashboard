#!/usr/bin/env node

import { config } from 'dotenv';
import { initializeDatabase, getPool } from '../src/db/connection.js';

config();

async function debugArtistDuplication() {
  try {
    await initializeDatabase();

    console.log('🔍 Debugging artist duplication in track_artists table...\n');

    // Check for duplicate entries for a specific track
    const duplicateQuery = `
      SELECT
        ta.track_id,
        ta.artist_id,
        ar.name as artist_name,
        COUNT(*) as occurrence_count
      FROM track_artists ta
      JOIN artists ar ON ta.artist_id = ar.id
      WHERE ta.track_id = 12896
      GROUP BY ta.track_id, ta.artist_id, ar.name
      ORDER BY occurrence_count DESC
    `;

    const duplicateResult = await getPool().query(duplicateQuery);
    console.log('Track-artist relationships for track 12896 (Drugs You Should Try It):');
    duplicateResult.rows.forEach(row => {
      console.log(`  Artist: ${row.artist_name} (ID: ${row.artist_id}) - Appears ${row.occurrence_count} times`);
    });

    // Check if there are constraints
    const constraintQuery = `
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'track_artists'
    `;

    const constraintResult = await getPool().query(constraintQuery);
    console.log('\nConstraints on track_artists table:');
    constraintResult.rows.forEach(row => {
      console.log(`  ${row.constraint_name}: ${row.constraint_type}`);
    });

    // Check total duplicate entries across the table
    const totalDuplicatesQuery = `
      SELECT
        COUNT(*) as total_entries,
        COUNT(DISTINCT track_id, artist_id) as unique_combinations,
        COUNT(*) - COUNT(DISTINCT track_id, artist_id) as duplicate_entries
      FROM track_artists
    `;

    const totalResult = await getPool().query(totalDuplicatesQuery);
    const stats = totalResult.rows[0];
    console.log('\nOverall track_artists table statistics:');
    console.log(`  Total entries: ${stats.total_entries}`);
    console.log(`  Unique combinations: ${stats.unique_combinations}`);
    console.log(`  Duplicate entries: ${stats.duplicate_entries}`);

    if (parseInt(stats.duplicate_entries) > 0) {
      console.log('\n⚠️  Found duplicate entries in track_artists table!');
      console.log('   This explains the artist name duplication in the API.');
      console.log('   Consider cleaning up duplicates and adding a unique constraint.');
    } else {
      console.log('\n✅ No duplicate entries found in track_artists table.');
    }

  } catch (error) {
    console.error('Error debugging artist duplication:', error);
    process.exit(1);
  }

  process.exit(0);
}

debugArtistDuplication();