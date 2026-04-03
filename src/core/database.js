import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

let db;
const stmtCache = new Map();
const updCache = new Map();

export function getDb() {
  if (db) return db;
  mkdirSync('data', { recursive: true });
  db = new Database('data/halcyon.db');
  db.pragma('journal_mode=WAL'); db.pragma('synchronous=NORMAL'); db.pragma('cache_size=-64000'); db.pragma('foreign_keys=ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY, username TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()), last_active INTEGER DEFAULT (unixepoch()),
      gold INTEGER NOT NULL DEFAULT 100 CHECK(gold >= 0),
      level INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1 AND level <= 30),
      xp INTEGER NOT NULL DEFAULT 0 CHECK(xp >= 0),
      xp_needed INTEGER NOT NULL DEFAULT 80,
      hp INTEGER NOT NULL DEFAULT 100 CHECK(hp >= 0),
      max_hp INTEGER NOT NULL DEFAULT 100 CHECK(max_hp > 0),
      attack INTEGER NOT NULL DEFAULT 8, defense INTEGER NOT NULL DEFAULT 4,
      speed INTEGER NOT NULL DEFAULT 5, strength INTEGER NOT NULL DEFAULT 5,
      stamina INTEGER NOT NULL DEFAULT 10 CHECK(stamina >= 0),
      max_stamina INTEGER NOT NULL DEFAULT 10,
      stamina_regen_at INTEGER NOT NULL DEFAULT (unixepoch()),
      wins INTEGER NOT NULL DEFAULT 0, losses INTEGER NOT NULL DEFAULT 0,
      pvp_wins INTEGER NOT NULL DEFAULT 0, pvp_losses INTEGER NOT NULL DEFAULT 0,
      raids_completed INTEGER NOT NULL DEFAULT 0, bosses_killed INTEGER NOT NULL DEFAULT 0,
      networth INTEGER NOT NULL DEFAULT 100 CHECK(networth >= 0),
      peak_networth INTEGER NOT NULL DEFAULT 100,
      pending_skill_picks INTEGER NOT NULL DEFAULT 0 CHECK(pending_skill_picks >= 0)
    );
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      item_id TEXT NOT NULL,
      equipped INTEGER NOT NULL DEFAULT 0 CHECK(equipped IN (0, 1)),
      obtained_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL REFERENCES players(id),
      skill_id TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1 CHECK(level >= 1),
      UNIQUE(player_id, skill_id)
    );
    CREATE TABLE IF NOT EXISTS combat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id TEXT NOT NULL,
      opponent_type TEXT NOT NULL CHECK(opponent_type IN ('pve', 'pvp', 'raid')),
      opponent_name TEXT NOT NULL,
      won INTEGER NOT NULL CHECK(won IN (0, 1)),
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
      skill1 TEXT NOT NULL, skill2 TEXT NOT NULL, skill3 TEXT NOT NULL,
      UNIQUE(player_id)
    );
    CREATE INDEX IF NOT EXISTS idx_eq_pid ON equipment(player_id);
    CREATE INDEX IF NOT EXISTS idx_sk_pid ON skills(player_id);
    CREATE INDEX IF NOT EXISTS idx_cl_pid ON combat_log(player_id);
    CREATE INDEX IF NOT EXISTS idx_nw ON players(networth DESC);
  `);
  return db;
}

export function sql(q) {
  let s = stmtCache.get(q);
  if (!s) { s = getDb().prepare(q); stmtCache.set(q, s); }
  return s;
}

export function tx(fn) { return getDb().transaction(fn)(); }

export function upd(id, f) {
  const keys = Object.keys(f).sort();
  const shape = keys.join(',');
  let stmt = updCache.get(shape);
  if (!stmt) {
    stmt = getDb().prepare(`UPDATE players SET ${keys.map(k => `${k}=@${k}`).join(',')},last_active=unixepoch() WHERE id=@id`);
    updCache.set(shape, stmt);
  }
  stmt.run({ ...f, id });
}
