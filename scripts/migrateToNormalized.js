import sqlite3 from "sqlite3";
import { open } from "sqlite";

async function migrate() {
  const db = await open({
    filename: "../backend/data/recentTracks.db",
    driver: sqlite3.Database
  });

  // Wrap everything in a transaction for speed & safety
  await db.exec("BEGIN TRANSACTION");

  try {
    const plays = await db.all("SELECT * FROM plays");
    console.log(`Migrating ${plays.length} plays...`);

    for (const play of plays) {
      const { track, artist, album, timestamp } = play;

      // 1. Insert/find artist
      let artistRow = await db.get(
        "SELECT id FROM artists WHERE name = ?",
        artist
      );
      if (!artistRow) {
        await db.run(
          "INSERT INTO artists (name) VALUES (?)",
          artist
        );
        artistRow = await db.get(
          "SELECT id FROM artists WHERE name = ?",
          artist
        );
      }
      const artistId = artistRow.id;

      // 2. Insert/find album (optional, may be null)
      let albumId = null;
      if (album) {
        let albumRow = await db.get(
          "SELECT id FROM albums WHERE name = ? AND artist_id = ?",
          album,
          artistId
        );
        if (!albumRow) {
          await db.run(
            "INSERT INTO albums (name, artist_id) VALUES (?, ?)",
            album,
            artistId
          );
          albumRow = await db.get(
            "SELECT id FROM albums WHERE name = ? AND artist_id = ?",
            album,
            artistId
          );
        }
        albumId = albumRow.id;
      }

      // 3. Insert/find track
      let trackRow = await db.get(
        "SELECT id FROM tracks WHERE name = ? AND artist_id = ? AND album_id IS ?",
        track,
        artistId,
        albumId
      );
      if (!trackRow) {
        await db.run(
          "INSERT INTO tracks (name, artist_id, album_id) VALUES (?, ?, ?)",
          track,
          artistId,
          albumId
        );
        trackRow = await db.get(
          "SELECT id FROM tracks WHERE name = ? AND artist_id = ? AND album_id IS ?",
          track,
          artistId,
          albumId
        );
      }
      const trackId = trackRow.id;

      // 4. Insert play
      await db.run(
        "INSERT INTO plays (track_id, timestamp) VALUES (?, ?)",
        trackId,
        timestamp
      );
    }

    await db.exec("COMMIT");
    console.log("✅ Migration completed successfully.");
  } catch (err) {
    await db.exec("ROLLBACK");
    console.error("❌ Migration failed:", err);
  } finally {
    await db.close();
  }
}

migrate();