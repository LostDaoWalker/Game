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
ok('starts 0 qi',           player.qi === 0);
ok('starts 0 essence',      player.essence === 0);
ok('starts 0 charge',       player.tribulation_charge === 0);

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
sql('UPDATE players SET realm=0, stage=0, step=5, qi=0, essence=0, tribulation_charge=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 50 * 60, 'test');
P.tickCultivation('test');
const p5 = P.getPlayer('test');
ok('advanced to Greater Perfection (step 6)', p5.step === 6);
ok('essence +1 on reaching Greater',          p5.essence === 1);
ok('charge +1 on reaching Greater',           p5.tribulation_charge === 1);

// ── Extreme Perfection cap ──
// Place at step 7 with 0 qi. Let it tick for a long time. Qi should cap at step 7 cost.
sql('UPDATE players SET realm=0, stage=0, step=7, qi=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 10 * 3600, 'test');
P.tickCultivation('test');
const p7 = P.getPlayer('test');
ok('step stays at Extreme Perfection (7)', p7.step === 7);
ok('qi capped at step 7 cost',             p7.qi === P.stepCost(0, 7));

// ── Final-cap detection ──
// Push to last realm, last stage, Extreme Perfection, qi maxed
sql('UPDATE players SET realm=?, stage=?, step=7, qi=? WHERE id=?')
  .run(REALMS.length - 1, REALMS[REALMS.length - 1].stages.length - 1, P.stepCost(REALMS.length - 1, 7), 'test');
const vFinal = P.getCultivationView(P.getPlayer('test'));
ok('isFinalCap at summit', vFinal.isFinalCap);

// ── Essence cultivation-rate bonus (additive +1% per essence point) ──
// Rate = 1 qi/min × (1 + essence × 0.01). At 100 essence: 2 qi/min.
sql('UPDATE players SET realm=0, stage=0, step=0, qi=0, essence=100, tribulation_charge=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 60, 'test');
const tBoost = P.tickCultivation('test');
ok('essence 100 doubles qi gain (1 min → 2 qi)', tBoost.qiGained === 2);

// At essence 50: +50% rate. 2 min → 3 qi (floor of 3.0)
sql('UPDATE players SET step=0, qi=0, essence=50, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 120, 'test');
const tHalf = P.tickCultivation('test');
ok('essence 50 with 2 min → 3 qi', tHalf.qiGained === 3);

// View reports the rate bonus
sql('UPDATE players SET step=0, qi=0, essence=25 WHERE id=?').run('test');
const vRate = P.getCultivationView(P.getPlayer('test'));
ok('view reports +25% rate bonus at essence 25', vRate.rateBonusPct === 25);
ok('view reports effective rate 1.25 qi/min',    Math.abs(vRate.rate - 1.25) < 1e-9);

// ── formatDuration sanity ──
ok('formatDuration 45s',     P.formatDuration(45) === '45s');
ok('formatDuration 125s',    P.formatDuration(125) === '2m 5s');
ok('formatDuration 3661s',   P.formatDuration(3661) === '1h 1m');
ok('formatDuration 90000s',  P.formatDuration(90000) === '1d 1h');

db.close();
rmSync('data', { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
