# Tracklist order / duplicate-track cleanup — status and next steps

## READ THIS FIRST: real outstanding items as of 2026-07-05 evening

1. **Track-order backfill — blocked until ~20:25 UTC today.** See "Next:
   finish the track-order backfill" section below for the exact command.
   Nothing else is blocked on the rate limit.
2. **NEW — track/album cross-contamination bug (separate from everything
   above), partially investigated, not fixed in bulk.** A track can be
   linked to more than one album (`track_albums` is many-to-many) — usually
   legit (deluxe edition, compilation, soundtrack), but some tracks are
   wrongly linked to a completely unrelated album with unrelated artist
   credits glued on. Confirmed example: track 21047 "The One" (Kanye
   West / 2 Chainz / Big Sean / Marsha Ambrosius, from *Cruel Summer*) was
   also incorrectly linked to the *Dune* soundtrack album with Hans Zimmer
   added as a credited artist — **fixed manually** (removed the `Dune`
   `track_albums` row and the Hans Zimmer `track_artists` row for track
   21047).
   - `scripts/audit-track-album-crosslinks.js` (read-only, safe to re-run
     any time) finds candidates: tracks on 2+ albums whose credited artists
     never overlap. Currently reports **108 suspect tracks** — some are
     real cross-contamination like the Dune case, but a meaningful chunk
     are likely false positives (compilations/soundtracks whose
     `album_artists` just isn't fully populated). **Each one needs a quick
     manual look (or a Spotify lookup once the rate limit clears) before
     touching it** — do not bulk-auto-fix this list.
3. **Self-caused regression to review:** while fixing the bigger
   external-id issue earlier today, `fix-external-id-collisions.js`'s
   "same name → merge" rule for tracks was too loose for generic/short
   titles — unlike the original `merge-duplicate-tracks.js` (which required
   same album *and* same name), this one only required the same name. Cross-
   checking today's merges against the crosslink audit found at least 2-3
   likely-bad merges, all low-impact (1-2 plays each):
   - **"Lightworks"** (track id 16623) — merged a J Dilla *Donuts* track
     with what was probably an MF DOOM *Operation: Doomsday* track; they
     only share a title. Likely wrong, not yet undone.
   - **"KEYS TO MY LIFE" / "TALKING"** (track ids 20946 / 20948) — merged
     a *VULTURES 1* (¥$ / Kanye West) track with one from an album called
     *FIELD TRIP*. Genuinely unclear — "¥$" is Ye & Ty Dolla $ign's joint
     alias, so this might actually be correct. Needs a Spotify lookup to
     resolve, not a guess.
   - Not touched yet because undoing means splitting one track back into
     two, and with only 1 play recorded on some of these there's no way to
     know which album that historical play actually belongs to — pick this
     up once Spotify access is back so real metadata (not guessing) drives
     the split.
   - "Underwater" (14008) showing up in the crosslink audit is **not**
     caused by this — it was already linked to 2 unrelated albums before
     today's fix touched it at all (confirmed via the pre-merge CSV
     backup); today's merge just added a third link to it.

## Original notes below (2026-07-05 daytime session)

## Done (2026-07-05)

- **Duplicate tracks merged.** 439 track rows that were really the same song
  split across two internal IDs (root cause: `external_ids` had no
  uniqueness constraint on `(entity_type, source, external_id)`, only on
  `(entity_type, entity_id, source)`, so a sync race could attach the same
  Spotify track ID to two different track rows) have been merged via
  `scripts/merge-duplicate-tracks.js --execute`. Verified: e.g. "SICKO MODE"
  on ASTROWORLD and "Pusha Man" on Acid Rap are now single rows with correct
  track numbers and combined play counts.
- A CSV backup of `tracks`, `plays`, `track_albums`, `track_artists`,
  `external_ids`, `entity_tags` was taken before the merge, at
  `scripts/backup/snapshots/<timestamp>/`.
- 2 groups were correctly left alone as genuinely different songs sharing a
  title (not duplicates): "Courtesy" on the *PRhyme* album (ids 12725 vs
  16326 — one is actually Jme's unrelated song, likely a wrong-album
  assignment worth a manual look) and "White Christmas" on *Selections From
  Irving Berlin's White Christmas* (Drifters vs Bing Crosby — legitimately
  two different recordings).
- `scripts/merge-duplicate-tracks.js` is idempotent — safe to re-run any
  time; it will report 0 groups if nothing is left to merge.

## Next: finish the track-order backfill (blocked on Spotify rate limit)

`scripts/backfill-track-numbers.js` fetches each album's real tracklist from
Spotify and fixes wrong/missing `track_albums.track_number` /
`disc_number` (the actual cause of albums displaying in the wrong order —
tracks with no number fall back to alphabetical sort).

**Do not run this before ~2026-07-05 20:25 UTC** — an earlier run (before
retry/backoff logic was added) tripped a Spotify rate-limit penalty with a
12.6-hour `Retry-After`. Running again before then will likely just get
rate-limited again immediately.

To run:
```bash
cd backend
node scripts/backfill-track-numbers.js            # dry run, prints planned changes
node scripts/backfill-track-numbers.js --execute   # apply
```
It processes ~3,262 albums at ~300ms/request (roughly 15-20 minutes) and
retries with backoff on 429s. If you see repeated long "rate limited,
waiting Ns..." messages, stop it and wait longer before retrying — don't
let it sit through a multi-hour backoff.

## Update 2026-07-05 (later same day): bigger issue fixed too

Investigated and fixed the external-ids collision problem described below.
Pattern held across all three entity types: almost all collisions were
unrelated entities sharing one bogus ID (from an old bad enrichment run),
not real duplicates. `scripts/fix-external-id-collisions.js` (dry-run by
default, `--execute` to apply) automatically told the two cases apart by
whether every entity in a violating group had the same name:

- **Tracks:** 940 groups → 3 merges (49 originally, 46 already handled by
  the earlier per-album merge pass) + 850 bad-mapping deletions.
- **Albums:** 203 groups → 2 merges ("Back of My Mind", "Center of
  Attention") + 201 bad-mapping deletions.
- **Artists:** 51 groups → 0 merges, 51 bad-mapping deletions.
- Plus 3 orphaned `external_ids` rows (pointing at already-deleted tracks)
  cleaned up manually.

Verified after: play count (129,658) and tag count (29) unchanged from the
pre-cleanup backup — nothing was lost, only bad ID mappings removed and a
handful of genuine duplicates merged.

The `external_ids_unique_source_external_id` unique index
(`migrations/files/20260705114500_unique_external_id_per_source.sql`) is
now applied and recorded in `schema_migrations` — this whole bug class is
now structurally impossible going forward.

Known limitation: a few genuine duplicate artists weren't caught because
their names differ by punctuation only (e.g. "RUN-DMC" vs "Run-D.M.C.",
possibly "Black Star" vs "Blackstar") — the matcher only normalizes
whitespace/case, not punctuation, to avoid false-merging unrelated artists.
These remain as separate, harmless rows; not urgent.

## Original notes on the bigger issue (superseded by the fix above)

While trying to add a DB constraint to stop the duplicate-track bug from
ever recurring, discovered the same underlying gap (no uniqueness on
`external_ids(entity_type, source, external_id)`) has produced far more
extensive damage than just tracks:

```sql
SELECT ei.entity_type, count(*) as violating_groups
FROM (
  SELECT source, external_id, entity_type FROM external_ids
  GROUP BY source, external_id, entity_type HAVING count(distinct entity_id) > 1
) ei
GROUP BY ei.entity_type;
```
As of 2026-07-05: **203 album groups, 940 track groups (only ~493 of which
were the same-song-different-name-album case already fixed above — many
more remain, some apparently unrelated songs sharing an ID), 51 artist
groups.**

Example of how bad the album case is: Spotify album ID
`spotify:album:0SHlsKruygN9cOfAnaLxvM` is attached to **8** different
"album" rows in this DB (ids 6450, 6508, 6794, 6811, 6812, 6899, 6902,
6986) — several of which are clearly track titles, not album titles (e.g.
"Ray Gun (feat. DOOM)", "Back Like That"). This looks like an older
import/migration bug, distinct from the live sync race condition, and
predates it.

This was *not* investigated further — merging albums is much higher risk
than merging tracks (touches `track_albums`, `album_artists`, tags across
potentially hundreds of tracks per album), and needs its own careful,
read-only audit pass before any write:

1. Write a read-only audit script that, for each violating `external_id`
   group, prints out the entity names/ids/track counts/play counts, similar
   to what `merge-duplicate-tracks.js` does for its dry-run report.
2. Look for a pattern in *why* the collisions happened (single-track
   "albums" vs real multi-disc albums, timing of `last_fetched`, whether
   they trace to a specific old script in `scripts/enrichment/` or
   `scripts/migration/`) before deciding on a merge strategy — album merges
   are not as mechanically safe as the track merge was.
3. Only once that's understood, consider a `merge-duplicate-albums.js` /
   `merge-duplicate-artists.js` following the same dry-run-first,
   per-group-commit pattern as `merge-duplicate-tracks.js`.
4. Once all three entity types are clean, apply
   `migrations/files/20260705114500_unique_external_id_per_source.sql`
   (already written, currently NOT applied — it fails today because of the
   above violations) to make this whole class of bug structurally
   impossible going forward.

## Files added this session

- `scripts/merge-duplicate-tracks.js` — done, already run to completion.
- `scripts/backfill-track-numbers.js` — ready, blocked on Spotify rate limit.
- `migrations/files/20260705114500_unique_external_id_per_source.sql` —
  written, NOT yet applied (blocked on album/artist cleanup above).
