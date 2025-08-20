import fs from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, "../spotify-data");
const DB_FILE = join(__dirname, "../public/data/recentTracks.db");
const BACKUP_FILE = join(__dirname, `../public/data/recentTracks_backup_${Date.now()}.db`);

// List of Spotify JSON files to process
const FILES = [
  "Streaming_History_Audio_2011-2023_0.json",
  "Streaming_History_Audio_2023-2024_1.json",
  "Streaming_History_Audio_2024-2025_2.json",
  "Streaming_History_Audio_2025_3.json"
];

async function importSpotifyData() {
  // --- Backup DB before migrating ---
  if (fs.existsSync(DB_FILE)) {
    fs.copyFileSync(DB_FILE, BACKUP_FILE);
    console.log(`🛟 Backup created at: ${BACKUP_FILE}`);
  }

  // Open SQLite DB
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  // Prepare insert statement
  const insertStmt = await db.prepare(`
    INSERT OR IGNORE INTO plays (track, artist, album, timestamp)
    VALUES (?, ?, ?, ?)
  `);

  let inserted = 0;

  for (const file of FILES) {
    const filePath = join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  File not found, skipping: ${filePath}`);
      continue;
    }

    console.log(`📂 Processing ${file}...`);

    const raw = fs.readFileSync(filePath, "utf8");
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`❌ Failed to parse ${file}:`, err);
      continue;
    }

    for (const entry of parsed) {
      const track = entry.master_metadata_track_name;
      const artist = entry.master_metadata_album_artist_name;
      const album = entry.master_metadata_album_album_name || "";

      // Convert ISO timestamp → epoch (seconds)
      const timestamp = entry.ts ? Math.floor(new Date(entry.ts).getTime() / 1000) : null;

      if (!track || !artist || !timestamp) continue;

      await insertStmt.run(track, artist, album, timestamp);
      inserted++;
    }
  }

  await insertStmt.finalize();
  await db.close();

  console.log(`✅ Done! Inserted ~${inserted} tracks into SQLite.`);
}

importSpotifyData();