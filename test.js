// Smoke test — boots the DB, checks the schema compiles.
// Expand as systems are added.
import { getDb, sql } from './src/core/database.js';
import { rmSync, mkdirSync } from 'fs';

let passed = 0, failed = 0;
const ok = (label, cond) => { if (cond) passed++; else { failed++; console.error(`  FAIL: ${label}`); } };

rmSync('data', { recursive: true, force: true });
mkdirSync('data', { recursive: true });

const db = getDb();
ok('db open', !!db);
ok('players table exists', !!sql("SELECT name FROM sqlite_master WHERE type='table' AND name='players'").get());

sql('INSERT INTO players(id,username) VALUES(?,?)').run('test', 'TestPlayer');
const row = sql('SELECT * FROM players WHERE id=?').get('test');
ok('insert+select round-trip', row?.username === 'TestPlayer');

db.close();
rmSync('data', { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
