import axios from 'axios';
import logger from '../utils/logger.js';

const API_KEY = process.env.LASTFM_API_KEY;
const USERNAME = process.env.LASTFM_USERNAME;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";



export async function fetchAllRecentTracks({ from }) {
  
  const API_KEY = process.env.LASTFM_API_KEY;
  const USERNAME = process.env.LASTFM_USERNAME;
  logger.info(`LASTFM_API_KEY: ${API_KEY ? API_KEY : '[MISSING]'}`);
  logger.info(`LASTFM_USERNAME: ${USERNAME ? USERNAME : '[MISSING]'}`);
  
  logger.info(`fetchAllRecentTracks called with from=${from}`);
  try {
    const params = {
      method: "user.getrecenttracks",
      user: USERNAME,
      api_key: API_KEY,
      format: "json",
      limit: 200,
      from
    };
    logger.info(`Requesting Last.fm with params: ${JSON.stringify(params)}`);

    // Extra logging: check for missing/empty values
    if (!API_KEY) logger.error("API_KEY is missing!");
    if (!USERNAME) logger.error("USERNAME is missing!");
    if (!from) logger.warn("No 'from' timestamp provided.");

    const response = await axios.get(BASE_URL, { params });

    logger.info(`Last.fm response status: ${response.status}`);
    logger.info(`Last.fm response data keys: ${Object.keys(response.data)}`);
    logger.info(`Last.fm full response data: ${JSON.stringify(response.data)}`);

    // Check if the response contains an error
    if (response.data.error) {
      logger.error(`Last.fm API error: ${response.data.error} - ${response.data.message}`);
      throw new Error(`Last.fm API error: ${response.data.message}`);
    }

    const recentTracks = response.data.recenttracks;
    if (!recentTracks) {
      logger.error(`No recenttracks in response: ${JSON.stringify(response.data)}`);
      throw new Error('Last.fm response missing recenttracks field');
    }

    let tracks = recentTracks.track || [];
    
    // Last.fm returns a single object if there's only 1 track, array if multiple
    if (!Array.isArray(tracks)) {
      logger.info(`Single track detected, converting to array`);
      tracks = [tracks];
    }
    
    logger.info(`Received ${tracks.length} tracks from Last.fm`);
    logger.info(`First track sample: ${JSON.stringify(tracks[0])}`);
    
    // Map to your DB format if needed
    const mappedTracks = tracks.map(t => {
      let timestamp = null;
      
      // Extract timestamp from Last.fm response
      if (t.date?.uts) {
        const uts = Number(t.date.uts);
        // Validate timestamp - should be positive and reasonable
        if (uts > 0 && uts > 946684800 && uts < (Date.now() / 1000 + 86400)) { // After year 2000, not more than 1 day in future
          timestamp = uts;
        } else {
          logger.warn(`Invalid Last.fm timestamp ${uts} for track "${t.name}" by "${t.artist?.name || t.artist?.['#text']}"`);
        }
      } else {
        logger.warn(`Missing timestamp for track "${t.name}" by "${t.artist?.name || t.artist?.['#text']}"`);
      }
      
      return {
        track: t.name,
        artist: t.artist && (t.artist.name || t.artist['#text']),
        album: t.album && t.album['#text'],
        timestamp: timestamp,
        played_at: timestamp // For compatibility
      };
    }).filter(t => t.timestamp); // Only keep tracks with valid timestamps
    
    logger.info(`Mapped ${mappedTracks.length} tracks with valid timestamps from ${tracks.length} total tracks`);
    return mappedTracks;
  } catch (error) {
    logger.error(`Error fetching recent tracks from Last.fm: ${error}`);
    if (error.response) {
      logger.error(`Last.fm error response status: ${error.response.status}`);
      logger.error(`Last.fm error response data: ${JSON.stringify(error.response.data)}`);
      throw new Error(`Last.fm API error (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}