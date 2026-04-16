import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';

let db;
const stmtCache = new Map();

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
      last_active INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  return db;
}

export function sql(q) {
  let s = stmtCache.get(q);
  if (!s) { s = getDb().prepare(q); stmtCache.set(q, s); }
  return s;
}

export function tx(fn) { return getDb().transaction(fn)(); }
