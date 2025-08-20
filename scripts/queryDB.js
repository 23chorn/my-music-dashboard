import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_FILE = join(__dirname, "../public/data/recentTracks.db");

async function queryDB() {
  const db = await open({
    filename: DB_FILE,
    driver: sqlite3.Database,
  });

  // Count total tracks
  const total = await db.get("SELECT COUNT(*) as count FROM plays");
  console.log("Total tracks in DB:", total.count);

  // Sample the first 10 tracks
  const sample = await db.all("SELECT * FROM plays ORDER BY timestamp DESC LIMIT 5");
  console.table(sample);

  await db.close();
}

queryDB();