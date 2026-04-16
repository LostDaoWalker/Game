// Smoke test — cultivation bot, current systems only
import { getDb } from './src/core/database.js';
import * as P from './src/core/player.js';
import { EQUIPMENT, SKILLS, ENEMIES, ANCESTORS, BLOODLINES, PHYSIQUES, TALENTS, CLASSES, COMBAT_FLAVORS, ZONES, getRealm } from './src/core/config.js';
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
ok('bloodline assigned', !!BLOODLINES[player.bloodline]);
ok('physique assigned', !!PHYSIQUES[player.physique]);
ok('talent assigned', !!TALENTS[player.talent]);

// ── Ancestor ──
ok('set ancestor', P.setAncestor('test', 'white_tiger').success);
ok('bad ancestor rejected', !P.setAncestor('test', 'nonexistent').success);
ok('ancestor persisted', P.getPlayer('test').ancestor === 'white_tiger');
ok('favor reset on switch', P.getPlayer('test').ancestor_favor === 0);

// ── Combat ──
const fight = P.fightEnemy('test', 'troublemaker');
ok('fight success', fight.success);
ok('fight has foe', fight.foe?.name === 'Bandit');
ok('fight gold >= 0', fight.gold >= 0);
ok('unknown enemy rejected', !P.fightEnemy('test', 'nonexistent').success);

// ── Bulk fight ──
P.regenStamina('test');
const bulk = P.bulkFight('test', 'troublemaker', 3);
ok('bulk fight ran', bulk.wins + bulk.losses > 0 || !!bulk.stoppedReason);

// ── Grind ──
P.regenStamina('test');
const grind = P.grind('test');
ok('grind has player', !!grind.player);
ok('grind has networth delta', typeof grind.beforeNetworth === 'number');

// ── Equipment ──
ok('equipment is array', Array.isArray(P.getAllEquipment('test')));
ok('sell junk returns', P.sellAllJunk('test', 'common').success || !!P.sellAllJunk('test', 'common').error);

// ── Skills ──
ok('skills is array', Array.isArray(P.getPlayerSkills('test')));

// ── Networth ──
P.updateNetworth('test');
ok('networth > 0', P.getPlayer('test').networth > 0);
ok('rank is number', typeof P.getRank('test') === 'number');
ok('best enemy returns id', typeof P.bestEnemy('test') === 'string');

// ── Realms ──
ok('realm Lv1 = Mortal', getRealm(1).name === 'Mortal');
ok('realm Lv5 = Martial Artist', getRealm(5).name === 'Martial Artist');
ok('realm Lv20+ = Golden Core', getRealm(20).name === 'Golden Core');

// ── Classes ──
ok('default class sword', P.getPlayer('test').class === 'sword');
ok('set class body', P.setClass('test', 'body').success);
ok('bad class rejected', !P.setClass('test', 'unknown').success);
ok('class persisted', P.getPlayer('test').class === 'body');

// ── Flavor ──
ok('flavor picks a line', typeof P.pickFlavor('victory') === 'string');
ok('flavor empty for unknown key', P.pickFlavor('nonexistent') === '');

// ── HP always full between fights ──
const hpCheck = P.getPlayer('test');
ok('hp at max between fights', hpCheck.hp === hpCheck.max_hp);

// ── Render ──
P.regenStamina('test'); P.updateNetworth('test');
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
ok('3 classes', Object.keys(CLASSES).length === 3);
ok('29 equipment items', Object.keys(EQUIPMENT).length === 29);
ok('COMBAT_FLAVORS has victory', Array.isArray(COMBAT_FLAVORS.victory));

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
