-- Migration: Create performance indexes and business constraints
-- This adds all the indexes and constraints for optimal performance and data integrity

BEGIN;

-- Track-Artist relationship indexes
CREATE INDEX IF NOT EXISTS idx_track_artists_track_id ON track_artists(track_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_artist_id ON track_artists(artist_id);
CREATE INDEX IF NOT EXISTS idx_track_artists_is_primary ON track_artists(is_primary);

-- Partial index for primary artists only (more efficient for queries)
CREATE INDEX IF NOT EXISTS idx_track_artists_primary_only 
ON track_artists(track_id, artist_id) 
WHERE is_primary = TRUE;

-- Unique constraint: only one primary artist per track
CREATE UNIQUE INDEX IF NOT EXISTS idx_track_artists_one_primary_per_track 
ON track_artists(track_id) 
WHERE is_primary = TRUE;

-- Track-Album relationship indexes
CREATE INDEX IF NOT EXISTS idx_track_albums_track_id ON track_albums(track_id);
CREATE INDEX IF NOT EXISTS idx_track_albums_album_id ON track_albums(album_id);
CREATE INDEX IF NOT EXISTS idx_track_albums_track_number ON track_albums(track_number);
CREATE INDEX IF NOT EXISTS idx_track_albums_disc_number ON track_albums(disc_number);

-- Album-Artist relationship indexes
CREATE INDEX IF NOT EXISTS idx_album_artists_album_id ON album_artists(album_id);
CREATE INDEX IF NOT EXISTS idx_album_artists_artist_id ON album_artists(artist_id);

-- Artist-Genre relationship indexes
CREATE INDEX IF NOT EXISTS idx_artist_genres_artist_id ON artist_genres(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_genres_genre_id ON artist_genres(genre_id);

-- Plays table indexes for performance
CREATE INDEX IF NOT EXISTS idx_plays_track_id ON plays(track_id);
CREATE INDEX IF NOT EXISTS idx_plays_played_at ON plays(played_at);
CREATE INDEX IF NOT EXISTS idx_plays_track_played_at ON plays(track_id, played_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_plays_played_at_desc ON plays(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_plays_track_recent ON plays(track_id, played_at DESC);

-- Date-based indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_plays_date ON plays(DATE(played_at));
CREATE INDEX IF NOT EXISTS idx_plays_week ON plays(DATE_TRUNC('week', played_at));
CREATE INDEX IF NOT EXISTS idx_plays_month ON plays(DATE_TRUNC('month', played_at));

COMMIT;