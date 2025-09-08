-- Migration: Create core tables (artists, albums, tracks, genres)
-- These are the primary entity tables with no foreign key dependencies

BEGIN;

-- Create artists table
CREATE TABLE IF NOT EXISTS artists (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name TEXT NOT NULL,
    image_url TEXT,
    last_fetched TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT artists_pkey PRIMARY KEY (id)
);

-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name TEXT NOT NULL,
    release_date DATE,
    image_url TEXT,
    last_fetched TIMESTAMP WITHOUT TIME ZONE,
    release_precision release_precision_enum NOT NULL DEFAULT 'day',
    CONSTRAINT albums_pkey PRIMARY KEY (id)
);

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name TEXT,
    duration_ms INTEGER,
    popularity INTEGER,
    release_date DATE,
    last_fetched TIMESTAMP WITHOUT TIME ZONE,
    release_precision release_precision_enum NOT NULL DEFAULT 'day',
    CONSTRAINT tracks_pkey PRIMARY KEY (id)
);

-- Create genres table
CREATE TABLE IF NOT EXISTS genres (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    name TEXT UNIQUE,
    CONSTRAINT genres_pkey PRIMARY KEY (id)
);

-- Create metadata table for system metadata
CREATE TABLE IF NOT EXISTS metadata (
    key CHARACTER VARYING NOT NULL,
    value TEXT,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT metadata_pkey PRIMARY KEY (key)
);

-- Create external_ids table for tracking external identifiers
CREATE TABLE IF NOT EXISTS external_ids (
    id INTEGER GENERATED ALWAYS AS IDENTITY NOT NULL,
    entity_type entity_type_enum,
    entity_id INTEGER,
    source TEXT,
    external_id TEXT,
    CONSTRAINT external_ids_pkey PRIMARY KEY (id)
);

-- Create basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_artists_name ON artists(name);
CREATE INDEX IF NOT EXISTS idx_albums_name ON albums(name);
CREATE INDEX IF NOT EXISTS idx_albums_release_date ON albums(release_date);
CREATE INDEX IF NOT EXISTS idx_tracks_name ON tracks(name);
CREATE INDEX IF NOT EXISTS idx_tracks_duration ON tracks(duration_ms);
CREATE INDEX IF NOT EXISTS idx_tracks_popularity ON tracks(popularity);
CREATE INDEX IF NOT EXISTS idx_tracks_release_date ON tracks(release_date);
CREATE INDEX IF NOT EXISTS idx_genres_name ON genres(name);
CREATE INDEX IF NOT EXISTS idx_external_ids_entity ON external_ids(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_external_ids_source ON external_ids(source, external_id);

COMMIT;