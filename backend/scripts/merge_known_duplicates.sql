-- Merge Known Duplicate Tracks
-- These are orphaned tracks without external IDs that should be merged into their counterparts

BEGIN;

-- ==============================================
-- 1. MERGE "Who Shot Me?" TRACKS
-- ==============================================
-- Keep: 24914 (74 plays + Spotify ID)
-- Remove: 24949 (7 plays + no Spotify ID)

-- Move plays from 24949 to 24914
UPDATE plays SET track_id = 24914 WHERE track_id = 24949;

-- Remove relationships for track 24949
DELETE FROM track_artists WHERE track_id = 24949;
DELETE FROM track_albums WHERE track_id = 24949;

-- Remove the orphaned track
DELETE FROM tracks WHERE id = 24949;

-- ==============================================
-- 2. MERGE "Word Is Bond" TRACKS
-- ==============================================
-- Keep: 24913 (35 plays + Spotify ID)
-- Remove: 24948 (7 plays + no Spotify ID)

-- Move plays from 24948 to 24913
UPDATE plays SET track_id = 24913 WHERE track_id = 24948;

-- Remove relationships for track 24948
DELETE FROM track_artists WHERE track_id = 24948;
DELETE FROM track_albums WHERE track_id = 24948;

-- Remove the orphaned track
DELETE FROM tracks WHERE id = 24948;

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Check final play counts
SELECT
    t.id,
    t.title,
    COUNT(p.id) as total_plays,
    (SELECT COUNT(*) FROM external_ids WHERE entity_id = t.id AND entity_type = 'track') as external_id_count
FROM tracks t
LEFT JOIN plays p ON t.id = p.track_id
WHERE t.id IN (24914, 24913)
GROUP BY t.id, t.title
ORDER BY t.id;

-- Expected results:
-- Track 24914 ("Who Shot Me?"): 81 plays (74 + 7), 1 external ID
-- Track 24913 ("Word Is Bond"): 42 plays (35 + 7), 1 external ID

-- Verify orphaned tracks are gone
SELECT COUNT(*) as remaining_orphans
FROM tracks
WHERE id IN (24949, 24948);
-- Expected: 0

COMMIT;

-- Summary:
-- ✅ "Who Shot Me?" merged: 24949 → 24914 (7 + 74 = 81 plays)
-- ✅ "Word Is Bond" merged: 24948 → 24913 (7 + 35 = 42 plays)
-- ✅ Orphaned tracks removed, external IDs preserved