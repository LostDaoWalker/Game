// Smoke test — every system, every edge case, every view
import { getDb } from './src/core/database.js';
import * as P from './src/core/player.js';
import { EQUIPMENT, SKILLS, ENEMIES, RAIDS, ASSETS, CREW, AVATARS } from './src/core/config.js';
import { renderHome } from './src/rendering/views/home.js';
import { renderFight } from './src/rendering/views/fight.js';
import { renderRaids } from './src/rendering/views/raids.js';
import { renderAssets } from './src/rendering/views/assets.js';
import { renderInventory } from './src/rendering/views/inventory.js';
import { renderSkills } from './src/rendering/views/skills.js';
import { renderProfile } from './src/rendering/views/profile.js';
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
ok('default avatar', player.avatar === 'default');

// ── Avatar ──
ok('set avatar', P.setAvatar('test', 'neon').success);
ok('bad avatar rejected', !P.setAvatar('test', 'nonexistent').success);
ok('avatar persisted', P.getPlayer('test').avatar === 'neon');

// ── Daily ──
ok('daily claim', P.claimDaily('test').success);
ok('daily duplicate blocked', !P.claimDaily('test').success);

// ── Combat ──
const fight = P.fightEnemy('test', 'troublemaker');
ok('fight success', fight.success);
ok('fight has foe', fight.foe?.name === 'Troublemaker');
ok('fight has streak', typeof fight.streak === 'number');
ok('fight gold >= 0', fight.gold >= 0);

// ── Edge: unknown enemy ──
ok('unknown enemy rejected', !P.fightEnemy('test', 'nonexistent').success);

// ── Bulk fight ──
P.regenStamina('test');
const bulk = P.bulkFight('test', 'troublemaker', 3);
ok('bulk fight ran', bulk.wins + bulk.losses > 0 || !!bulk.stoppedReason);

// ── PvP ──
P.getOrCreatePlayer('test2', 'Opponent');
const pvp = P.pvpFight('test');
ok('pvp returns cleanly', pvp.success === true || !!pvp.error);

// ── Grind ──
P.regenStamina('test');
const grind = P.grind('test');
ok('grind has player', !!grind.player);
ok('grind has networth delta', typeof grind.beforeNetworth === 'number');
ok('grind has milestones array', Array.isArray(grind.milestones));
ok('grind has streak', typeof grind.streak === 'number');

// ── Streaks ──
const streakPlayer = P.getPlayer('test');
ok('win_streak tracked', streakPlayer.win_streak >= 0);
ok('best_streak tracked', streakPlayer.best_streak >= 0);
ok('total_gold_earned tracked', streakPlayer.total_gold_earned >= 0);

// ── Milestones ──
const milestones = P.checkMilestones('test');
ok('milestones returns array', Array.isArray(milestones));

// ── Equipment ──
ok('equipment is array', Array.isArray(P.getAllEquipment('test')));

// ── Sell junk ──
ok('sell junk returns cleanly', P.sellAllJunk('test', 'common').success === true || !!P.sellAllJunk('test', 'common').error);

// ── Sell outgrown ──
ok('sell outgrown returns cleanly', P.sellBelowEquipped('test').success === true || !!P.sellBelowEquipped('test').error);

// ── Skills ──
ok('skills is array', Array.isArray(P.getPlayerSkills('test')));

// ── Bank ──
const dep = P.depositGold('test', 100);
ok('deposit', dep.success);
ok('deposit fee applied', dep.deposited < 100);
const wd = P.withdrawGold('test', dep.deposited);
ok('withdraw', wd.success);
ok('withdraw 0 rejected', !P.withdrawGold('test', 0).success);

// ── Assets ──
for (let i = 0; i < 20; i++) P.fightEnemy('test', 'troublemaker'); // earn gold
P.regenStamina('test');
const buy = P.buyAsset('test', 'lemonade_stand');
ok('buy asset', buy.success || buy.error === 'Need 200g');
ok('duplicate asset blocked', !P.buyAsset('test', 'lemonade_stand').success);
ok('unknown asset rejected', !P.buyAsset('test', 'nonexistent').success);
ok('collect income returns cleanly', P.collectAssetIncome('test').success === true || !!P.collectAssetIncome('test').error);

// ── Crew ──
const hire = P.hireCrew('test', 'scout');
ok('hire crew', hire.success || hire.error === 'Need 300g');
ok('duplicate crew blocked', !P.hireCrew('test', 'scout').success || hire.error);
ok('unknown crew rejected', !P.hireCrew('test', 'nonexistent').success);

// ── Gear sets ──
const gearSet = P.getActiveGearSet('test');
ok('gear set check returns', gearSet === null || typeof gearSet.id === 'string');

// ── Edge: heal at full HP ──
const hp = P.getPlayer('test');
if (hp.hp >= hp.max_hp) ok('heal at full HP rejected', !P.healPlayer('test').success);

// ── Networth ──
P.updateNetworth('test');
ok('networth > 0', P.getPlayer('test').networth > 0);

// ── Rank ──
ok('rank is number', typeof P.getRank('test') === 'number');

// ── Best enemy ──
ok('best enemy returns id', typeof P.bestEnemy('test') === 'string');

// ── Highest asset icon ──
const icon = P.highestAssetIcon('test');
ok('icon is string or null', icon === null || typeof icon === 'string');

// ── Render every view ──
P.regenStamina('test'); P.updateNetworth('test');
const pl = P.getPlayer('test');
const ec = P.getEquippedItems('test').map(r => EQUIPMENT[r.item_id]).filter(Boolean);
const sc = P.getPlayerSkills('test').map(r => { const c = SKILLS[r.skill_id]; return c ? { ...c, level: r.level, id: r.skill_id } : null; }).filter(Boolean);

const views = {
  home: () => renderHome(pl, ec, sc, P.getRecentLog('test'), P.getLeaderboard(), P.highestAssetIcon('test')),
  fight: () => renderFight(pl, null),
  fight_result: () => { const r = P.fightEnemy('test', 'troublemaker'); return r.success ? renderFight(P.getPlayer('test'), r) : null; },
  raids: () => renderRaids(pl, null),
  assets: () => renderAssets(pl, P.getPlayerAssets('test')),
  inventory: () => renderInventory(pl, P.getAllEquipment('test'), P.getEquippedItems('test')),
  skills: () => renderSkills(pl, sc, P.getSkillOffers('test')),
  profile: () => renderProfile(pl, P.getAllEquipment('test'), sc, P.getRank('test')),
  card: () => renderCard(pl),
  grind: () => { P.regenStamina('test'); const r = P.grind('test'); return renderGrind(r.player, r); },
};

for (const [name, render] of Object.entries(views)) {
  try { const buf = render(); ok(`render ${name}`, !buf || buf.length > 0); }
  catch (e) { ok(`render ${name} (threw: ${e.message})`, false); }
}

// ── Invariants ──
const final = P.getPlayer('test');
ok('gold >= 0', final.gold >= 0);
ok('hp >= 0', final.hp >= 0);
ok('stamina >= 0', final.stamina >= 0);
ok('level >= 1', final.level >= 1);
ok('win_streak >= 0', final.win_streak >= 0);
ok('banked_gold >= 0', final.banked_gold >= 0);

getDb().close();
rmSync('data', { recursive: true, force: true });

const elapsed = ((performance.now() - t0) | 0);
console.log(`\n${passed} passed, ${failed} failed (${elapsed}ms)`);
if (failed) process.exit(1);
