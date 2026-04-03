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
      gold INTEGER NOT NULL DEFAULT 100,

      -- Core Stats
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      xp_needed INTEGER NOT NULL DEFAULT 80,
      hp INTEGER NOT NULL DEFAULT 100,
      max_hp INTEGER NOT NULL DEFAULT 100,
      attack INTEGER NOT NULL DEFAULT 8,
      defense INTEGER NOT NULL DEFAULT 4,
      speed INTEGER NOT NULL DEFAULT 5,
      strength INTEGER NOT NULL DEFAULT 5,

      -- Stamina
      stamina INTEGER NOT NULL DEFAULT 10,
      max_stamina INTEGER NOT NULL DEFAULT 10,
      stamina_regen_at INTEGER NOT NULL DEFAULT (unixepoch()),

      -- Combat record
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      pvp_wins INTEGER NOT NULL DEFAULT 0,
      pvp_losses INTEGER NOT NULL DEFAULT 0,
      raids_completed INTEGER NOT NULL DEFAULT 0,
      bosses_killed INTEGER NOT NULL DEFAULT 0,

      -- Networth
      networth INTEGER NOT NULL DEFAULT 100,
      peak_networth INTEGER NOT NULL DEFAULT 100,

      -- Pupils (My Brute referral system)
      mentor_id TEXT,
      pupil_count INTEGER NOT NULL DEFAULT 0,

      -- Pending skill picks (accumulated on level-up)
      pending_skill_picks INTEGER NOT NULL DEFAULT 0,

      -- Active view
      current_view TEXT NOT NULL DEFAULT 'dashboard'
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      item_id TEXT NOT NULL,
      equipped INTEGER NOT NULL DEFAULT 0,
      obtained_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      skill_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      UNIQUE(player_id, skill_id)
    );

    CREATE TABLE IF NOT EXISTS combat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      opponent_type TEXT NOT NULL, -- 'pve', 'pvp', 'raid'
      opponent_name TEXT NOT NULL,
      won INTEGER NOT NULL,
      damage_dealt INTEGER NOT NULL DEFAULT 0,
      damage_taken INTEGER NOT NULL DEFAULT 0,
      gold_earned INTEGER NOT NULL DEFAULT 0,
      xp_earned INTEGER NOT NULL DEFAULT 0,
      loot_item TEXT,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS skill_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      skill1 TEXT NOT NULL,
      skill2 TEXT NOT NULL,
      skill3 TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(player_id)
    );

    CREATE INDEX IF NOT EXISTS idx_equipment_player ON equipment(player_id);
    CREATE INDEX IF NOT EXISTS idx_skills_player ON skills(player_id);
    CREATE INDEX IF NOT EXISTS idx_combat_log_player ON combat_log(player_id);
    CREATE INDEX IF NOT EXISTS idx_players_networth ON players(networth DESC);
  `);
}

// Prepared statement cache
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
