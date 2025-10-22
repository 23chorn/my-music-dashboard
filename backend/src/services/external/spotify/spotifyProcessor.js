import logger from '../../../utils/logger.js';

class SpotifyDataProcessor {
  constructor(spotifyService) {
    this.spotifyService = spotifyService;
  }

  // Process recently played tracks for legacy database format
  async processRecentlyPlayedTracks(recentlyPlayedData) {
    const processedTracks = [];
    const uniqueArtistIds = new Set();

    for (const item of recentlyPlayedData.items) {
      const track = item.track;
      
      // Validate played_at timestamp
      const playedAt = new Date(item.played_at);
      if (isNaN(playedAt.getTime())) {
        logger.warn(`Skipping track "${track.name}" due to invalid played_at timestamp: ${item.played_at}`);
        continue;
      }
      
      // Additional validation - ensure timestamp is reasonable
      const now = new Date();
      const minDate = new Date('1990-01-01');
      const maxDate = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 1 day in future max
      
      if (playedAt < minDate || playedAt > maxDate) {
        logger.warn(`Skipping track "${track.name}" due to unreasonable played_at timestamp: ${playedAt.toISOString()}`);
        continue;
      }

      // Extract all artists for this track (first artist is primary)
      const trackArtists = track.artists.map((artist, index) => ({
        spotifyId: artist.id,
        name: artist.name,
        uri: artist.uri,
        isPrimary: index === 0 // First artist in Spotify response is the primary artist
      }));

      // Collect unique artist IDs for batch genre fetching
      trackArtists.forEach(artist => uniqueArtistIds.add(artist.spotifyId));

      // Extract album information (adapted to legacy schema)
      const album = {
        spotifyId: track.album.id,
        name: track.album.name,
        release_date: track.album.release_date || null,
        image_url: track.album.images?.[0]?.url || null,
        // Album artists (may differ from track artists)
        artists: track.album.artists.map(artist => ({
          spotifyId: artist.id,
          name: artist.name,
          uri: artist.uri
        }))
      };

      // Extract track information (adapted to legacy schema)
      const processedTrack = {
        spotifyId: track.id,
        name: track.name,
        duration_ms: track.duration_ms,
        popularity: track.popularity,
        trackNumber: track.track_number,
        discNumber: track.disc_number,
        artists: trackArtists,
        album: album,
        playedAt: playedAt
      };

      processedTracks.push(processedTrack);
    }

    logger.info(`Processed ${processedTracks.length} tracks with ${uniqueArtistIds.size} unique artists`);

    return {
      tracks: processedTracks,
      uniqueArtistIds: Array.from(uniqueArtistIds)
    };
  }

  // Fetch genre data for artists in batches
  async enrichWithGenres(artistIds) {
    const artistGenreMap = new Map();
    const batchSize = 50; // Spotify API limit

    try {
      // Process artists in batches of 50
      for (let i = 0; i < artistIds.length; i += batchSize) {
        const batch = artistIds.slice(i, i + batchSize);
        const artists = await this.spotifyService.getMultipleArtists(batch);

        artists.forEach(artist => {
          if (artist) {
            artistGenreMap.set(artist.id, {
              genres: artist.genres || [],
              popularity: artist.popularity || 0,
              followers: artist.followers?.total || 0,
              images: artist.images || []
            });
          }
        });

        // Add delay to respect rate limits
        if (i + batchSize < artistIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      logger.info(`Enriched ${artistGenreMap.size} artists with genre data`);
      return artistGenreMap;
    } catch (error) {
      logger.error(`Error enriching with genres: ${error.message}`);
      throw error;
    }
  }

  // Create legacy database records from processed data
  async createLegacyDatabaseRecords(processedData, artistGenreMap) {
    const records = {
      artists: new Map(),
      albums: new Map(), 
      tracks: new Map(),
      plays: [],
      trackArtists: [],
      albumArtists: [],
      artistGenres: [],
      genres: new Set()
    };

    for (const track of processedData.tracks) {
      // Process artists (legacy format)
      for (const artist of track.artists) {
        if (!records.artists.has(artist.spotifyId)) {
          const genreData = artistGenreMap.get(artist.spotifyId) || {};
          records.artists.set(artist.spotifyId, {
            spotifyId: artist.spotifyId,
            name: artist.name,
            image_url: genreData.images?.[0]?.url || null
          });

          // Add genres for this artist
          if (genreData.genres && genreData.genres.length > 0) {
            genreData.genres.forEach(genreName => {
              records.genres.add(genreName);
              records.artistGenres.push({
                artistSpotifyId: artist.spotifyId,
                genreName: genreName
              });
            });
          }
        }

        // Track-Artist relationship (include primary artist flag)
        records.trackArtists.push({
          trackSpotifyId: track.spotifyId,
          artistSpotifyId: artist.spotifyId,
          isPrimary: artist.isPrimary
        });
      }

      // Process album (legacy format)
      if (!records.albums.has(track.album.spotifyId)) {
        records.albums.set(track.album.spotifyId, {
          spotifyId: track.album.spotifyId,
          name: track.album.name,
          release_date: track.album.release_date,
          image_url: track.album.image_url
        });

        // Album-Artist relationships
        for (const albumArtist of track.album.artists) {
          records.albumArtists.push({
            albumSpotifyId: track.album.spotifyId,
            artistSpotifyId: albumArtist.spotifyId
          });
        }
      }

      // Process track (legacy format)
      if (!records.tracks.has(track.spotifyId)) {
        records.tracks.set(track.spotifyId, {
          spotifyId: track.spotifyId,
          name: track.name,
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          trackNumber: track.trackNumber,
          discNumber: track.discNumber,
          albumSpotifyId: track.album.spotifyId
        });
      }

      // Process play record
      records.plays.push({
        trackSpotifyId: track.spotifyId,
        playedAt: track.playedAt
      });
    }

    logger.info(`Created legacy database records: ${records.artists.size} artists, ${records.albums.size} albums, ${records.tracks.size} tracks, ${records.plays.length} plays, ${records.genres.size} genres`);

    return {
      artists: Array.from(records.artists.values()),
      albums: Array.from(records.albums.values()),
      tracks: Array.from(records.tracks.values()),
      plays: records.plays,
      trackArtists: records.trackArtists,
      albumArtists: records.albumArtists,
      artistGenres: records.artistGenres,
      genres: Array.from(records.genres)
    };
  }

  // Main processing function
  async processSpotifyData(recentlyPlayedData) {
    try {
      // Step 1: Process the raw Spotify data
      const processedData = await this.processRecentlyPlayedTracks(recentlyPlayedData);

      // Step 2: Enrich with genre data
      const artistGenreMap = await this.enrichWithGenres(processedData.uniqueArtistIds);

      // Step 3: Create legacy database records
      const databaseRecords = await this.createLegacyDatabaseRecords(processedData, artistGenreMap);

      return databaseRecords;
    } catch (error) {
      logger.error(`Error processing Spotify data: ${error.message}`);
      throw error;
    }
  }
}

export default SpotifyDataProcessor;