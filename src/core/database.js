import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

let db;

export function getDb() {
  if (!db) {
    mkdirSync('data', { recursive: true });
    db = new Database('data/nexus.db', { verbose: null });
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = -64000');
    db.pragma('foreign_keys = ON');
    initSchema(db);
  }
  return db;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      last_active INTEGER NOT NULL DEFAULT (unixepoch()),
      -- Currency
      credits INTEGER NOT NULL DEFAULT 500,
      crypto INTEGER NOT NULL DEFAULT 0,
      -- Stats
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      xp_needed INTEGER NOT NULL DEFAULT 100,
      hp INTEGER NOT NULL DEFAULT 100,
      max_hp INTEGER NOT NULL DEFAULT 100,
      attack INTEGER NOT NULL DEFAULT 10,
      defense INTEGER NOT NULL DEFAULT 5,
      -- Networth tracking
      networth INTEGER NOT NULL DEFAULT 500,
      peak_networth INTEGER NOT NULL DEFAULT 500,
      -- Progression
      reputation INTEGER NOT NULL DEFAULT 0,
      energy INTEGER NOT NULL DEFAULT 100,
      max_energy INTEGER NOT NULL DEFAULT 100,
      energy_regen_at INTEGER NOT NULL DEFAULT (unixepoch()),
      -- Active state
      current_view TEXT NOT NULL DEFAULT 'dashboard'
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      type TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      income_rate INTEGER NOT NULL DEFAULT 0,
      last_collected INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(player_id, type)
    );

    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      UNIQUE(player_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS missions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      mission_id TEXT NOT NULL,
      started_at INTEGER NOT NULL DEFAULT (unixepoch()),
      completes_at INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      UNIQUE(player_id, mission_id)
    );

    CREATE TABLE IF NOT EXISTS market_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      action TEXT NOT NULL,
      amount INTEGER NOT NULL,
      price INTEGER NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS leaderboard_cache (
      player_id TEXT PRIMARY KEY REFERENCES players(id),
      networth INTEGER NOT NULL DEFAULT 0,
      rank INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_businesses_player ON businesses(player_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_player ON inventory(player_id);
    CREATE INDEX IF NOT EXISTS idx_missions_player ON missions(player_id);
    CREATE INDEX IF NOT EXISTS idx_leaderboard_networth ON leaderboard_cache(networth DESC);
  `);
}

// Prepared statement cache for performance
const stmtCache = new Map();

export function prepare(sql) {
  if (!stmtCache.has(sql)) {
    stmtCache.set(sql, getDb().prepare(sql));
  }
  return stmtCache.get(sql);
}

export function transaction(fn) {
  return getDb().transaction(fn)();
}
