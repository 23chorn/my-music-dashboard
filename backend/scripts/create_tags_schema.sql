-- Custom tags system schema
-- This script creates tables for user-defined tags that can be applied to tracks, albums, and artists

-- Table to store unique tag names
CREATE TABLE IF NOT EXISTS tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color for tags
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table to associate tags with entities (tracks, albums, artists)
CREATE TABLE IF NOT EXISTS entity_tags (
    id SERIAL PRIMARY KEY,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL,
    entity_type VARCHAR(10) NOT NULL CHECK (entity_type IN ('track', 'album', 'artist')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique combination of tag + entity
    UNIQUE(tag_id, entity_id, entity_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_entity_tags_entity ON entity_tags(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_entity_tags_tag ON entity_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on tags table
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some example tags (optional)
INSERT INTO tags (name, color) VALUES
    ('Favorites', '#EF4444'),
    ('Workout', '#F97316'),
    ('Chill', '#10B981'),
    ('Study', '#3B82F6'),
    ('Party', '#8B5CF6')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE tags IS 'Stores user-defined tag names and their colors';
COMMENT ON TABLE entity_tags IS 'Associates tags with music entities (tracks, albums, artists)';
COMMENT ON COLUMN entity_tags.entity_type IS 'Type of entity: track, album, or artist';
COMMENT ON COLUMN tags.color IS 'Hex color code for tag display (e.g., #3B82F6)';