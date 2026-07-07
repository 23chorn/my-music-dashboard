-- Migration: unique external id per source
-- Description: Prevents the same external ID (e.g. a Spotify track ID) from
-- ever being attached to two different internal rows. Previously the only
-- uniqueness constraint on external_ids was (entity_type, entity_id, source),
-- which stops one entity having two IDs from the same source but does NOT stop
-- two different entities sharing the same external ID. A sync race condition
-- exploited this gap to create duplicate track rows for the same song.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS external_ids_unique_source_external_id
  ON external_ids (entity_type, source, external_id);

COMMIT;
