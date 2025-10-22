/**
 * OpenAI Function/Tool Definitions
 * Schemas for all AI chat functions (OpenAI Tools API format)
 */

export const CHAT_FUNCTIONS = [
  {
    type: 'function',
    function: {
      name: 'getTopArtists',
      description: 'Get the user\'s top artists for a specific time period. IMPORTANT: Use rolling windows (7d=last 7 days, 1m=last 30 days, NOT calendar months)',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7day', '1month', '3month', '6month', '12month', 'overall'],
            description: 'Time period: 7day (last 7 days), 1month (last 30 days), 3month (last 90 days), 6month (last 180 days), 12month (last 365 days), overall (all time). Use 1month for "last month" requests.'
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
      description: 'Get the user\'s top tracks for a specific time period. Use rolling windows (1month=last 30 days, NOT calendar months)',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7day', '1month', '3month', '6month', '12month', 'overall'],
            description: 'Time period: 7day (last 7 days), 1month (last 30 days), 3month (last 90 days), 6month (last 180 days), 12month (last 365 days), overall (all time)'
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
      description: 'Get the user\'s top albums for a specific time period. Use rolling windows (1month=last 30 days, NOT calendar months)',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7day', '1month', '3month', '6month', '12month', 'overall'],
            description: 'Time period: 7day (last 7 days), 1month (last 30 days), 3month (last 90 days), 6month (last 180 days), 12month (last 365 days), overall (all time)'
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
      description: 'Get genre distribution and percentages for the user\'s listening in a time period. Use rolling windows (1month=last 30 days)',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7day', '1month', '3month', '6month', '12month', 'overall'],
            description: 'Time period: 7day (last 7 days), 1month (last 30 days), 3month (last 90 days), 6month (last 180 days), 12month (last 365 days), overall (all time)'
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
      description: 'Get statistics about new music discovery (new artists, tracks, albums) for a time period. Use rolling windows (1month=last 30 days)',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['7day', '1month', '3month', '6month', '12month', 'overall'],
            description: 'Time period: 7day (last 7 days), 1month (last 30 days), 3month (last 90 days), 6month (last 180 days), 12month (last 365 days), overall (all time)'
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
  },
  {
    type: 'function',
    function: {
      name: 'getTopArtistsByDateRange',
      description: 'Get top artists for a specific calendar date range (e.g., "August 2025", "January 1-15, 2025"). Use this for SPECIFIC MONTHS or DATE RANGES, not rolling windows.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (e.g., "2025-08-01" for August 1st, 2025)'
          },
          endDate: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format (e.g., "2025-08-31" for August 31st, 2025)'
          },
          limit: {
            type: 'number',
            description: 'Number of artists to return',
            default: 10
          }
        },
        required: ['startDate', 'endDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopTracksByDateRange',
      description: 'Get top tracks for a specific calendar date range. Use this for SPECIFIC MONTHS or DATE RANGES, not rolling windows.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (e.g., "2025-08-01")'
          },
          endDate: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format (e.g., "2025-08-31")'
          },
          limit: {
            type: 'number',
            description: 'Number of tracks to return',
            default: 10
          }
        },
        required: ['startDate', 'endDate']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'getTopAlbumsByDateRange',
      description: 'Get top albums for a specific calendar date range. Use this for SPECIFIC MONTHS or DATE RANGES, not rolling windows.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: 'Start date in YYYY-MM-DD format (e.g., "2025-08-01")'
          },
          endDate: {
            type: 'string',
            description: 'End date in YYYY-MM-DD format (e.g., "2025-08-31")'
          },
          limit: {
            type: 'number',
            description: 'Number of albums to return',
            default: 10
          }
        },
        required: ['startDate', 'endDate']
      }
    }
  }
];
