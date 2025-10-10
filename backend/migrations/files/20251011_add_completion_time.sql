-- Migration: Add completion time to trivia sessions
-- Description: Store how long it took to complete the trivia session

ALTER TABLE trivia_sessions
ADD COLUMN completion_time_seconds INTEGER;

COMMENT ON COLUMN trivia_sessions.completion_time_seconds IS 'Time taken to complete the session in seconds';
