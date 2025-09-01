import SpotifyService from './spotify.js';
import SpotifyDataProcessor from './spotifyDataProcessor.js';
import logger from '../utils/logger.js';

class SpotifySync {
  constructor(dbService) {
    this.spotifyService = new SpotifyService();
    this.dataProcessor = new SpotifyDataProcessor(this.spotifyService);
    this.dbService = dbService;
  }

  // Initialize with stored tokens
  async initialize(accessToken, refreshToken) {
    this.spotifyService.setTokens(accessToken, refreshToken);
    logger.info('SpotifySync initialized with user tokens');
  }

  // Get authorization URL for user consent
  getAuthorizationUrl() {
    return this.spotifyService.generateAuthUrl(['user-read-recently-played']);
  }

  // Exchange authorization code for tokens
  async handleAuthorizationCallback(code) {
    try {
      const tokens = await this.spotifyService.getUserAccessToken(code);
      logger.info('Successfully obtained Spotify user tokens');
      return tokens;
    } catch (error) {
      logger.error(`Error handling Spotify authorization: ${error.message}`);
      throw error;
    }
  }

  // Get the last sync timestamp from database
  async getLastSyncTimestamp() {
    try {
      const result = await this.dbService.getLastSyncTimestamp();
      if (result) {
        // Convert to Unix timestamp in milliseconds for Spotify API
        const timestamp = new Date(result).getTime();
        logger.info(`Last sync timestamp: ${result} (${timestamp}ms)`);
        return timestamp;
      }
      logger.info('No previous sync timestamp found - will get recent tracks');
      return null;
    } catch (error) {
      logger.error(`Error getting last sync timestamp: ${error.message}`);
      return null;
    }
  }

  // Fetch and sync recent tracks from Spotify
  async syncRecentTracks(options = {}) {
    const { 
      limit = 50, 
      forceFullSync = false,
      saveToDatabase = true,
      testMode = false
    } = options;

    try {
      logger.info(`Starting Spotify sync - forceFullSync: ${forceFullSync}, testMode: ${testMode}, limit: ${limit}`);

      // Always get timestamp unless explicitly forcing full sync
      let after = null;
      if (!forceFullSync) {
        after = await this.getLastSyncTimestamp();
        if (after) {
          logger.info(`Fetching tracks played after: ${new Date(after).toISOString()}`);
        }
      }

      // Fetch recently played tracks from Spotify
      const recentlyPlayedData = await this.spotifyService.getRecentlyPlayed(limit, after);
      
      if (!recentlyPlayedData.items || recentlyPlayedData.items.length === 0) {
        logger.info('No new tracks to sync');
        return { 
          addedPlays: 0, 
          processedTracks: 0,
          message: 'No new tracks found since last sync'
        };
      }

      logger.info(`Retrieved ${recentlyPlayedData.items.length} tracks from Spotify API`);

      // Process the Spotify data
      const processedData = await this.dataProcessor.processSpotifyData(recentlyPlayedData);

      if (testMode) {
        // Return formatted data for inspection
        return {
          message: `Test mode - processed ${processedData.plays.length} plays from ${processedData.tracks.length} unique tracks`,
          summary: {
            plays: processedData.plays.length,
            uniqueTracks: processedData.tracks.length,
            uniqueArtists: processedData.artists.length,
            uniqueAlbums: processedData.albums.length,
            genres: processedData.genres.length,
            trackArtistRelationships: processedData.trackArtists.length,
            artistGenreRelationships: processedData.artistGenres.length
          },
          sampleData: {
            firstPlay: processedData.plays[0],
            firstTrack: processedData.tracks[0],
            firstArtist: processedData.artists[0],
            genres: Array.from(processedData.genres).slice(0, 10)
          },
          allData: processedData
        };
      }

      if (saveToDatabase) {
        // Save to database
        const result = await this.saveProcessedData(processedData);
        logger.info(`Sync completed: ${result.addedPlays} new plays, ${result.processedTracks} tracks processed`);
        return result;
      } else {
        // Return processed data without saving
        logger.info(`Data processed but not saved: ${processedData.plays.length} plays, ${processedData.tracks.length} tracks`);
        return {
          addedPlays: processedData.plays.length,
          processedTracks: processedData.tracks.length,
          data: processedData
        };
      }

    } catch (error) {
      logger.error(`Error during Spotify sync: ${error.message}`);
      throw error;
    }
  }

  // Save processed data to database
  async saveProcessedData(processedData) {
    try {
      let addedPlays = 0;
      let processedTracks = 0;

      // Start transaction
      await this.dbService.beginTransaction();

      try {
        // 1. Insert/update genres
        for (const genreName of processedData.genres) {
          await this.dbService.insertGenreIfNotExists(genreName);
        }

        // 2. Insert/update artists with genre relationships
        for (const artist of processedData.artists) {
          await this.dbService.insertOrUpdateArtist(artist);
        }

        // 3. Insert artist-genre relationships
        for (const artistGenre of processedData.artistGenres) {
          await this.dbService.insertArtistGenreIfNotExists(
            artistGenre.artist_id, 
            artistGenre.genre_name
          );
        }

        // 4. Insert/update albums
        for (const album of processedData.albums) {
          await this.dbService.insertOrUpdateAlbum(album);
        }

        // 5. Insert album-artist relationships
        for (const albumArtist of processedData.albumArtists) {
          await this.dbService.insertAlbumArtistIfNotExists(
            albumArtist.album_id,
            albumArtist.artist_id
          );
        }

        // 6. Insert/update tracks
        for (const track of processedData.tracks) {
          await this.dbService.insertOrUpdateTrack(track);
          processedTracks++;
        }

        // 7. Insert track-artist relationships
        for (const trackArtist of processedData.trackArtists) {
          await this.dbService.insertTrackArtistIfNotExists(
            trackArtist.track_id,
            trackArtist.artist_id
          );
        }

        // 8. Insert track-album relationships (if not already handled)
        for (const track of processedData.tracks) {
          const album = processedData.albums.find(a => 
            processedData.plays.some(p => p.track_id === track.id)
          );
          if (album) {
            await this.dbService.insertTrackAlbumIfNotExists(track.id, album.id);
          }
        }

        // 9. Insert plays (check for duplicates based on track_id + played_at)
        for (const play of processedData.plays) {
          const wasInserted = await this.dbService.insertPlayIfNotExists(play);
          if (wasInserted) {
            addedPlays++;
          }
        }

        // Commit transaction
        await this.dbService.commitTransaction();

        logger.info(`Database sync completed: ${addedPlays} plays, ${processedTracks} tracks`);
        
        return { addedPlays, processedTracks };

      } catch (error) {
        await this.dbService.rollbackTransaction();
        throw error;
      }

    } catch (error) {
      logger.error(`Error saving processed data: ${error.message}`);
      throw error;
    }
  }

  // Test the sync without saving to database - shows formatted data
  async testSync(limit = 10, forceFullSync = false) {
    return await this.syncRecentTracks({ 
      limit, 
      testMode: true,
      forceFullSync,
      saveToDatabase: false
    });
  }

  // Test incremental sync (only new tracks)
  async testIncrementalSync(limit = 50) {
    return await this.testSync(limit, false);
  }

  // Test full sync (ignore timestamp)
  async testFullSync(limit = 10) {
    return await this.testSync(limit, true);
  }

  // Sync specific time range
  async syncTimeRange(afterTimestamp, beforeTimestamp = null, limit = 50) {
    try {
      logger.info(`Syncing time range: after ${afterTimestamp}${beforeTimestamp ? `, before ${beforeTimestamp}` : ''}`);

      // For time range syncing, we'll need to make multiple API calls
      // since Spotify's API only supports 'after' parameter, not 'before'
      // This is a simplified implementation
      
      const recentlyPlayedData = await this.spotifyService.getRecentlyPlayed(limit, afterTimestamp);
      
      // Filter by beforeTimestamp if provided
      if (beforeTimestamp && recentlyPlayedData.items) {
        recentlyPlayedData.items = recentlyPlayedData.items.filter(item => {
          const playedAt = new Date(item.played_at).getTime();
          return playedAt < beforeTimestamp;
        });
      }

      if (!recentlyPlayedData.items || recentlyPlayedData.items.length === 0) {
        logger.info('No tracks found in specified time range');
        return { addedPlays: 0, processedTracks: 0 };
      }

      const processedData = await this.dataProcessor.processSpotifyData(recentlyPlayedData);
      const result = await this.saveProcessedData(processedData);

      return result;

    } catch (error) {
      logger.error(`Error syncing time range: ${error.message}`);
      throw error;
    }
  }
}

export default SpotifySync;