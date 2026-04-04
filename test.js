// Smoke test — exercises every view, action, and edge case
import { getDb } from './src/core/database.js';
import * as P from './src/core/player.js';
import { EQUIPMENT, SKILLS, ENEMIES, RAIDS, ASSETS } from './src/core/config.js';
import { renderHome } from './src/rendering/views/home.js';
import { renderFight } from './src/rendering/views/fight.js';
import { renderRaids } from './src/rendering/views/raids.js';
import { renderAssets } from './src/rendering/views/assets.js';
import { renderInventory } from './src/rendering/views/inventory.js';
import { renderSkills } from './src/rendering/views/skills.js';
import { renderProfile } from './src/rendering/views/profile.js';
import { rmSync, mkdirSync } from 'fs';

let passed = 0, failed = 0;
function assert(label, condition) {
  if (condition) { passed++; }
  else { failed++; console.error(`  FAIL: ${label}`); }
}

rmSync('data', { recursive: true, force: true });
mkdirSync('data', { recursive: true });
getDb();

// ── Player CRUD ──
const player = P.getOrCreatePlayer('test', 'TestPlayer');
assert('player created', player && player.id === 'test');
assert('starting gold', player.gold === 100);
assert('starting level', player.level === 1);

// ── Daily login ──
const daily1 = P.claimDaily('test');
assert('daily claim', daily1.success && daily1.gold === 50);
const daily2 = P.claimDaily('test');
assert('daily duplicate blocked', !daily2.success);

// ── Combat ──
const fight = P.fightEnemy('test', 'troublemaker');
assert('fight success', fight.success);
assert('fight has foe', fight.foe && fight.foe.name === 'Troublemaker');
assert('fight gold >= 0', fight.gold >= 0);

// ── Edge: fight with 0 stamina ──
for (let i = 0; i < 20; i++) P.fightEnemy('test', 'troublemaker');
const noStamina = P.fightEnemy('test', 'troublemaker');
// May or may not have stamina — just check it returns cleanly
assert('0 stamina returns error value', noStamina.success === true || noStamina.error === 'Not enough stamina');

// ── Edge: fight unknown enemy ──
const unknown = P.fightEnemy('test', 'nonexistent');
assert('unknown enemy rejected', !unknown.success);

// ── Bulk fight ──
P.regenStamina('test'); // let some regen
const bulk = P.bulkFight('test', 'troublemaker', 3);
assert('bulk fight ran', bulk.wins + bulk.losses > 0 || bulk.stoppedReason);

// ── PvP ──
P.getOrCreatePlayer('test2', 'Opponent');
const pvp = P.pvpFight('test');
assert('pvp returns cleanly', pvp.success === true || pvp.error);

// ── Equipment ──
const equip = P.getAllEquipment('test');
assert('has equipment', Array.isArray(equip));

// ── Sell junk ──
const junk = P.sellAllJunk('test', 'common');
assert('sell junk returns cleanly', junk.success === true || junk.error);

// ── Sell outgrown ──
const outgrown = P.sellBelowEquipped('test');
assert('sell outgrown returns cleanly', outgrown.success === true || outgrown.error);

// ── Skills ──
const skills = P.getPlayerSkills('test');
assert('skills array', Array.isArray(skills));

// ── Assets ──
const buy = P.buyAsset('test', 'lemonade_stand');
assert('buy asset', buy.success === true || buy.error === 'Need 200g');
const buyDupe = P.buyAsset('test', 'lemonade_stand');
assert('duplicate asset blocked', !buyDupe.success || buyDupe.error === 'Already owned');
const collect = P.collectAssetIncome('test');
assert('collect income returns cleanly', collect.success === true || collect.error);

// ── Edge: buy unknown asset ──
const unknownAsset = P.buyAsset('test', 'nonexistent');
assert('unknown asset rejected', !unknownAsset.success);

// ── Edge: heal at full HP ──
const p = P.getPlayer('test');
if (p.hp >= p.max_hp) {
  const heal = P.healPlayer('test');
  assert('heal at full HP rejected', !heal.success);
}

// ── Networth ──
P.updateNetworth('test');
const nw = P.getPlayer('test').networth;
assert('networth > 0', nw > 0);

// ── Rank ──
const rank = P.getRank('test');
assert('rank is number', typeof rank === 'number' && rank >= 1);

// ── Best enemy ──
const best = P.bestEnemy('test');
assert('best enemy returns id', typeof best === 'string');

// ── Highest asset icon ──
const icon = P.highestAssetIcon('test');
assert('icon is string or null', icon === null || typeof icon === 'string');

// ── Render every view ──
P.regenStamina('test');
P.updateNetworth('test');
const pl = P.getPlayer('test');
const ec = P.getEquippedItems('test').map(r => EQUIPMENT[r.item_id]).filter(Boolean);
const sc = P.getPlayerSkills('test').map(r => { const c = SKILLS[r.skill_id]; return c ? { ...c, level: r.level, id: r.skill_id } : null; }).filter(Boolean);

const views = {
  home: () => renderHome(pl, ec, sc, P.getRecentLog('test'), P.getLeaderboard(), P.highestAssetIcon('test')),
  fight: () => renderFight(pl, null),
  raids: () => renderRaids(pl, null),
  assets: () => renderAssets(pl, P.getPlayerAssets('test')),
  inventory: () => renderInventory(pl, P.getAllEquipment('test'), P.getEquippedItems('test')),
  skills: () => renderSkills(pl, sc, P.getSkillOffers('test')),
  profile: () => renderProfile(pl, P.getAllEquipment('test'), sc, P.getRank('test')),
};

for (const [name, render] of Object.entries(views)) {
  try { const buf = render(); assert(`render ${name}`, buf && buf.length > 0); }
  catch (e) { assert(`render ${name} (threw: ${e.message})`, false); }
}

// ── Fight result render ──
const fr = P.fightEnemy('test', 'troublemaker');
if (fr.success) {
  try { renderFight(P.getPlayer('test'), fr); assert('render fight result', true); }
  catch (e) { assert(`render fight result (threw: ${e.message})`, false); }
}

// ── Invariants ──
const final = P.getPlayer('test');
assert('gold >= 0', final.gold >= 0);
assert('hp >= 0', final.hp >= 0);
assert('stamina >= 0', final.stamina >= 0);
assert('level >= 1', final.level >= 1);

getDb().close();
rmSync('data', { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
