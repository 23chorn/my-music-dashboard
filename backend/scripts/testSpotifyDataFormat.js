#!/usr/bin/env node

import SpotifyDataProcessor from '../src/services/spotifyDataProcessor.js';
import logger from '../src/utils/logger.js';

// Mock Spotify API response data
const mockSpotifyResponse = {
  items: [
    {
      track: {
        id: "4iV5W9uYEdYUVa79Axb7Rh",
        name: "Creepin'",
        uri: "spotify:track:4iV5W9uYEdYUVa79Axb7Rh",
        href: "https://api.spotify.com/v1/tracks/4iV5W9uYEdYUVa79Axb7Rh",
        duration_ms: 221440,
        explicit: false,
        popularity: 85,
        preview_url: "https://p.scdn.co/mp3-preview/...",
        track_number: 1,
        disc_number: 1,
        is_local: false,
        artists: [
          {
            id: "1Xyo4u8uXC1ZmMpatF05PJ",
            name: "The Weeknd",
            uri: "spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ",
            href: "https://api.spotify.com/v1/artists/1Xyo4u8uXC1ZmMpatF05PJ"
          },
          {
            id: "2YZyLoL8N0Wb9xBt1NhZWg",
            name: "21 Savage",
            uri: "spotify:artist:2YZyLoL8N0Wb9xBt1NhZWg",
            href: "https://api.spotify.com/v1/artists/2YZyLoL8N0Wb9xBt1NhZWg"
          },
          {
            id: "7tYKF4w9nC0nq9CsPZTHyP",
            name: "Metro Boomin",
            uri: "spotify:artist:7tYKF4w9nC0nq9CsPZTHyP",
            href: "https://api.spotify.com/v1/artists/7tYKF4w9nC0nq9CsPZTHyP"
          }
        ],
        album: {
          id: "5EBGCvO6upi3GNknMVe9x9",
          name: "Dawn FM",
          uri: "spotify:album:5EBGCvO6upi3GNknMVe9x9",
          release_date: "2022-01-07",
          release_date_precision: "day",
          total_tracks: 16,
          type: "album",
          images: [
            {
              url: "https://i.scdn.co/image/ab67616d0000b273...",
              height: 640,
              width: 640
            },
            {
              url: "https://i.scdn.co/image/ab67616d00001e02...",
              height: 300,
              width: 300
            }
          ],
          artists: [
            {
              id: "1Xyo4u8uXC1ZmMpatF05PJ",
              name: "The Weeknd",
              uri: "spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ"
            }
          ]
        }
      },
      played_at: "2025-09-01T15:30:22.123Z",
      context: {
        type: "playlist",
        uri: "spotify:playlist:37i9dQZF1DX0XUsuxWHRQd",
        href: "https://api.spotify.com/v1/playlists/37i9dQZF1DX0XUsuxWHRQd"
      }
    },
    {
      track: {
        id: "0VjIjW4GlUla7AgEZnNLaQ",
        name: "Blinding Lights",
        uri: "spotify:track:0VjIjW4GlUla7AgEZnNLaQ",
        href: "https://api.spotify.com/v1/tracks/0VjIjW4GlUla7AgEZnNLaQ",
        duration_ms: 200040,
        explicit: false,
        popularity: 88,
        preview_url: "https://p.scdn.co/mp3-preview/...",
        track_number: 2,
        disc_number: 1,
        is_local: false,
        artists: [
          {
            id: "1Xyo4u8uXC1ZmMpatF05PJ",
            name: "The Weeknd",
            uri: "spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ",
            href: "https://api.spotify.com/v1/artists/1Xyo4u8uXC1ZmMpatF05PJ"
          }
        ],
        album: {
          id: "4yP0hdKOZPNshxUOjY0cZj",
          name: "After Hours",
          uri: "spotify:album:4yP0hdKOZPNshxUOjY0cZj",
          release_date: "2020-03-20",
          release_date_precision: "day",
          total_tracks: 14,
          type: "album",
          images: [
            {
              url: "https://i.scdn.co/image/ab67616d0000b273...",
              height: 640,
              width: 640
            }
          ],
          artists: [
            {
              id: "1Xyo4u8uXC1ZmMpatF05PJ",
              name: "The Weeknd",
              uri: "spotify:artist:1Xyo4u8uXC1ZmMpatF05PJ"
            }
          ]
        }
      },
      played_at: "2025-09-01T15:25:10.456Z",
      context: null
    }
  ]
};

// Mock artist genre data
const mockArtistGenres = new Map([
  ["1Xyo4u8uXC1ZmMpatF05PJ", {
    genres: ["canadian contemporary r&b", "canadian pop", "pop"],
    popularity: 95,
    followers: 45000000,
    images: [{ url: "https://i.scdn.co/image/...", height: 640, width: 640 }]
  }],
  ["2YZyLoL8N0Wb9xBt1NhZWg", {
    genres: ["atl hip hop", "gangster rap", "hip hop", "rap", "trap"],
    popularity: 89,
    followers: 15000000,
    images: [{ url: "https://i.scdn.co/image/...", height: 640, width: 640 }]
  }],
  ["7tYKF4w9nC0nq9CsPZTHyP", {
    genres: ["atl hip hop", "hip hop", "rap", "trap"],
    popularity: 83,
    followers: 8000000,
    images: [{ url: "https://i.scdn.co/image/...", height: 640, width: 640 }]
  }]
]);

class MockSpotifyService {
  async getMultipleArtists(artistIds) {
    return artistIds.map(id => {
      const genreData = mockArtistGenres.get(id);
      return genreData ? {
        id,
        genres: genreData.genres,
        popularity: genreData.popularity,
        followers: { total: genreData.followers },
        images: genreData.images
      } : null;
    }).filter(Boolean);
  }
}

async function testDataFormat() {
  console.log('🧪 TESTING SPOTIFY DATA PROCESSING');
  console.log('====================================\n');
  
  try {
    // Create processor with mock service
    const mockService = new MockSpotifyService();
    const processor = new SpotifyDataProcessor(mockService);
    
    console.log('📥 RAW SPOTIFY API RESPONSE:');
    console.log('============================');
    console.log(JSON.stringify(mockSpotifyResponse, null, 2));
    
    console.log('\n🔄 PROCESSING DATA...\n');
    
    // Process the mock data
    const processedData = await processor.processSpotifyData(mockSpotifyResponse);
    
    console.log('📊 PROCESSED DATA SUMMARY:');
    console.log('===========================');
    console.log(`  • Plays: ${processedData.plays.length}`);
    console.log(`  • Unique Tracks: ${processedData.tracks.length}`);
    console.log(`  • Unique Artists: ${processedData.artists.length}`);
    console.log(`  • Unique Albums: ${processedData.albums.length}`);
    console.log(`  • Genres: ${processedData.genres.length}`);
    console.log(`  • Track-Artist relationships: ${processedData.trackArtists.length}`);
    console.log(`  • Artist-Genre relationships: ${processedData.artistGenres.length}`);
    
    console.log('\n🎵 SAMPLE PLAY RECORD:');
    console.log('=======================');
    const samplePlay = processedData.plays[0];
    console.log(`  Track ID: ${samplePlay.track_id}`);
    console.log(`  Played At: ${samplePlay.played_at}`);
    console.log(`  Context Type: ${samplePlay.context_type}`);
    console.log(`  Context URI: ${samplePlay.context_uri}`);
    
    console.log('\n🎼 SAMPLE TRACK RECORD:');
    console.log('========================');
    const sampleTrack = processedData.tracks[0];
    console.log(`  ID: ${sampleTrack.id}`);
    console.log(`  Name: ${sampleTrack.name}`);
    console.log(`  Duration: ${Math.round(sampleTrack.duration_ms / 1000)}s`);
    console.log(`  Popularity: ${sampleTrack.popularity}`);
    console.log(`  Explicit: ${sampleTrack.explicit}`);
    console.log(`  Spotify URI: ${sampleTrack.spotify_uri}`);
    
    console.log('\n🎤 SAMPLE ARTIST RECORD:');
    console.log('=========================');
    const sampleArtist = processedData.artists[0];
    console.log(`  ID: ${sampleArtist.id}`);
    console.log(`  Name: ${sampleArtist.name}`);
    console.log(`  Popularity: ${sampleArtist.popularity}`);
    console.log(`  Followers: ${sampleArtist.followers?.toLocaleString()}`);
    console.log(`  Spotify URI: ${sampleArtist.spotify_uri}`);
    
    console.log('\n💿 SAMPLE ALBUM RECORD:');
    console.log('========================');
    const sampleAlbum = processedData.albums[0];
    console.log(`  ID: ${sampleAlbum.id}`);
    console.log(`  Name: ${sampleAlbum.name}`);
    console.log(`  Release Date: ${sampleAlbum.release_date}`);
    console.log(`  Total Tracks: ${sampleAlbum.total_tracks}`);
    console.log(`  Album Type: ${sampleAlbum.album_type}`);
    console.log(`  Spotify URI: ${sampleAlbum.spotify_uri}`);
    
    console.log('\n🎭 GENRES FOUND:');
    console.log('=================');
    Array.from(processedData.genres).forEach(genre => {
      console.log(`  • ${genre}`);
    });
    
    console.log('\n🔗 TRACK-ARTIST RELATIONSHIPS:');
    console.log('================================');
    processedData.trackArtists.forEach(rel => {
      const track = processedData.tracks.find(t => t.id === rel.track_id);
      const artist = processedData.artists.find(a => a.id === rel.artist_id);
      console.log(`  • "${track?.name}" → ${artist?.name}`);
    });
    
    console.log('\n🎨 ARTIST-GENRE RELATIONSHIPS:');
    console.log('================================');
    processedData.artistGenres.forEach(rel => {
      const artist = processedData.artists.find(a => a.id === rel.artist_id);
      console.log(`  • ${artist?.name} → ${rel.genre_name}`);
    });
    
    console.log('\n✅ DATA PROCESSING TEST COMPLETE');
    console.log('==================================');
    console.log('This shows exactly how Spotify data will be formatted for database insertion.');
    console.log('Multiple artists per track are properly captured!');
    console.log('Genre data is fetched and linked to artists!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run test
testDataFormat();