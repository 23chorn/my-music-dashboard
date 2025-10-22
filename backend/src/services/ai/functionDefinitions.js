/**
 * OpenAI Function/Tool Definitions
 * Schemas for all AI chat functions (OpenAI Tools API format)
 */

export const CHAT_FUNCTIONS = [
  {
    type: 'function',
    function: {
      name: 'getTopArtists',
      description: 'Get the user\'s top artists for a specific time period',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
            description: 'Time period: 7d (week), 1m (month), 3m, 6m, 1y (year), all'
          },
          limit: {
            type: 'number',
            description: 'Number of artists to return (default 10)',
            default: 10
          }
        },
        required: ['period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopTracks',
      description: 'Get the user\'s top tracks for a specific time period',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
            description: 'Time period'
          },
          limit: {
            type: 'number',
            description: 'Number of tracks to return',
            default: 10
          }
        },
        required: ['period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getListeningStats',
      description: 'Get overall listening statistics and behavior analysis',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
            description: 'Time period for stats'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getArtistDetails',
      description: 'Get detailed information about a specific artist including play count and stats',
      parameters: {
        type: 'object',
        properties: {
          artistName: {
            type: 'string',
            description: 'Name of the artist to look up'
          }
        },
        required: ['artistName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchMusic',
      description: 'Search for artists, albums, or tracks in the user\'s listening history',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopAlbums',
      description: 'Get the user\'s top albums for a specific time period',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
            description: 'Time period'
          },
          limit: {
            type: 'number',
            description: 'Number of albums to return',
            default: 10
          }
        },
        required: ['period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getGenreBreakdown',
      description: 'Get genre distribution and percentages for the user\'s listening in a time period',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
            description: 'Time period for genre analysis'
          }
        },
        required: ['period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getListeningTimePatterns',
      description: 'Get listening time patterns including peak hours, days of week, and session info',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getDiscoveryStats',
      description: 'Get statistics about new music discovery (new artists, tracks, albums) for a time period',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7d', '1m', '3m', '6m', '1y', 'all'],
            description: 'Time period for discovery analysis'
          }
        },
        required: ['period']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getRecentDiscoveries',
      description: 'Get recently discovered tracks (tracks played for the first time)',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Number of recent discoveries to return',
            default: 10
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'compareArtists',
      description: 'Compare listening statistics between two artists',
      parameters: {
        type: 'object',
        properties: {
          artist1: {
            type: 'string',
            description: 'First artist name'
          },
          artist2: {
            type: 'string',
            description: 'Second artist name'
          }
        },
        required: ['artist1', 'artist2']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getAlbumDetails',
      description: 'Get detailed information about a specific album including tracks and play counts',
      parameters: {
        type: 'object',
        properties: {
          albumName: {
            type: 'string',
            description: 'Name of the album to look up'
          }
        },
        required: ['albumName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTrackDetails',
      description: 'Get detailed information about a specific track including play history',
      parameters: {
        type: 'object',
        properties: {
          trackName: {
            type: 'string',
            description: 'Name of the track to look up'
          }
        },
        required: ['trackName']
      }
    }
  }
];
