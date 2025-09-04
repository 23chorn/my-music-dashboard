// Main db.js - DEPRECATED
// 
// ⚠️  This file has been broken down into specialized modules:
//
// 📁 Database connection:     ./connection.js
// 📊 Analytics & statistics:  ./analytics.js  
// 🔍 Search functionality:    ./search.js
// ▶️  Play operations:         ./plays.js
// 🏆 Top/ranking queries:     ./topQueries.js
// 👤 Artist operations:       ./artistDb.js
// 💿 Album operations:        ./albumDb.js
// 🎵 Track operations:        ./trackDb.js
// 🎧 Spotify integration:     ./spotifyService.js
//
// Please use the specialized modules instead of importing from this file.
// This file will be removed in a future version.

console.warn('⚠️  DEPRECATED: db.js has been split into specialized modules. Please update your imports.');

// Re-export functions from specialized modules for backwards compatibility
export { initializeDatabase, getPool } from './connection.js';
export { getDailyPlaysAll, getUniqueCounts } from './analytics.js';
export { searchAll } from './search.js';
export { getLastTimestamp, addPlaysDeduped, getRecentTracks } from './plays.js';
export { getTopArtists, getTopTracks, getTopAlbums } from './topQueries.js';