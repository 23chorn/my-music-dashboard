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

    const tracks = response.data.recenttracks?.track || [];
    logger.info(`Received ${tracks.length} tracks from Last.fm`);
    // Map to your DB format if needed
    const mappedTracks = tracks.map(t => ({
      track: t.name,
      artist: t.artist && (t.artist.name || t.artist['#text']),
      album: t.album && t.album['#text'],
      timestamp: t.date?.uts ? Number(t.date.uts) : null
    })).filter(t => t.timestamp);
    logger.info(`Mapped ${mappedTracks.length} tracks with valid timestamps`);
    return mappedTracks;
  } catch (error) {
    logger.error(`Error fetching recent tracks from Last.fm: ${error}`);
    if (error.response) {
      logger.error(`Last.fm error response status: ${error.response.status}`);
      logger.error(`Last.fm error response data: ${JSON.stringify(error.response.data)}`);
    }
    return [];
  }
}