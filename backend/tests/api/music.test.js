import { describe, test, before } from 'node:test';
import { strict as assert } from 'node:assert';
import { TestClient, assertValidResponse, assertHasFields, assertArrayStructure, waitForServer } from '../utils/testHelpers.js';

describe('Music API Tests', () => {
  let client;

  before(async () => {
    client = new TestClient();
    await waitForServer();
  });

  describe('Top Lists API', () => {
    test('GET /api/artist/top - should return top artists', async () => {
      const response = await client.get('/api/artist/top?limit=5');
      assertValidResponse(response, 200);
      
      const artists = await response.json();
      assertArrayStructure(artists, ['artistId', 'artist', 'playcount'], 'top artists');
      
      if (artists.length > 0) {
        console.log(`✅ Retrieved ${artists.length} top artists`);
        
        // Should be sorted by playcount descending
        for (let i = 1; i < artists.length; i++) {
          assert.ok(artists[i-1].playcount >= artists[i].playcount, 
            'Artists should be sorted by playcount descending');
        }
      } else {
        console.log('⚠️  No artists found - database may be empty');
      }
    });

    test('GET /api/album/top - should return top albums', async () => {
      const response = await client.get('/api/album/top?limit=5');
      assertValidResponse(response, 200);
      
      const albums = await response.json();
      assertArrayStructure(albums, ['albumId', 'album', 'artist', 'playcount'], 'top albums');
      
      if (albums.length > 0) {
        console.log(`✅ Retrieved ${albums.length} top albums`);
      } else {
        console.log('⚠️  No albums found - database may be empty');
      }
    });

    test('GET /api/track/top - should return top tracks', async () => {
      const response = await client.get('/api/track/top?limit=5');
      assertValidResponse(response, 200);
      
      const tracks = await response.json();
      assertArrayStructure(tracks, ['id', 'track', 'artist', 'playcount'], 'top tracks');
      
      if (tracks.length > 0) {
        console.log(`✅ Retrieved ${tracks.length} top tracks`);
      } else {
        console.log('⚠️  No tracks found - database may be empty');  
      }
    });
  });

  describe('Recent Tracks API', () => {
    test('GET /api/track/recent - should return recent tracks', async () => {
      const response = await client.get('/api/track/recent?limit=10');
      assertValidResponse(response, 200);
      
      const tracks = await response.json();
      assertArrayStructure(tracks, ['id', 'track', 'artist', 'timestamp'], 'recent tracks');
      
      if (tracks.length > 0) {
        console.log(`✅ Retrieved ${tracks.length} recent tracks`);
        
        // Should be sorted by timestamp descending (most recent first)
        for (let i = 1; i < tracks.length; i++) {
          assert.ok(tracks[i-1].timestamp >= tracks[i].timestamp, 
            'Recent tracks should be sorted by timestamp descending');
        }
      } else {
        console.log('⚠️  No recent tracks found - database may be empty');
      }
    });
  });

  describe('Period Filtering', () => {
    test('GET /api/artist/top with period filter', async () => {
      const periods = ['7d', '1m', '3m', '6m', '1y', 'overall'];
      
      for (const period of periods) {
        const response = await client.get(`/api/artist/top?period=${period}&limit=3`);
        assertValidResponse(response, 200);
        
        const artists = await response.json();
        assert.ok(Array.isArray(artists), `Period ${period} should return array`);
        
        console.log(`✅ Period ${period}: ${artists.length} artists`);
      }
    });
  });

  describe('Search API', () => {
    test('GET /api/search - should handle search queries', async () => {
      // Test empty query
      const emptyResponse = await client.get('/api/search');
      assertValidResponse(emptyResponse, 200);
      
      const emptyResults = await emptyResponse.json();
      assertHasFields(emptyResults, ['artists', 'albums', 'tracks'], 'search results');
      
      // Test with query (if data exists)
      const searchResponse = await client.get('/api/search?q=test');
      assertValidResponse(searchResponse, 200);
      
      const searchResults = await searchResponse.json();
      assertHasFields(searchResults, ['artists', 'albums', 'tracks'], 'search results with query');
      
      console.log('✅ Search API functional');
    });
  });

  describe('Analytics API', () => {
    test('GET /api/analytics/daily-plays - should return daily plays data', async () => {
      const response = await client.get('/api/analytics/daily-plays?days=7');
      assertValidResponse(response, 200);
      
      const dailyPlays = await response.json();
      assert.ok(Array.isArray(dailyPlays), 'Daily plays should be an array');
      
      if (dailyPlays.length > 0) {
        assertHasFields(dailyPlays[0], ['day', 'count'], 'daily plays entry');
        console.log(`✅ Retrieved ${dailyPlays.length} days of play data`);
      } else {
        console.log('⚠️  No daily plays data found');
      }
    });
  });
});