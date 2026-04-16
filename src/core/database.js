import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

let db;
const stmtCache = new Map();

// Columns from earlier iterations that should be dropped if present
const DEAD_COLUMNS = ['essence', 'meditate_available_at', 'tribulation_charge'];

export function getDb() {
  if (db) return db;
  mkdirSync('data', { recursive: true });
  db = new Database('data/tianming.db');
  db.pragma('journal_mode=WAL'); db.pragma('synchronous=NORMAL'); db.pragma('cache_size=-64000'); db.pragma('foreign_keys=ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_active INTEGER NOT NULL DEFAULT (unixepoch()),
      realm INTEGER NOT NULL DEFAULT 0 CHECK(realm >= 0),
      stage INTEGER NOT NULL DEFAULT 0 CHECK(stage >= 0),
      step INTEGER NOT NULL DEFAULT 0 CHECK(step >= 0),
      qi INTEGER NOT NULL DEFAULT 0 CHECK(qi >= 0),
      cultivation_tick_at INTEGER NOT NULL DEFAULT (unixepoch()),
      prowess_bonus_pct INTEGER NOT NULL DEFAULT 0 CHECK(prowess_bonus_pct >= 0),
      spirit_stones INTEGER NOT NULL DEFAULT 0 CHECK(spirit_stones >= 0),
      jade INTEGER NOT NULL DEFAULT 0 CHECK(jade >= 0)
    );
    CREATE TABLE IF NOT EXISTS talents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      talent_id TEXT NOT NULL,
      granted_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_talents_pid ON talents(player_id);
    CREATE TABLE IF NOT EXISTS daoists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      daoist_id TEXT NOT NULL,
      obtained_at INTEGER NOT NULL DEFAULT (unixepoch()),
      in_team INTEGER NOT NULL DEFAULT 0 CHECK(in_team IN (0, 1))
    );
    CREATE INDEX IF NOT EXISTS idx_daoists_pid ON daoists(player_id);
  `);

  // Additive migrations (safe to re-run)
  const cols = new Set(db.pragma('table_info(players)').map(c => c.name));
  const add = (name, ddl) => { if (!cols.has(name)) db.exec(`ALTER TABLE players ADD COLUMN ${name} ${ddl}`); };
  add('realm',               "INTEGER NOT NULL DEFAULT 0");
  add('stage',               "INTEGER NOT NULL DEFAULT 0");
  add('step',                "INTEGER NOT NULL DEFAULT 0");
  add('qi',                  "INTEGER NOT NULL DEFAULT 0");
  add('cultivation_tick_at', "INTEGER NOT NULL DEFAULT (unixepoch())");
  add('prowess_bonus_pct',   "INTEGER NOT NULL DEFAULT 0");
  add('spirit_stones',       "INTEGER NOT NULL DEFAULT 0");
  add('jade',                "INTEGER NOT NULL DEFAULT 0");
  // Drop retired columns if a dev DB from an earlier iteration still has them
  for (const col of DEAD_COLUMNS) if (cols.has(col)) db.exec(`ALTER TABLE players DROP COLUMN ${col}`);

  return db;
}

export function sql(q) {
  let s = stmtCache.get(q);
  if (!s) { s = getDb().prepare(q); stmtCache.set(q, s); }
  return s;
}

export function tx(fn) { return getDb().transaction(fn)(); }
