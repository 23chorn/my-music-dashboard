-- Migration: Create custom types and enums
-- This creates all the user-defined types used in the schema

BEGIN;

-- Create enum for release precision
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'release_precision_enum') THEN
        CREATE TYPE release_precision_enum AS ENUM ('year', 'month', 'day');
    END IF;
END $$;

-- Create enum for entity types (used by external_ids)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'entity_type_enum') THEN
        CREATE TYPE entity_type_enum AS ENUM ('artist', 'album', 'track');
    END IF;
END $$;

COMMIT;