-- Create table for storing AI-generated listening analyses
CREATE TABLE IF NOT EXISTS listening_analyses (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    -- Raw listening data for the week
    total_plays INTEGER NOT NULL,
    unique_tracks INTEGER NOT NULL,
    unique_artists INTEGER NOT NULL,
    unique_albums INTEGER NOT NULL,
    total_listening_minutes INTEGER,

    -- AI Analysis results
    mood_summary TEXT,
    key_insights JSONB, -- Array of insight strings
    listening_patterns TEXT,
    musical_personality TEXT,
    trends_vs_previous TEXT,
    recommendations TEXT,

    -- Metadata
    analysis_date TIMESTAMP DEFAULT NOW(),
    openai_model VARCHAR(50),
    openai_usage JSONB, -- Token usage info

    -- Constraints
    UNIQUE(week_start, week_end)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_listening_analyses_week_start ON listening_analyses(week_start);
CREATE INDEX IF NOT EXISTS idx_listening_analyses_date ON listening_analyses(analysis_date);

-- Create table for storing weekly listening summaries (raw data before AI analysis)
CREATE TABLE IF NOT EXISTS weekly_listening_summaries (
    id SERIAL PRIMARY KEY,
    week_start DATE NOT NULL,
    week_end DATE NOT NULL,

    -- Summary stats
    total_plays INTEGER NOT NULL,
    unique_tracks INTEGER NOT NULL,
    unique_artists INTEGER NOT NULL,
    unique_albums INTEGER NOT NULL,
    total_listening_minutes INTEGER,

    -- Top content (JSON arrays)
    top_artists JSONB, -- [{name, plays, image}]
    top_tracks JSONB,  -- [{name, artist, plays, album}]
    top_albums JSONB,  -- [{name, artist, plays, image}]

    -- Listening patterns
    daily_patterns JSONB, -- {most_active_days: [], plays_by_day: {}}
    hourly_patterns JSONB, -- {peak_hours: [], plays_by_hour: {}}

    -- Musical diversity
    repeat_factor DECIMAL(4,2), -- total_plays / unique_tracks
    discovery_rate DECIMAL(5,2), -- percentage of unique tracks

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    UNIQUE(week_start, week_end)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON weekly_listening_summaries(week_start);
CREATE INDEX IF NOT EXISTS idx_weekly_summaries_created ON weekly_listening_summaries(created_at);

-- Insert initial comment
COMMENT ON TABLE listening_analyses IS 'Stores AI-generated insights about weekly listening patterns and mood analysis';
COMMENT ON TABLE weekly_listening_summaries IS 'Stores raw weekly listening data summaries for AI analysis';