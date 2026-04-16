// Smoke test — cultivation bot, current systems only
import { getDb } from './src/core/database.js';
import * as P from './src/core/player.js';
import { EQUIPMENT, SKILLS, ENEMIES, ANCESTORS, ZONES } from './src/core/config.js';
import { renderGrind } from './src/rendering/views/grind.js';
import { renderCard } from './src/rendering/views/card.js';
import { rmSync, mkdirSync } from 'fs';

let passed = 0, failed = 0;
const t0 = performance.now();
function ok(label, cond) { if (cond) passed++; else { failed++; console.error(`  FAIL: ${label}`); } }

rmSync('data', { recursive: true, force: true });
mkdirSync('data', { recursive: true });
getDb();

// ── CRUD ──
const player = P.getOrCreatePlayer('test', 'TestPlayer');
ok('player created', player?.id === 'test');
ok('starting gold', player.gold === 100);
ok('starting level', player.level === 1);
ok('default ancestor', player.ancestor === 'azure_dragon');

// ── Ancestor ──
ok('set ancestor white_tiger', P.setAncestor('test', 'white_tiger').success);
ok('bad ancestor rejected', !P.setAncestor('test', 'unknown').success);
ok('ancestor persisted', P.getPlayer('test').ancestor === 'white_tiger');
ok('favor reset on switch', P.getPlayer('test').ancestor_favor === 0);

// ── Combat ──
const fight = P.fightEnemy('test', 'troublemaker');
ok('fight success', fight.success);
ok('fight gold >= 0', fight.gold >= 0);
ok('unknown enemy rejected', !P.fightEnemy('test', 'unknown').success);

// ── Grind ──
P.regenStamina('test');
const grind = P.grind('test');
ok('grind has player', !!grind.player);
ok('grind wins >= 0', grind.wins >= 0);

// ── Equipment ──
ok('equipment is array', Array.isArray(P.getAllEquipment('test')));
const junk = P.sellAllJunk('test', 'common');
ok('sell junk returns', junk.success || !!junk.error);

// ── Skills ──
ok('skills is array', Array.isArray(P.getPlayerSkills('test')));

// ── Best enemy ──
ok('best enemy returns id', typeof P.bestEnemy('test') === 'string');

// ── HP always full between fights ──
const hpCheck = P.getPlayer('test');
ok('hp at max between fights', hpCheck.hp === hpCheck.max_hp);

// ── Stamina helpers ──
ok('staminaEta returns number', typeof P.staminaEtaSeconds(P.getPlayer('test')) === 'number');
ok('formatDuration 45s', P.formatDuration(45) === '45s');
ok('formatDuration 125s', P.formatDuration(125) === '2m 5s');

// ── Render ──
try {
  const r = P.grind('test');
  ok('renderGrind produces buffer', renderGrind(r.player, r).length > 0);
  ok('renderCard produces buffer', renderCard(P.getPlayer('test')).length > 0);
} catch (e) { ok(`render threw: ${e.message}`, false); }

// ── Invariants ──
const final = P.getPlayer('test');
ok('gold >= 0', final.gold >= 0);
ok('hp >= 0', final.hp >= 0);
ok('stamina >= 0', final.stamina >= 0);
ok('level >= 1', final.level >= 1);

// ── Config integrity ──
for (const [enemyId, enemy] of Object.entries(ENEMIES)) {
  ok(`enemy ${enemyId} zone ${enemy.zone} exists`, !!ZONES[enemy.zone]);
}
ok('8 skills', Object.keys(SKILLS).length === 8);
ok('5 ancestors', Object.keys(ANCESTORS).length === 5);
ok('29 equipment items', Object.keys(EQUIPMENT).length === 29);

// ── Combat balance — 50 fights ──
P.getOrCreatePlayer('balance', 'BalanceTest');
let minGold = Infinity, maxGold = 0;
for (let i = 0; i < 50; i++) {
  P.regenStamina('balance');
  const r = P.fightEnemy('balance', 'troublemaker');
  if (r.success) { minGold = Math.min(minGold, r.gold); maxGold = Math.max(maxGold, r.gold); }
}
ok('combat gold sane', minGold >= 0 && maxGold < 10000);

getDb().close();
rmSync('data', { recursive: true, force: true });

const elapsed = ((performance.now() - t0) | 0);
console.log(`\n${passed} passed, ${failed} failed (${elapsed}ms)`);
if (failed) process.exit(1);
