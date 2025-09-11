#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Parse track titles for collaboration indicators
function parseTrackTitle(trackName) {
  // Common phrases that are NOT artist collaborations
  const falsePositives = [
    // Classic phrases/stories
    /bonnie\s*&\s*clyde/gi,
    /beauty\s*&\s*the\s*beast/gi,
    /jekyll\s*&\s*hyde/gi,
    /romeo\s*&\s*juliet/gi,
    /adam\s*&\s*eve/gi,
    /rock\s*&\s*roll/gi,
    /rhythm\s*&\s*blues/gi,
    /salt\s*&\s*pepper/gi,
    /thunder\s*&\s*lightning/gi,
    /fire\s*&\s*ice/gi,
    /love\s*&\s*hate/gi,
    /life\s*&\s*death/gi,
    /good\s*&\s*evil/gi,
    /black\s*&\s*white/gi,
    /night\s*&\s*day/gi,
    
    // Common non-artist words that might appear after &
    /\s*&\s*(?:the|a|an|and|or|but|so|yet|for|nor|on|in|at|by|with|from|to|of|as|is|was|are|were|be|been|being|have|has|had|do|does|did|will|would|could|should|may|might|must|can|shall)\b/gi,
    
    // Generic words unlikely to be artist names
    /\s*&\s*(?:love|hate|money|power|fame|success|life|death|time|world|music|sound|beat|flow|vibe|energy|soul|heart|mind|body|spirit|dream|hope|fear|pain|joy|peace|war|city|street|block|hood|game|business|work|play|party|club|dance|sing|rap|hip|hop|rock|pop|jazz|blues|funk|soul)\b/gi
  ];
  
  // Check if the track title contains any false positive patterns
  for (const pattern of falsePositives) {
    if (pattern.test(trackName)) {
      // If it's a false positive, only look for explicit collaboration indicators
      const explicitPatterns = [
        /\s+(?:feat\.?|featuring|ft\.?)\s+([^()]+)/gi,
        /\s+(?:with|w\/)\s+([^()]+)/gi,
        /\s+(?:vs\.?|versus)\s+([^()]+)/gi,
      ];
      
      return extractArtistsFromPatterns(trackName, explicitPatterns);
    }
  }
  
  // If no false positives detected, use all patterns including &
  const allPatterns = [
    /\s+(?:feat\.?|featuring|ft\.?)\s+([^()]+)/gi,
    /\s+(?:with|w\/)\s+([^()]+)/gi,
    /\s+&\s+([^()]+)/gi,
    /\s+(?:vs\.?|versus)\s+([^()]+)/gi,
    /\s+x\s+([^()]+)/gi
  ];
  
  return extractArtistsFromPatterns(trackName, allPatterns);
}

function extractArtistsFromPatterns(trackName, patterns) {
  const mentionedArtists = [];
  const commonNonArtistWords = [
    'the', 'a', 'an', 'and', 'or', 'but', 'so', 'yet', 'for', 'nor',
    'love', 'hate', 'money', 'power', 'fame', 'life', 'death', 'time',
    'world', 'music', 'beat', 'flow', 'remix', 'version', 'edit', 'mix',
    'intro', 'outro', 'interlude', 'skit', 'bonus', 'deluxe', 'clean', 'explicit'
  ];
  
  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(trackName)) !== null) {
      // Clean up the artist name
      let artistName = match[1].trim();
      
      // Remove common suffixes and clean up
      artistName = artistName.replace(/\s*\([^)]*\)$/, ''); // Remove parentheses at end
      artistName = artistName.replace(/\s*,.*$/, ''); // Remove everything after comma
      artistName = artistName.replace(/\s*&.*$/, ''); // Remove everything after & (for multi-name extracts)
      artistName = artistName.trim();
      
      // Skip if it's a common non-artist word
      if (commonNonArtistWords.includes(artistName.toLowerCase())) {
        continue;
      }
      
      // Skip very short names or single letters (unless they're known artist formats)
      if (artistName.length <= 1) {
        continue;
      }
      
      // Skip if it's all lowercase common words
      const words = artistName.split(/\s+/);
      const allCommonWords = words.every(word => 
        commonNonArtistWords.includes(word.toLowerCase()) || 
        /^[a-z]+$/.test(word) && word.length <= 3
      );
      
      if (!allCommonWords && artistName.length > 1) {
        mentionedArtists.push(artistName);
      }
    }
  });

  return [...new Set(mentionedArtists)]; // Remove duplicates
}

// Initialize Spotify API (simplified version)
class SpotifyAPI {
  constructor() {
    this.accessToken = null;
    this.baseURL = 'https://api.spotify.com/v1';
  }

  async authenticate() {
    if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
      throw new Error('Spotify credentials not configured');
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`Spotify auth failed: ${response.status}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
  }

  async getTrack(spotifyId) {
    if (!this.accessToken) {
      await this.authenticate();
    }

    const trackId = spotifyId.replace('spotify:track:', '');
    const response = await fetch(`${this.baseURL}/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // Track not found
      }
      throw new Error(`Spotify API error: ${response.status}`);
    }

    return await response.json();
  }
}

async function validateArtistRelationships() {
  const dbMode = process.env.DB_MODE || 'production';
  console.log(`🧑‍🎤 Validating artist relationships on ${dbMode.toUpperCase()} database\\n`);
  
  const pool = new Pool(getDatabaseConfig());
  const spotify = new SpotifyAPI();
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected');
    
    // Test Spotify API
    console.log('🎵 Testing Spotify API...');
    try {
      await spotify.authenticate();
      console.log('   ✅ Spotify API authenticated\\n');
    } catch (error) {
      console.log(`   ⚠️  Spotify API unavailable: ${error.message}`);
      console.log('   Will skip Spotify validation\\n');
    }
    
    // 1. Find tracks with collaboration indicators in title but single artist
    console.log('🔍 Finding tracks with collaboration indicators but single artist...');
    const singleArtistQuery = `
      SELECT 
        t.id as track_id,
        t.name as track_name,
        COUNT(ta.artist_id) as artist_count,
        STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC, a.name) as artists
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      WHERE (
        LOWER(t.name) LIKE '%feat.%' OR 
        LOWER(t.name) LIKE '%ft.%' OR 
        LOWER(t.name) LIKE '%featuring%' OR
        LOWER(t.name) LIKE '% & %' OR
        LOWER(t.name) LIKE '% with %' OR
        LOWER(t.name) LIKE '% vs %' OR
        LOWER(t.name) LIKE '% x %'
      )
      GROUP BY t.id, t.name
      HAVING COUNT(ta.artist_id) = 1
      ORDER BY t.name
      LIMIT 10
    `;
    
    const singleArtistTracks = await pool.query(singleArtistQuery);
    console.log(`   Found ${singleArtistTracks.rows.length} tracks with collaboration indicators but single artist`);
    
    const collaborationIssues = [];
    
    if (singleArtistTracks.rows.length > 0) {
      console.log('\\n📋 Tracks that might be missing collaborating artists:');
      
      for (const track of singleArtistTracks.rows.slice(0, 5)) {
        const mentionedArtists = parseTrackTitle(track.track_name);
        console.log(`   • "${track.track_name}" by ${track.artists}`);
        
        if (mentionedArtists.length > 0) {
          console.log(`     Mentioned artists: ${mentionedArtists.join(', ')}`);
          collaborationIssues.push({
            trackId: track.track_id,
            trackName: track.track_name,
            currentArtists: track.artists,
            mentionedArtists: mentionedArtists
          });
        }
      }
    }
    
    // 2. Find tracks with Spotify IDs to validate against Spotify API
    console.log('\\n🎵 Checking tracks with Spotify IDs for missing artists...');
    const spotifyTracksQuery = `
      SELECT 
        t.id as track_id,
        t.name as track_name,
        ei.external_id as spotify_id,
        COUNT(ta.artist_id) as current_artist_count,
        STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC, a.name) as current_artists
      FROM tracks t
      JOIN external_ids ei ON t.id = ei.entity_id AND ei.entity_type = 'track' AND ei.source = 'spotify'
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      GROUP BY t.id, t.name, ei.external_id
      HAVING COUNT(ta.artist_id) = 1  -- Only check single-artist tracks
      ORDER BY t.name
      LIMIT 5
    `;
    
    const spotifyTracks = await pool.query(spotifyTracksQuery);
    console.log(`   Found ${spotifyTracks.rows.length} single-artist tracks with Spotify IDs to validate`);
    
    const spotifyValidationResults = [];
    
    if (spotifyTracks.rows.length > 0 && spotify.accessToken) {
      console.log('\\n📋 Validating against Spotify API:');
      
      for (const track of spotifyTracks.rows.slice(0, 3)) {
        try {
          console.log(`   Checking: "${track.track_name}" by ${track.current_artists}...`);
          
          const spotifyTrack = await spotify.getTrack(track.spotify_id);
          
          if (spotifyTrack && spotifyTrack.artists && spotifyTrack.artists.length > 1) {
            const spotifyArtists = spotifyTrack.artists.map(a => a.name);
            console.log(`     ⚠️  Spotify shows ${spotifyTrack.artists.length} artists: ${spotifyArtists.join(', ')}`);
            
            spotifyValidationResults.push({
              trackId: track.track_id,
              trackName: track.track_name,
              currentArtists: track.current_artists,
              spotifyArtists: spotifyArtists,
              missingArtists: spotifyArtists.filter(sa => 
                !sa.toLowerCase().includes(track.current_artists.toLowerCase()) &&
                !track.current_artists.toLowerCase().includes(sa.toLowerCase())
              )
            });
          } else {
            console.log(`     ✅ Spotify confirms single artist`);
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`     ❌ Error checking Spotify: ${error.message}`);
        }
      }
    }
    
    // 3. Find tracks with multiple artists but wrong primary assignments
    console.log('\\n🔍 Checking primary artist assignments...');
    const primaryIssuesQuery = `
      SELECT 
        t.id as track_id,
        t.name as track_name,
        COUNT(CASE WHEN ta.is_primary = true THEN 1 END) as primary_count,
        COUNT(ta.artist_id) as total_artists,
        STRING_AGG(
          CASE WHEN ta.is_primary = true THEN a.name ELSE NULL END, 
          ', ' ORDER BY a.name
        ) as primary_artists,
        STRING_AGG(a.name, ', ' ORDER BY ta.is_primary DESC, a.name) as all_artists
      FROM tracks t
      JOIN track_artists ta ON t.id = ta.track_id
      JOIN artists a ON ta.artist_id = a.id
      GROUP BY t.id, t.name
      HAVING COUNT(ta.artist_id) > 1 AND (
        COUNT(CASE WHEN ta.is_primary = true THEN 1 END) = 0 OR  -- No primary
        COUNT(CASE WHEN ta.is_primary = true THEN 1 END) > 1     -- Multiple primaries
      )
      ORDER BY total_artists DESC
      LIMIT 5
    `;
    
    const primaryIssues = await pool.query(primaryIssuesQuery);
    console.log(`   Found ${primaryIssues.rows.length} tracks with primary artist assignment issues`);
    
    if (primaryIssues.rows.length > 0) {
      console.log('\\n📋 Tracks with primary artist issues:');
      primaryIssues.rows.forEach(row => {
        const issueType = row.primary_count === 0 ? 'No primary artist' : 'Multiple primary artists';
        console.log(`   • "${row.track_name}" - ${issueType}`);
        console.log(`     Artists: ${row.all_artists} (${row.total_artists} total)`);
      });
    }
    
    // 4. Summary and recommendations
    console.log('\\n📝 Summary:');
    console.log(`   • ${singleArtistTracks.rows.length} tracks with collaboration indicators but single artist`);
    console.log(`   • ${spotifyValidationResults.length} tracks with missing artists found via Spotify`);
    console.log(`   • ${primaryIssues.rows.length} tracks with primary artist assignment issues`);
    
    if (collaborationIssues.length > 0 || spotifyValidationResults.length > 0) {
      console.log('\\n💡 Recommendations:');
      
      if (collaborationIssues.length > 0) {
        console.log('   1. Review tracks with collaboration indicators in titles');
        console.log('   2. Search for mentioned artists in your database');
        console.log('   3. Add missing artist relationships');
      }
      
      if (spotifyValidationResults.length > 0) {
        console.log('   4. Consider enriching database with Spotify artist data');
        console.log('   5. Add missing artist relationships found via Spotify API');
        
        console.log('\\n🎯 Specific enrichment opportunities:');
        spotifyValidationResults.forEach(result => {
          if (result.missingArtists.length > 0) {
            console.log(`   • "${result.trackName}": Add ${result.missingArtists.join(', ')}`);
          }
        });
      }
      
      if (primaryIssues.rows.length > 0) {
        console.log('   6. Fix primary artist assignments for multi-artist tracks');
      }
    } else {
      console.log('\\n✅ Artist relationships look healthy!');
    }
    
    console.log('\\n⚠️  Note: This was a read-only analysis. No data was modified.');
    console.log('   Run with --fix flag to apply automatic corrections (not implemented yet).');
    
  } catch (error) {
    console.error('\\n💥 Validation failed:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--fix');

if (dryRun) {
  console.log('🔍 Running in ANALYSIS mode (no changes will be made)');
  console.log('   Add --fix flag to apply corrections\\n');
} else {
  console.log('⚠️  FIX mode not implemented yet. Running analysis only.\\n');
}

validateArtistRelationships();