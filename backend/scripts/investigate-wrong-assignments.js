#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pkg from 'pg';
const { Pool } = pkg;

// Database configuration
function getDatabaseConfig() {
  const dbMode = process.env.DB_MODE || 'production';
  const databaseUrl = dbMode === 'test' ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error(`Database URL not configured for mode: ${dbMode}`);
  }
  
  return {
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
}

async function investigateWrongAssignments() {
  const pool = new Pool(getDatabaseConfig());
  
  try {
    console.log('🔍 Investigating wrong artist assignments...\n');
    
    // Check the specific "Think Twice" case
    console.log('🎵 Checking "Think Twice" tracks:');
    const thinkTwiceQuery = `
      SELECT 
        t.id, 
        t.name as track_name,
        STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC, a.name) as artists,
        al.name as album_name,
        al.id as album_id
      FROM tracks t 
      JOIN track_artists ta ON t.id = ta.track_id 
      JOIN artists a ON ta.artist_id = a.id 
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      WHERE t.name ILIKE '%Think Twice%'
      GROUP BY t.id, t.name, al.name, al.id
      ORDER BY t.name;
    `;
    
    const thinkTwiceResults = await pool.query(thinkTwiceQuery);
    thinkTwiceResults.rows.forEach(row => {
      console.log(`   • Track: "${row.track_name}"`);
      console.log(`     Artists: ${row.artists}`);
      console.log(`     Album: ${row.album_name || 'No album'}`);
      console.log('');
    });
    
    // Look for classical artists on non-classical albums
    console.log('🎼 Checking for classical artists on hip-hop/rap albums:');
    const classicalOnRapQuery = `
      SELECT 
        t.name as track_name,
        STRING_AGG(DISTINCT a.name, ', ') as artists,
        al.name as album_name,
        COUNT(*) as play_count
      FROM tracks t 
      JOIN track_artists ta ON t.id = ta.track_id 
      JOIN artists a ON ta.artist_id = a.id 
      LEFT JOIN track_albums tal ON t.id = tal.track_id
      LEFT JOIN albums al ON tal.album_id = al.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE (
        a.name ILIKE '%Bach%' OR 
        a.name ILIKE '%Mozart%' OR 
        a.name ILIKE '%Beethoven%' OR
        a.name ILIKE '%Chopin%' OR
        a.name ILIKE '%Brahms%' OR
        a.name ILIKE '%Vivaldi%'
      )
      AND al.name IS NOT NULL
      AND (
        al.name ILIKE '%hip%hop%' OR
        al.name ILIKE '%rap%' OR
        al.name ILIKE '%Pete Rock%' OR
        al.name ILIKE '%Center of Attention%'
      )
      GROUP BY t.name, al.name
      ORDER BY COUNT(*) DESC
      LIMIT 10;
    `;
    
    const classicalResults = await pool.query(classicalOnRapQuery);
    if (classicalResults.rows.length > 0) {
      classicalResults.rows.forEach(row => {
        console.log(`   • "${row.track_name}" by ${row.artists}`);
        console.log(`     Album: ${row.album_name} (${row.play_count} plays)`);
        console.log('');
      });
    } else {
      console.log('   No obvious classical/rap mismatches found with album context');
    }
    
    // Look for Pete Rock tracks assigned to classical artists
    console.log('🎤 Checking Pete Rock album tracks with wrong artists:');
    const peteRockQuery = `
      SELECT 
        t.name as track_name,
        STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC) as artists,
        al.name as album_name,
        COUNT(p.id) as play_count
      FROM albums al
      JOIN track_albums tal ON al.id = tal.album_id
      JOIN tracks t ON tal.track_id = t.id
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE al.name ILIKE '%Center of Attention%'
      GROUP BY t.name, al.name
      ORDER BY play_count DESC
      LIMIT 10;
    `;
    
    const peteRockResults = await pool.query(peteRockQuery);
    if (peteRockResults.rows.length > 0) {
      console.log('   Center of Attention album tracks:');
      peteRockResults.rows.forEach(row => {
        console.log(`   • "${row.track_name}" by ${row.artists} (${row.play_count} plays)`);
      });
    }
    
    // Look for suspicious genre mismatches with external IDs
    console.log('\n🔍 Looking for tracks with suspicious artist/external ID combinations:');
    const suspiciousQuery = `
      SELECT 
        t.name as track_name,
        STRING_AGG(DISTINCT a.name, ', ') as artists,
        ei.external_id,
        COUNT(p.id) as play_count
      FROM tracks t
      JOIN external_ids ei ON t.id = ei.entity_id AND ei.entity_type = 'track'
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      LEFT JOIN plays p ON t.id = p.track_id
      WHERE (
        (a.name ILIKE '%Bach%' OR a.name ILIKE '%Classical%' OR a.name ILIKE '%Orchestra%') 
        AND t.name NOT ILIKE '%classical%' 
        AND t.name NOT ILIKE '%symphony%'
        AND t.name NOT ILIKE '%concerto%'
      ) OR (
        (a.name ILIKE '%Pete Rock%' OR a.name ILIKE '%Danny Brown%' OR a.name ILIKE '%MF DOOM%')
        AND t.name ILIKE '%Bach%'
      )
      GROUP BY t.name, ei.external_id
      ORDER BY play_count DESC
      LIMIT 15;
    `;
    
    const suspiciousResults = await pool.query(suspiciousQuery);
    if (suspiciousResults.rows.length > 0) {
      suspiciousResults.rows.forEach(row => {
        console.log(`   • "${row.track_name}" by ${row.artists}`);
        console.log(`     Spotify ID: ${row.external_id} (${row.play_count} plays)`);
        console.log('');
      });
    } else {
      console.log('   No obvious suspicious combinations found');
    }
    
  } catch (error) {
    console.error('Error investigating:', error.message);
  } finally {
    await pool.end();
  }
}

investigateWrongAssignments();