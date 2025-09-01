import logger from '../utils/logger.js';

class SpotifyDataProcessor {
  constructor(spotifyService) {
    this.spotifyService = spotifyService;
  }

  // Process recently played tracks and extract all relevant data
  async processRecentlyPlayedTracks(recentlyPlayedData) {
    const processedTracks = [];
    const uniqueArtistIds = new Set();

    for (const item of recentlyPlayedData.items) {
      const track = item.track;
      const playedAt = new Date(item.played_at);

      // Extract all artists for this track
      const trackArtists = track.artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        uri: artist.uri,
        href: artist.href
      }));

      // Collect unique artist IDs for batch genre fetching
      trackArtists.forEach(artist => uniqueArtistIds.add(artist.id));

      // Extract album information
      const album = {
        id: track.album.id,
        name: track.album.name,
        uri: track.album.uri,
        releaseDate: track.album.release_date,
        releaseDatePrecision: track.album.release_date_precision,
        totalTracks: track.album.total_tracks,
        type: track.album.type,
        images: track.album.images.map(img => ({
          url: img.url,
          height: img.height,
          width: img.width
        })),
        // Album artists (may differ from track artists)
        artists: track.album.artists.map(artist => ({
          id: artist.id,
          name: artist.name,
          uri: artist.uri
        }))
      };

      // Extract track information
      const processedTrack = {
        id: track.id,
        name: track.name,
        uri: track.uri,
        href: track.href,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        trackNumber: track.track_number,
        discNumber: track.disc_number,
        isLocal: track.is_local,
        artists: trackArtists,
        album: album,
        playedAt: playedAt,
        // Context information (playlist, album, etc.)
        context: item.context ? {
          type: item.context.type,
          uri: item.context.uri,
          href: item.context.href
        } : null
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

  // Create normalized database records from processed data
  async createDatabaseRecords(processedData, artistGenreMap) {
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
      // Process artists
      for (const artist of track.artists) {
        if (!records.artists.has(artist.id)) {
          const genreData = artistGenreMap.get(artist.id) || {};
          records.artists.set(artist.id, {
            id: artist.id,
            name: artist.name,
            spotify_uri: artist.uri,
            popularity: genreData.popularity || null,
            followers: genreData.followers || null,
            image_url: genreData.images?.[0]?.url || null
          });

          // Add genres for this artist
          if (genreData.genres && genreData.genres.length > 0) {
            genreData.genres.forEach(genreName => {
              records.genres.add(genreName);
              records.artistGenres.push({
                artist_id: artist.id,
                genre_name: genreName
              });
            });
          }
        }

        // Track-Artist relationship
        records.trackArtists.push({
          track_id: track.id,
          artist_id: artist.id
        });
      }

      // Process album
      if (!records.albums.has(track.album.id)) {
        records.albums.set(track.album.id, {
          id: track.album.id,
          name: track.album.name,
          spotify_uri: track.album.uri,
          release_date: track.album.releaseDate,
          release_date_precision: track.album.releaseDatePrecision,
          total_tracks: track.album.totalTracks,
          album_type: track.album.type,
          image_url: track.album.images?.[0]?.url || null
        });

        // Album-Artist relationships
        for (const albumArtist of track.album.artists) {
          records.albumArtists.push({
            album_id: track.album.id,
            artist_id: albumArtist.id
          });
        }
      }

      // Process track
      if (!records.tracks.has(track.id)) {
        records.tracks.set(track.id, {
          id: track.id,
          name: track.name,
          spotify_uri: track.uri,
          duration_ms: track.durationMs,
          explicit: track.explicit,
          popularity: track.popularity,
          preview_url: track.previewUrl,
          track_number: track.trackNumber,
          disc_number: track.discNumber,
          is_local: track.isLocal
        });
      }

      // Process play record
      records.plays.push({
        track_id: track.id,
        played_at: track.playedAt,
        context_type: track.context?.type || null,
        context_uri: track.context?.uri || null
      });
    }

    logger.info(`Created database records: ${records.artists.size} artists, ${records.albums.size} albums, ${records.tracks.size} tracks, ${records.plays.length} plays, ${records.genres.size} genres`);

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

      // Step 3: Create normalized database records
      const databaseRecords = await this.createDatabaseRecords(processedData, artistGenreMap);

      return databaseRecords;
    } catch (error) {
      logger.error(`Error processing Spotify data: ${error.message}`);
      throw error;
    }
  }
}

export default SpotifyDataProcessor;