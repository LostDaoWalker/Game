// Smoke test — cultivation spine
import { getDb, sql } from './src/core/database.js';
import * as P from './src/core/player.js';
import { REALMS, STEP_NAMES, BREAKTHROUGH_STEP } from './src/core/config.js';
import { rmSync, mkdirSync } from 'fs';

let passed = 0, failed = 0;
const ok = (label, cond) => { if (cond) passed++; else { failed++; console.error(`  FAIL: ${label}`); } };

rmSync('data', { recursive: true, force: true });
mkdirSync('data', { recursive: true });

const db = getDb();
ok('db open', !!db);

// ── Creation ──
const player = P.getOrCreatePlayer('test', 'TestPlayer');
ok('player created', player?.id === 'test');
ok('starts Mortal',         player.realm === 0);
ok('starts stage 0',        player.stage === 0);
ok('starts Entry (step 0)', player.step === 0);
ok('starts 0 qi',                player.qi === 0);
ok('starts 0 prowess bonus',     player.prowess_bonus_pct === 0);
ok('starts 0 charge',            player.tribulation_charge === 0);

// ── Tick: no time elapsed ──
sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run((Date.now() / 1000) | 0, 'test');
const t0 = P.tickCultivation('test');
ok('no-time tick = 0 qi', t0.qiGained === 0);

// ── Tick: 1 hour of cultivation on Mortal (baseStepCost 5) ──
// Step costs: 5, 7, 10, 15, 22, 45, 90, 180 → total to Peak = 59 qi
sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(((Date.now() / 1000) | 0) - 3600, 'test');
const t1 = P.tickCultivation('test');
ok('1h tick ≈ 60 qi gained', t1.qiGained === 60);
const p1 = P.getPlayer('test');
ok('pushed past Peak', p1.step >= BREAKTHROUGH_STEP);
const v1 = P.getCultivationView(p1);
ok('view says canBreakthrough', v1.canBreakthrough);

// ── Stage breakthrough ──
const br1 = P.breakthrough('test');
ok('stage breakthrough success', br1.success && br1.kind === 'stage');
const p2 = P.getPlayer('test');
ok('advanced to stage 1', p2.stage === 1);
ok('step reset to 0',      p2.step === 0);
ok('qi reset to 0',        p2.qi === 0);

// ── Breakthrough blocked before Peak ──
const br2 = P.breakthrough('test');
ok('breakthrough blocked before Peak', !br2.success);

// ── Second stage to Peak, then realm breakthrough ──
sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(((Date.now() / 1000) | 0) - 3600, 'test');
P.tickCultivation('test');
ok('stage 1 reached Peak', P.getPlayer('test').step >= BREAKTHROUGH_STEP);
const br3 = P.breakthrough('test');
ok('realm breakthrough success',           br3.success && br3.kind === 'realm');
ok('advanced to Martial Artist (realm 1)', P.getPlayer('test').realm === 1);
ok('reset to stage 0',                      P.getPlayer('test').stage === 0);
ok('charge consumed on realm breakthrough', P.getPlayer('test').tribulation_charge === 0);

// ── Perfection rewards ──
// Place player at Lesser Perfection (step 5) with 0 qi, then give enough time to reach Greater.
// Mortal step 5 cost = 5 × 9 = 45 qi → 45 min
sql('UPDATE players SET realm=0, stage=0, step=5, qi=0, prowess_bonus_pct=0, tribulation_charge=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 50 * 60, 'test');
P.tickCultivation('test');
const p5 = P.getPlayer('test');
ok('advanced to Greater Perfection (step 6)',    p5.step === 6);
ok('prowess +5% on reaching Greater',            p5.prowess_bonus_pct === 5);
ok('charge +1 on reaching Greater',              p5.tribulation_charge === 1);

// ── Qi flows past Extreme Perfection (step 7) into Absolute Perfection (step 8) ──
// Place at step 7 with 0 qi. Long tick should push through step 7 (cost 180) into step 8.
sql('UPDATE players SET realm=0, stage=0, step=7, qi=0, prowess_bonus_pct=0, tribulation_charge=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 4 * 3600, 'test'); // 240 xp, enough to clear step 7
P.tickCultivation('test');
const pPastExtreme = P.getPlayer('test');
ok('qi advances past Extreme Perfection into Absolute', pPastExtreme.step === 8);
ok('Absolute grants +5% prowess',                       pPastExtreme.prowess_bonus_pct === 5);
ok('Absolute grants +1 charge',                         pPastExtreme.tribulation_charge === 1);

// ── Qi caps at Absolute Perfection (step 8), not earlier ──
sql('UPDATE players SET realm=0, stage=0, step=8, qi=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 100 * 3600, 'test');
P.tickCultivation('test');
const pAbsCap = P.getPlayer('test');
ok('step stays at Absolute Perfection (8)', pAbsCap.step === 8);
ok('qi caps at Absolute Perfection cost',   pAbsCap.qi === P.stepCost(0, 8));

// ── Final-cap detection ──
// Push to last realm, last stage, Absolute Perfection, qi maxed
sql('UPDATE players SET realm=?, stage=?, step=8, qi=? WHERE id=?')
  .run(REALMS.length - 1, REALMS[REALMS.length - 1].stages.length - 1, P.stepCost(REALMS.length - 1, 8), 'test');
const vFinal = P.getCultivationView(P.getPlayer('test'));
ok('isFinalCap at summit', vFinal.isFinalCap);

// ── Prowess bonus is independent of cultivation rate ──
// Rate stays at base regardless of prowess_bonus_pct.
sql('UPDATE players SET realm=0, stage=0, step=0, qi=0, prowess_bonus_pct=100, tribulation_charge=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 60, 'test');
const tRate = P.tickCultivation('test');
ok('prowess bonus does NOT affect cultivation rate (1 min → 1 qi)', tRate.qiGained === 1);

// Full perfection of a stage = +20% prowess (4 perfection steps × 5%: Lesser, Greater, Extreme, Absolute)
sql('UPDATE players SET realm=0, stage=0, step=4, qi=0, prowess_bonus_pct=0, tribulation_charge=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 20 * 3600, 'test'); // generous walltime to clear all perfections
P.tickCultivation('test');
const pFull = P.getPlayer('test');
ok('full perfection of a stage = +20% prowess', pFull.prowess_bonus_pct === 20);
ok('full perfection of a stage = +4 charge',    pFull.tribulation_charge === 4);

// View exposes prowessBonusPct
const vProwess = P.getCultivationView(pFull);
ok('view exposes prowessBonusPct', vProwess.prowessBonusPct === 20);

// ── Cultivate button (spammable, no cooldown, random 1-3 xp) ──
sql(`UPDATE players SET
      realm=0, stage=0, step=0, qi=0, prowess_bonus_pct=0, tribulation_charge=0,
      cultivation_tick_at=?
     WHERE id=?`).run(((Date.now() / 1000) | 0), 'test');

// Grant is random in [1, 3]
for (let i = 0; i < 20; i++) {
  const r = P.cultivate('test');
  ok('cultivate grant in [1, 3]', r.success && r.qiGained >= 1 && r.qiGained <= 3);
}

// Spam keeps progressing
for (let i = 0; i < 200; i++) P.cultivate('test');
const pmSpam = P.getPlayer('test');
ok('heavy spam keeps progressing', pmSpam.step >= 4 || pmSpam.stage > 0);

// Grant does NOT scale with realm
sql('UPDATE players SET realm=1, stage=0, step=0, qi=0 WHERE id=?').run('test');
const mMA = P.cultivate('test');
ok('MA cultivate grant still in [1, 3]', mMA.qiGained >= 1 && mMA.qiGained <= 3);

// Cultivate blocked at Absolute Perfection cap
sql(`UPDATE players SET realm=0, stage=0, step=8, qi=? WHERE id=?`).run(P.stepCost(0, 8), 'test');
const mCap = P.cultivate('test');
ok('cultivate blocked at stage Absolute Perfection cap', !mCap.success);

// View exposes canCultivate correctly
const vCap = P.getCultivationView(P.getPlayer('test'));
ok('view: canCultivate=false at cap', !vCap.canCultivate);

// ── formatDuration sanity ──
ok('formatDuration 45s',     P.formatDuration(45) === '45s');
ok('formatDuration 125s',    P.formatDuration(125) === '2m 5s');
ok('formatDuration 3661s',   P.formatDuration(3661) === '1h 1m');
ok('formatDuration 90000s',  P.formatDuration(90000) === '1d 1h');

db.close();
rmSync('data', { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
