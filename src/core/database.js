import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

let db;
const cache = new Map();

export function getDb() {
  if (db) return db;
  mkdirSync('data', { recursive: true });
  db = new Database('data/nexus.db');
  db.pragma('journal_mode=WAL'); db.pragma('synchronous=NORMAL'); db.pragma('cache_size=-64000'); db.pragma('foreign_keys=ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY, username TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()), last_active INTEGER DEFAULT (unixepoch()),
      gold INTEGER DEFAULT 100, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, xp_needed INTEGER DEFAULT 80,
      hp INTEGER DEFAULT 100, max_hp INTEGER DEFAULT 100,
      attack INTEGER DEFAULT 8, defense INTEGER DEFAULT 4, speed INTEGER DEFAULT 5, strength INTEGER DEFAULT 5,
      stamina INTEGER DEFAULT 10, max_stamina INTEGER DEFAULT 10, stamina_regen_at INTEGER DEFAULT (unixepoch()),
      wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0,
      pvp_wins INTEGER DEFAULT 0, pvp_losses INTEGER DEFAULT 0,
      raids_completed INTEGER DEFAULT 0, bosses_killed INTEGER DEFAULT 0,
      networth INTEGER DEFAULT 100, peak_networth INTEGER DEFAULT 100,
      mentor_id TEXT, pupil_count INTEGER DEFAULT 0, pending_skill_picks INTEGER DEFAULT 0,
      current_view TEXT DEFAULT 'dashboard'
    );
    CREATE TABLE IF NOT EXISTS equipment (
      id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT NOT NULL REFERENCES players(id),
      item_id TEXT NOT NULL, equipped INTEGER DEFAULT 0, obtained_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT NOT NULL REFERENCES players(id),
      skill_id TEXT NOT NULL, level INTEGER DEFAULT 1, UNIQUE(player_id, skill_id)
    );
    CREATE TABLE IF NOT EXISTS combat_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT NOT NULL,
      opponent_type TEXT NOT NULL, opponent_name TEXT NOT NULL, won INTEGER NOT NULL,
      damage_dealt INTEGER DEFAULT 0, damage_taken INTEGER DEFAULT 0,
      gold_earned INTEGER DEFAULT 0, xp_earned INTEGER DEFAULT 0, loot_item TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS skill_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT, player_id TEXT NOT NULL REFERENCES players(id),
      skill1 TEXT NOT NULL, skill2 TEXT NOT NULL, skill3 TEXT NOT NULL, UNIQUE(player_id)
    );
    CREATE INDEX IF NOT EXISTS idx_eq_pid ON equipment(player_id);
    CREATE INDEX IF NOT EXISTS idx_sk_pid ON skills(player_id);
    CREATE INDEX IF NOT EXISTS idx_cl_pid ON combat_log(player_id);
    CREATE INDEX IF NOT EXISTS idx_nw ON players(networth DESC);
  `);
  return db;
}

export function sql(q) { let s = cache.get(q); if (!s) { s = getDb().prepare(q); cache.set(q, s); } return s; }
export function tx(fn) { return getDb().transaction(fn)(); }

// ── Per-shape update cache — avoids rebuilding SQL strings on every upd() call ──
const updCache = new Map();
export function upd(id, f) {
  const keys = Object.keys(f).sort();
  const shape = keys.join(',');
  let stmt = updCache.get(shape);
  if (!stmt) {
    const sets = keys.map(k => `${k}=@${k}`).join(',');
    stmt = getDb().prepare(`UPDATE players SET ${sets},last_active=unixepoch() WHERE id=@id`);
    updCache.set(shape, stmt);
  }
  stmt.run({ ...f, id });
}
