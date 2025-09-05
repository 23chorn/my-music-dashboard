/**
 * Test configuration for Music Dashboard Backend
 */

export const testConfig = {
  // Server configuration
  server: {
    baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.TEST_TIMEOUT) || 5000,
    startupWait: 10000 // Maximum time to wait for server startup
  },

  // Database configuration
  database: {
    // Use test database if provided, otherwise use main database
    url: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
    // Whether to skip database tests if no connection available
    skipOnFailure: true
  },

  // Test data limits
  limits: {
    // Maximum items to fetch in list tests
    maxItems: 10,
    // Maximum time to wait for async operations
    asyncTimeout: 5000
  },

  // API endpoint paths
  endpoints: {
    health: {
      root: '/',
      database: '/api/health/database',
      timezone: '/api/timezone-info',
      counts: '/api/unique-counts'
    },
    
    music: {
      topArtists: '/api/artist/top',
      topAlbums: '/api/album/top', 
      topTracks: '/api/track/top',
      recentTracks: '/api/track/recent',
      search: '/api/search',
      dailyPlays: '/api/analytics/daily-plays'
    },

    sync: {
      status: '/api/sync-status',
      switchMethod: '/api/switch-sync-method',
      syncTracks: '/api/sync-tracks',
      spotifyAuth: '/api/spotify/auth',
      spotifyStatus: '/api/spotify/status',
      spotifySync: '/api/spotify/sync',
      spotifyTest: '/api/spotify/test'
    }
  },

  // Expected response structures
  schemas: {
    artist: ['artistId', 'artist', 'playcount'],
    album: ['albumId', 'album', 'artist', 'playcount'],
    track: ['id', 'track', 'artist', 'playcount'],
    recentTrack: ['id', 'track', 'artist', 'timestamp'],
    
    searchResults: ['artists', 'albums', 'tracks'],
    
    syncStatus: ['method', 'initialized'],
    healthCheck: ['status', 'timestamp'],
    
    dailyPlays: ['day', 'plays']
  },

  // Test data samples
  testData: {
    validPeriods: ['7d', '1m', '3m', '6m', '1y', 'overall'],
    validSyncMethods: ['spotify', 'lastfm'],
    
    // Sample search queries to test
    searchQueries: ['test', 'music', 'song', ''],
    
    // Common API parameters
    limits: [1, 5, 10, 50],
    dayRanges: [1, 7, 30, 365]
  }
};

export default testConfig;