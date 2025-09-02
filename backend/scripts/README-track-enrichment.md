# Track Artist Enrichment Script

This script enriches your track data by:

1. **Finding tracks with Spotify URIs** - Looks for tracks that have been linked to Spotify in the `external_ids` table
2. **Fetching full artist data** - Uses the Spotify API to get complete artist information for each track
3. **Storing artist relationships** - Adds all artists to the `track_artists` table (not just the primary artist)
4. **Cleaning track names** - Removes featuring artists from track names since they're now stored separately

## Prerequisites

You need these environment variables set:

```bash
DATABASE_URL=your_postgresql_connection_string
SPOTIFY_ACCESS_TOKEN=your_spotify_access_token
SPOTIFY_REFRESH_TOKEN=your_spotify_refresh_token  
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

## Usage

### Test Mode (Recommended First)
```bash
# Test without making any database changes
./scripts/run-track-enrichment.sh --test

# Or directly:
node scripts/enrichTracksWithSpotifyArtists.js --dry-run
```

### Production Mode
```bash
# Run with database changes
./scripts/run-track-enrichment.sh

# Or directly (will prompt for confirmation):
node scripts/enrichTracksWithSpotifyArtists.js
```

## What It Does

### 1. Artist Data Enrichment
- Fetches complete artist information from Spotify API
- Creates/updates artists with images and metadata  
- Links all artists to tracks (not just primary artist)
- Stores Spotify ID mappings in `external_ids` table

### 2. Track Name Cleaning
Removes featuring artist patterns like:
- `Track Name (feat. Artist Name)`
- `Track Name (featuring Artist Name)`
- `Track Name (ft. Artist)`  
- `Track Name feat. Artist`
- `Track Name - feat. Artist`
- And other variations

### 3. Database Safety
- **Test mode**: Shows what would be changed without making changes
- **Rate limiting**: Includes delays to avoid Spotify API limits
- **Error handling**: Continues processing if individual tracks fail
- **Progress logging**: Detailed logs of what's being processed

## Example Output

```
🎵 Starting Track Artist Enrichment (TEST MODE - NO DATABASE CHANGES)
✅ Spotify service initialized
📊 Found 45 tracks with Spotify URIs to process
🚀 Starting to process 45 tracks...

🎵 Processing: "Bad Guy" (4iV5W9uYEdYUVa79Axb7Rh)
🧪 TEST: Would find/create artist: Billie Eilish
🧪 TEST: Would store track-artist relationship: track 123 -> artist test_artist_3...
✨ Cleaned track name: "Bad Guy (feat. Justin Bieber)" -> "Bad Guy"

🎉 Track Artist Enrichment Complete!
📊 Summary:
  - Tracks processed: 45
  - Tracks updated: 45  
  - Track names cleaned: 12
  - Mode: TEST (no changes made)
```

## Batch Processing

The script processes tracks in batches with rate limiting to respect Spotify API limits:
- Maximum 100 tracks per run
- Small delays between requests
- Automatic retry on rate limits
- Graceful error handling

To process more tracks, run the script multiple times.

## Troubleshooting

### "Missing Spotify tokens" error
Set the required environment variables in your shell or `.env` file.

### "Database connection error"  
Check your `DATABASE_URL` environment variable.

### Rate limiting issues
The script handles this automatically, but if you see many rate limit messages, you can add larger delays.

### No tracks found
This means you don't have tracks with Spotify URIs in your `external_ids` table. You may need to run your Spotify sync first.