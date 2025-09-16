import SpotifyMusicSync from './spotifyMusicSync.js';
import { fetchAllRecentTracks } from './lastfm.js';
import { getLastTimestamp, addPlaysDeduped } from '../db/plays.js';
import { updateSyncStats } from '../db/metadata.js';
import logger from '../utils/logger.js';

class MusicSyncService {
  constructor() {
    this.syncMethod = process.env.SYNC_METHOD || 'lastfm';
    this.initialized = false;
    
    // Initialize Spotify components
    if (this.syncMethod === 'spotify') {
      this.spotifySync = new SpotifyMusicSync();
      this.initializeAsync();
    } else {
      this.initialized = true;
    }
  }

  async initializeAsync() {
    await this.initializeSpotify();
    this.initialized = true;
  }

  async initializeSpotify() {
    const accessToken = process.env.SPOTIFY_ACCESS_TOKEN;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;
    
    if (accessToken && refreshToken) {
      try {
        await this.spotifySync.initialize(accessToken, refreshToken);
        logger.info('Music sync initialized with Spotify');
      } catch (error) {
        logger.error(`Failed to initialize Spotify in unified sync: ${error.message}`);
        // Fall back to Last.fm
        this.syncMethod = 'lastfm';
        logger.info('Falling back to Last.fm sync method');
      }
    } else {
      logger.warn('Spotify tokens not found, falling back to Last.fm');
      this.syncMethod = 'lastfm';
    }
  }

  // Wait for initialization to complete
  async ensureInitialized() {
    let attempts = 0;
    while (!this.initialized && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (!this.initialized) {
      throw new Error('Sync service initialization timed out');
    }
  }

  // Main sync function that routes to appropriate service
  async syncNewTracks(options = {}) {
    const { force = false } = options;
    const startTime = new Date().toISOString();

    // Wait for initialization to complete
    await this.ensureInitialized();

    logger.info(`Starting music sync using ${this.syncMethod.toUpperCase()} method`);

    let result;
    let success = false;
    let error = null;

    try {
      if (this.syncMethod === 'spotify') {
        result = await this.syncWithSpotify(force);
      } else {
        result = await this.syncWithLastFm(force);
      }
      success = true;
    } catch (syncError) {
      error = syncError.message;
      logger.error(`Primary sync method (${this.syncMethod}) failed: ${syncError.message}`);

      // If Spotify fails, try falling back to Last.fm
      if (this.syncMethod === 'spotify') {
        logger.info('Attempting fallback to Last.fm...');
        try {
          result = await this.syncWithLastFm(force);
          result = {
            ...result,
            fallbackUsed: true,
            fallbackFrom: 'spotify',
            fallbackReason: syncError.message
          };
          success = true;
          error = null; // Clear error since fallback succeeded
        } catch (fallbackError) {
          error = `Both sync methods failed. Primary: ${syncError.message}, Fallback: ${fallbackError.message}`;
          logger.error(`Fallback to Last.fm also failed: ${fallbackError.message}`);
          throw new Error(error);
        }
      } else {
        throw syncError;
      }
    } finally {
      // Always update sync statistics
      const endTime = new Date().toISOString();

      if (result || error) {
        try {
          await updateSyncStats({
            method: result?.fallbackUsed ? 'lastfm' : this.syncMethod,
            success,
            addedPlays: result?.addedPlays || 0,
            processedTracks: result?.processedTracks || 0,
            startTime,
            endTime,
            error
          });
        } catch (metadataError) {
          logger.error(`Failed to update sync metadata: ${metadataError.message}`);
        }
      }
    }

    return result;
  }

  // Spotify sync implementation
  async syncWithSpotify(force = false) {
    try {
      const result = await this.spotifySync.syncRecentTracks({
        forceFullSync: force,
        saveToDatabase: true,
        limit: 50
      });

      return {
        success: true,
        method: 'spotify',
        addedPlays: result.addedPlays || 0,
        processedTracks: result.processedTracks || 0,
        message: result.message || `Synced ${result.addedPlays || 0} new plays via Spotify`,
        timestamp: new Date().toISOString(),
        force: force
      };

    } catch (error) {
      logger.error(`Spotify sync failed: ${error.message}`);
      throw error;
    }
  }

  // Last.fm sync implementation (existing logic)
  async syncWithLastFm(force = false) {
    return new Promise((resolve, reject) => {
      logger.info("Starting Last.fm sync");
      
      getLastTimestamp(async(err, lastTimestamp) => {
        if (err) {
          logger.error("Error getting last timestamp:", err);
          return reject(new Error('DB error getting timestamp'));
        }
        
        if (!lastTimestamp && !force) {
          logger.warn("No tracks found in DB");
          return reject(new Error('No tracks found'));
        }

        try {
          const fromTimestamp = force ? null : lastTimestamp;
          const newTracks = await fetchAllRecentTracks({ from: fromTimestamp });
          logger.info(`Fetched ${newTracks.length} new tracks from Last.fm`);

          if (newTracks.length === 0) {
            return resolve({
              success: true,
              method: 'lastfm',
              addedPlays: 0,
              processedTracks: 0,
              message: 'No new tracks found since last sync',
              timestamp: new Date().toISOString(),
              force: force
            });
          }

          addPlaysDeduped(newTracks, (err2, insertedCount) => {
            if (err2) {
              logger.error("Error adding deduped tracks:", err2);
              return reject(new Error('DB error adding tracks'));
            }

            logger.info(`Successfully synced ${insertedCount} new plays via Last.fm`);
            
            resolve({
              success: true,
              method: 'lastfm',
              addedPlays: insertedCount,
              processedTracks: newTracks.length,
              message: `Synced ${insertedCount} new plays via Last.fm`,
              timestamp: new Date().toISOString(),
              force: force
            });
          });

        } catch (error) {
          logger.error("Error fetching from Last.fm:", error);
          reject(new Error(`Last.fm fetch failed: ${error.message}`));
        }
      });
    });
  }

  // Get current sync method
  getCurrentMethod() {
    return this.syncMethod;
  }

  // Switch sync method (for testing)
  async switchMethod(newMethod) {
    if (newMethod !== 'spotify' && newMethod !== 'lastfm') {
      throw new Error('Invalid sync method. Use "spotify" or "lastfm"');
    }

    logger.info(`Switching sync method from ${this.syncMethod} to ${newMethod}`);
    this.syncMethod = newMethod;

    if (newMethod === 'spotify' && !this.spotifySync) {
      this.spotifySync = new SpotifyMusicSync();
      await this.initializeSpotify();
    }

    return { 
      success: true, 
      newMethod: this.syncMethod,
      message: `Switched to ${this.syncMethod} sync method` 
    };
  }

  // Get sync status
  async getStatus() {
    const status = {
      currentMethod: this.syncMethod,
      available: {
        lastfm: {
          configured: !!(process.env.LASTFM_API_KEY && process.env.LASTFM_USERNAME),
          ready: true
        },
        spotify: {
          configured: !!(process.env.SPOTIFY_ACCESS_TOKEN && process.env.SPOTIFY_REFRESH_TOKEN),
          ready: !!this.spotifySync
        }
      }
    };

    // Get last sync info based on method
    try {
      if (this.syncMethod === 'spotify' && this.spotifySync) {
        status.lastSync = await this.spotifySync.getLastSyncTimestamp();
        if (status.lastSync) {
          status.lastSync = new Date(status.lastSync).toISOString();
        }
      } else {
        // Get Last.fm last sync (would need to implement this)
        status.lastSync = null;
      }
    } catch (error) {
      logger.error(`Error getting sync status: ${error.message}`);
      status.lastSync = null;
    }

    return status;
  }
}

export default MusicSyncService;