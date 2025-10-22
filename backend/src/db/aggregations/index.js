/**
 * Query Modules Index
 *
 * Centralized export of all specialized query functions for AI chat
 * Organized by functional domain for better code organization
 */

// Top content queries (artists, tracks, albums)
export {
  getTopArtists,
  getTopTracks,
  getTopAlbums,
  getTopTracksForPlaylist
} from './topContent.js';

// Genre queries
export { getGenreBreakdown } from './genres.js';

// Discovery queries
export {
  getDiscoveryStats,
  getRecentDiscoveries
} from './discovery.js';

// Time pattern queries
export { getListeningTimePatterns } from './timePatterns.js';

// Entity detail queries
export {
  getAlbumDetailsByName,
  getTrackDetailsByName
} from './details.js';

// Comparison queries
export { compareArtists } from './comparison.js';
