-- Migration: Create relationship tables with foreign key constraints
-- These tables link the core entities together

BEGIN;

-- Create track_artists table (many-to-many: tracks <-> artists)
CREATE TABLE IF NOT EXISTS track_artists (
    track_id INTEGER NOT NULL,
    artist_id INTEGER NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT track_artists_pkey PRIMARY KEY (track_id, artist_id),
    CONSTRAINT track_artists_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    CONSTRAINT track_artists_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

-- Create track_albums table (many-to-many: tracks <-> albums)
CREATE TABLE IF NOT EXISTS track_albums (
    track_id INTEGER NOT NULL,
    album_id INTEGER NOT NULL,
    track_number INTEGER,
    disc_number INTEGER,
    CONSTRAINT track_albums_pkey PRIMARY KEY (track_id, album_id),
    CONSTRAINT track_albums_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE,
    CONSTRAINT track_albums_album_id_fkey FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE
);

-- Create album_artists table (many-to-many: albums <-> artists)
CREATE TABLE IF NOT EXISTS album_artists (
    album_id INTEGER NOT NULL,
    artist_id INTEGER NOT NULL,
    CONSTRAINT album_artists_pkey PRIMARY KEY (album_id, artist_id),
    CONSTRAINT album_artists_album_id_fkey FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
    CONSTRAINT album_artists_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE
);

-- Create artist_genres table (many-to-many: artists <-> genres)
CREATE TABLE IF NOT EXISTS artist_genres (
    artist_id INTEGER NOT NULL,
    genre_id INTEGER NOT NULL,
    CONSTRAINT artist_genres_pkey PRIMARY KEY (artist_id, genre_id),
    CONSTRAINT artist_genres_artist_id_fkey FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE CASCADE,
    CONSTRAINT artist_genres_genre_id_fkey FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
);

-- Create plays table (tracks play history)
CREATE TABLE IF NOT EXISTS plays (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    track_id INTEGER,
    played_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT plays_pkey PRIMARY KEY (id),
    CONSTRAINT plays_track_id_fkey FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

COMMIT;