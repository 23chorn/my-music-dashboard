/**
 * Database Entities Barrel Export
 * Centralized exports for all entity-specific database operations
 */

// Artist operations
export {
  getArtistInfo,
  getArtistRecentPlays,
  getArtistMilestones,
  getArtistStats,
  getArtistDailyPlays,
  getAllArtistsWithPlaycount
} from './artists.js';

// Album operations
export {
  getAlbumInfo,
  getAlbumTopTracks,
  getAlbumRecentPlays,
  getAlbumStats,
  getAlbumTracklist,
  getAllAlbumsWithPlaycount
} from './albums.js';

// Track operations
export {
  getTrackInfo,
  getTrackRecentPlays,
  getTrackStats,
  getTrackDailyPlays,
  getAllTracksWithPlaycount
} from './tracks.js';

// Play operations
export {
  getLastTimestamp,
  addPlaysDeduped,
  getRecentTracks
} from './plays.js';
