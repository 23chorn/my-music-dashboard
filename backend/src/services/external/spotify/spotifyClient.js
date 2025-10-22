import fetch from 'node-fetch';
import logger from '../../../utils/logger.js';

class SpotifyService {
  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID;
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
  }

  // Get client credentials token (for non-user endpoints)
  async getClientCredentialsToken() {
    const tokenUrl = "https://accounts.spotify.com/api/token";
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(this.clientId + ":" + this.clientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to fetch Spotify client credentials token: ${error}`);
      throw new Error(`Spotify auth failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    logger.info('Spotify client credentials token obtained');
    return data.access_token;
  }

  // Get user authorization token (for user-specific endpoints like recently played)
  async getUserAccessToken(code) {
    const tokenUrl = "https://accounts.spotify.com/api/token";
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(this.clientId + ":" + this.clientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to fetch Spotify user access token: ${error}`);
      throw new Error(`Spotify user auth failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    logger.info('Spotify user access token obtained');
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in
    };
  }

  // Refresh user access token
  async refreshUserToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenUrl = "https://accounts.spotify.com/api/token";
    
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(this.clientId + ":" + this.clientSecret).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to refresh Spotify token: ${error}`);
      throw new Error(`Spotify token refresh failed: ${error}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);
    
    // Update refresh token if provided
    if (data.refresh_token) {
      this.refreshToken = data.refresh_token;
    }
    
    logger.info('Spotify token refreshed');
    return data.access_token;
  }

  // Ensure we have a valid token
  async ensureValidToken() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      if (this.refreshToken) {
        await this.refreshUserToken();
      } else {
        throw new Error('No valid token and no refresh token available. User needs to reauthorize.');
      }
    }
  }

  // Get recently played tracks
  async getRecentlyPlayed(limit = 50, after = null) {
    await this.ensureValidToken();
    
    let url = `https://api.spotify.com/v1/me/player/recently-played?limit=${limit}`;
    if (after) {
      url += `&after=${after}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to fetch recently played tracks: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    logger.info(`Fetched ${data.items.length} recently played tracks`);
    return data;
  }

  // Get artist details (including genres)
  async getArtist(artistId) {
    await this.ensureValidToken();
    
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to fetch artist ${artistId}: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    return data;
  }

  // Get multiple artists at once (more efficient)
  async getMultipleArtists(artistIds) {
    await this.ensureValidToken();
    
    const idsParam = artistIds.join(',');
    const response = await fetch(`https://api.spotify.com/v1/artists?ids=${idsParam}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to fetch multiple artists: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    return data.artists;
  }

  // Generate authorization URL for user consent
  generateAuthUrl(scopes = ['user-read-recently-played', 'playlist-modify-public', 'playlist-modify-private']) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      show_dialog: 'true'
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  // Set tokens from stored values (for initialization)
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  // Get current user profile
  async getCurrentUser() {
    await this.ensureValidToken();

    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to fetch current user: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    return data;
  }

  // Create a new playlist
  async createPlaylist(userId, name, description = '', isPublic = false) {
    await this.ensureValidToken();

    const response = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        public: isPublic,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to create playlist: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    logger.info(`Created playlist "${name}" with ID: ${data.id}`);
    return data;
  }

  // Add tracks to a playlist
  async addTracksToPlaylist(playlistId, spotifyUris) {
    await this.ensureValidToken();

    // Spotify API accepts max 100 tracks per request
    const batchSize = 100;
    const batches = [];

    for (let i = 0; i < spotifyUris.length; i += batchSize) {
      batches.push(spotifyUris.slice(i, i + batchSize));
    }

    let addedCount = 0;

    for (const batch of batches) {
      const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uris: batch,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        logger.error(`Failed to add tracks to playlist: ${error}`);
        throw new Error(`Spotify API error: ${error}`);
      }

      addedCount += batch.length;
      logger.info(`Added ${batch.length} tracks to playlist (total: ${addedCount})`);
    }

    return addedCount;
  }

  // Search for tracks on Spotify
  async searchTrack(query, limit = 1) {
    await this.ensureValidToken();

    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to search for track: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    return data.tracks.items;
  }

  // Search for albums on Spotify
  async searchAlbums(query, limit = 10) {
    await this.ensureValidToken();

    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=album&limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to search for albums: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    return data;
  }

  // Get album details with tracks
  async getAlbum(albumId) {
    await this.ensureValidToken();

    // Extract just the ID from spotify:album:id format if needed
    const id = albumId.replace('spotify:album:', '');

    const response = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error(`Failed to fetch album ${albumId}: ${error}`);
      throw new Error(`Spotify API error: ${error}`);
    }

    const data = await response.json();
    return data;
  }
}

export default SpotifyService;