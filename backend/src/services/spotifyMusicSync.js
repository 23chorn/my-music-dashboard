import SpotifyService from './spotify.js';
import SpotifyDataProcessor from './spotifyDataProcessor.js';
import { LegacySpotifyDatabaseService, initializeLegacySpotifyDatabase } from '../db/spotifyService.js';
import logger from '../utils/logger.js';

class SpotifyMusicSync {
  constructor() {
    initializeLegacySpotifyDatabase();
    this.spotifyService = new SpotifyService();
    this.dataProcessor = new SpotifyDataProcessor(this.spotifyService);
    this.dbService = new LegacySpotifyDatabaseService();
  }

  // Initialize with stored tokens
  async initialize(accessToken, refreshToken) {
    this.spotifyService.setTokens(accessToken, refreshToken);
    logger.info('Spotify music sync initialized with user tokens');
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
        logger.info(`Spotify sync completed: ${result.addedPlays} new plays, ${result.processedTracks} tracks processed`);
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
      logger.error(`Error during legacy Spotify sync: ${error.message}`);
      throw error;
    }
  }

  // Save processed data to legacy database
  async saveProcessedData(processedData) {
    try {
      let addedPlays = 0;
      let processedTracks = 0;

      // Start transaction
      await this.dbService.beginTransaction();

      try {
        // 1. Process genres first
        const genreIdMap = new Map();
        for (const genreName of processedData.genres) {
          const genreId = await this.dbService.findOrCreateGenre(genreName);
          genreIdMap.set(genreName, genreId);
        }

        // 2. Process artists and get internal IDs
        const artistIdMap = new Map();
        for (const artist of processedData.artists) {
          const artistId = await this.dbService.findOrCreateArtist(artist);
          artistIdMap.set(artist.spotifyId, artistId);
        }

        // 3. Process albums and get internal IDs
        const albumIdMap = new Map();
        for (const album of processedData.albums) {
          const albumId = await this.dbService.findOrCreateAlbum(album);
          albumIdMap.set(album.spotifyId, albumId);
        }

        // 4. Process tracks and get internal IDs
        const trackIdMap = new Map();
        for (const track of processedData.tracks) {
          const trackId = await this.dbService.findOrCreateTrack(track);
          trackIdMap.set(track.spotifyId, trackId);
          processedTracks++;
        }

        // 5. Insert artist-genre relationships
        for (const artistGenre of processedData.artistGenres) {
          const artistId = artistIdMap.get(artistGenre.artistSpotifyId);
          const genreId = genreIdMap.get(artistGenre.genreName);
          if (artistId && genreId) {
            await this.dbService.insertArtistGenreRelationship(artistId, genreId);
          }
        }

        // 6. Insert track-artist relationships
        for (const trackArtist of processedData.trackArtists) {
          const trackId = trackIdMap.get(trackArtist.trackSpotifyId);
          const artistId = artistIdMap.get(trackArtist.artistSpotifyId);
          if (trackId && artistId) {
            await this.dbService.insertTrackArtistRelationship(trackId, artistId);
          }
        }

        // 7. Insert track-album relationships
        for (const track of processedData.tracks) {
          const trackId = trackIdMap.get(track.spotifyId);
          const albumId = albumIdMap.get(track.albumSpotifyId);
          if (trackId && albumId) {
            await this.dbService.insertTrackAlbumRelationship(
              trackId, 
              albumId, 
              track.trackNumber, 
              track.discNumber
            );
          }
        }

        // 8. Insert album-artist relationships
        for (const albumArtist of processedData.albumArtists) {
          const albumId = albumIdMap.get(albumArtist.albumSpotifyId);
          const artistId = artistIdMap.get(albumArtist.artistSpotifyId);
          if (albumId && artistId) {
            await this.dbService.insertAlbumArtistRelationship(albumId, artistId);
          }
        }

        // 9. Insert plays (check for duplicates)
        for (const play of processedData.plays) {
          const trackId = trackIdMap.get(play.trackSpotifyId);
          if (trackId) {
            const wasInserted = await this.dbService.insertPlay(trackId, play.playedAt);
            if (wasInserted) {
              addedPlays++;
            }
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
      logger.error(`Error saving legacy processed data: ${error.message}`);
      throw error;
    }
  }

  // Test the sync without saving to database
  async testSync(limit = 10, forceFullSync = false) {
    return await this.syncRecentTracks({ 
      limit, 
      testMode: true,
      forceFullSync,
      saveToDatabase: false
    });
  }
}

export default SpotifyMusicSync;