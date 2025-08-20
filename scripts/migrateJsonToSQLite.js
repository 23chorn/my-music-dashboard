import fs from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JSON_FILE = join(__dirname, "../public/data/recentTracks.json");
const DB_FILE = join(__dirname, "../public/data/recentTracks.db");

async function migrate() {
  // Open (or create) SQLite DB
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  // Create table with uniqueness constraint
  await db.exec(`
    CREATE TABLE IF NOT EXISTS plays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track TEXT NOT NULL,
      artist TEXT NOT NULL,
      album TEXT,
      timestamp INTEGER NOT NULL,
      UNIQUE(track, artist, album, timestamp)
    );
  `);

  await db.exec(`CREATE INDEX IF NOT EXISTS idx_artist ON plays(artist);`);
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON plays(timestamp);`);

  // Load JSON
  const raw = fs.readFileSync(JSON_FILE, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse JSON:", err);
    process.exit(1);
  }

  const history = parsed.tracks;
  if (!Array.isArray(history)) {
    console.error("No 'tracks' array found in JSON");
    process.exit(1);
  }

  console.log(`Migrating ${history.length} tracks from JSON to SQLite...`);

  const insertStmt = await db.prepare(`
    INSERT OR IGNORE INTO plays (track, artist, album, timestamp)
    VALUES (?, ?, ?, ?)
  `);

  for (const entry of history) {
    const track = entry.track;
    const artist = entry.artist;
    const album = entry.album || "";
    const timestamp = entry.timestamp;

    if (!track || !artist || !timestamp) {
      console.warn("Skipping invalid entry:", entry);
      continue;
    }

    await insertStmt.run(track, artist, album, timestamp);
  }

  await insertStmt.finalize();
  await db.close();

  console.log("Migration complete!");
}

migrate();