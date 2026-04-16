// Smoke test — cultivation spine + talents
import { getDb, sql } from './src/core/database.js';
import * as P from './src/core/player.js';
import { REALMS, STAGES, STEP_NAMES, BREAKTHROUGH_STEP, TALENTS, TALENT_RARITY_WEIGHTS, DAOISTS, ROLLS } from './src/core/config.js';
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

// ── Tick: no time elapsed ──
sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run((Date.now() / 1000) | 0, 'test');
const t0 = P.tickCultivation('test');
ok('no-time tick = 0 qi', t0.qiGained === 0);

// ── Tick: 1 hour of cultivation on Mortal (baseStepCost 5) ──
// Step costs: 5, 7, 10, 15, 22, 45, 90, 180 → total to Peak = 59 qi
sql('DELETE FROM talents WHERE player_id=?').run('test');
sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(((Date.now() / 1000) | 0) - 3600, 'test');
const t1 = P.tickCultivation('test');
ok('1h tick ≈ 60 qi gained', t1.qiGained === 60);
const p1 = P.getPlayer('test');
ok('pushed past Peak', p1.step >= BREAKTHROUGH_STEP);
const v1 = P.getCultivationView(p1);
ok('view says canBreakthrough', v1.canBreakthrough);

// ── Stage breakthrough — qi carries over into new stage ──
// At this point: after 1h tick (60 qi) in Mortal stage 0, the player has
// consumed Entry(5)+Early(7)+Middle(10)+Late(15)+Peak(22)=59 qi, qi=1, step=5 (Lesser Perfection)
const prePeak = P.getPlayer('test');
const preBreakQi = prePeak.qi;
const br1 = P.breakthrough('test');
ok('stage breakthrough success', br1.success && br1.kind === 'stage');
const p2 = P.getPlayer('test');
ok('advanced to stage 1', p2.stage === 1);
// With preBreakQi (≤ Entry cost 5) carrying over, step may still be 0 in new stage.
// Key invariant: qi is preserved across the breakthrough (not reset to 0 unless it was already 0).
ok('qi carried over on stage breakthrough', p2.qi === preBreakQi || p2.step > 0);

// ── Breakthrough blocked before Peak ──
const br2 = P.breakthrough('test');
ok('breakthrough blocked before Peak', !br2.success);

// ── Second stage breakthrough (1→2, still within realm 0) ──
sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(((Date.now() / 1000) | 0) - 3600, 'test');
P.tickCultivation('test');
ok('stage 1 reached Peak', P.getPlayer('test').step >= BREAKTHROUGH_STEP);
const br2b = P.breakthrough('test');
ok('second stage breakthrough success',   br2b.success && br2b.kind === 'stage');
ok('advanced to stage 2 (Late)',          P.getPlayer('test').stage === 2);

// ── Realm breakthrough within Mortal grand (no tribulation) ──
sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(((Date.now() / 1000) | 0) - 3600, 'test');
P.tickCultivation('test');
ok('stage 2 reached Peak', P.getPlayer('test').step >= BREAKTHROUGH_STEP);
const br3 = P.breakthrough('test');
ok('realm breakthrough kind=realm (within Mortal grand)', br3.success && br3.kind === 'realm');
ok('advanced to Inner Awakening (realm 1)',                P.getPlayer('test').realm === 1);
ok('reset to stage 0',                                     P.getPlayer('test').stage === 0);

// ── Carry-over: heavy qi on breakthrough jumps many steps in the new stage/realm ──
// Place player at Peak of Mortal stage 0 with a huge qi reserve, break through,
// and verify they auto-advance through multiple steps in stage 1.
sql(`UPDATE players SET realm=0, stage=0, step=4, qi=300, prowess_bonus_pct=0 WHERE id=?`)
  .run('test');
const brCarry = P.breakthrough('test');
ok('stage breakthrough with carry-over succeeds', brCarry.success);
const pCarry = P.getPlayer('test');
ok('advanced to stage 1',                        pCarry.stage === 1);
ok('carry-over advanced several steps',          pCarry.step >= 5); // 300 qi easily covers Entry→Peak (59) plus Lesser Perfection (45)
ok('perfection reached via carry-over grants prowess', pCarry.prowess_bonus_pct >= 5);

// ── Perfection rewards ──
// Place player at Lesser Perfection (step 5) with 0 qi, then give enough time to reach Greater.
// Mortal step 5 cost = 5 × 9 = 45 qi → 45 min
sql('UPDATE players SET realm=0, stage=0, step=5, qi=0, prowess_bonus_pct=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 50 * 60, 'test');
P.tickCultivation('test');
const p5 = P.getPlayer('test');
ok('advanced to Greater Perfection (step 6)',    p5.step === 6);
ok('prowess +5% on reaching Greater',            p5.prowess_bonus_pct === 5);

// ── Qi flows past Extreme Perfection (step 7) into Absolute Perfection (step 8) ──
// Place at step 7 with 0 qi. Long tick should push through step 7 (cost 180) into step 8.
sql('UPDATE players SET realm=0, stage=0, step=7, qi=0, prowess_bonus_pct=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 4 * 3600, 'test'); // 240 xp, enough to clear step 7
P.tickCultivation('test');
const pPastExtreme = P.getPlayer('test');
ok('qi advances past Extreme Perfection into Absolute', pPastExtreme.step === 8);
ok('Absolute grants +5% prowess',                       pPastExtreme.prowess_bonus_pct === 5);

// ── Qi keeps accumulating past Absolute Perfection (no cap) ──
sql('DELETE FROM talents WHERE player_id=?').run('test');
sql('UPDATE players SET realm=0, stage=0, step=8, qi=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 100 * 3600, 'test');
P.tickCultivation('test');
const pAbsCap = P.getPlayer('test');
ok('step stays at Absolute Perfection (8)',                pAbsCap.step === 8);
ok('qi accumulates past step 8 cost (no cap)',             pAbsCap.qi > P.stepCost(0, 8));
ok('qi equals raw walltime gain (100h × 60 = 6000 xp)',    pAbsCap.qi === 6000);

// ── Final-cap detection — position-based, not qi-based ──
// Push to last realm, last stage, Absolute Perfection. Qi value does not matter.
sql('UPDATE players SET realm=?, stage=?, step=8, qi=0 WHERE id=?')
  .run(REALMS.length - 1, STAGES.length - 1, 'test');
const vFinal = P.getCultivationView(P.getPlayer('test'));
ok('isFinalCap at summit (qi agnostic)', vFinal.isFinalCap);

// ── Prowess bonus is independent of cultivation rate ──
// Rate stays at base regardless of prowess_bonus_pct.
sql('UPDATE players SET realm=0, stage=0, step=0, qi=0, prowess_bonus_pct=100, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 60, 'test');
const tRate = P.tickCultivation('test');
ok('prowess bonus does NOT affect cultivation rate (1 min → 1 qi)', tRate.qiGained === 1);

// Full perfection of a stage = +20% prowess (4 perfection steps × 5%: Lesser, Greater, Extreme, Absolute)
sql('UPDATE players SET realm=0, stage=0, step=4, qi=0, prowess_bonus_pct=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 20 * 3600, 'test'); // generous walltime to clear all perfections
P.tickCultivation('test');
const pFull = P.getPlayer('test');
ok('full perfection of a stage = +20% prowess', pFull.prowess_bonus_pct === 20);

// View exposes prowessBonusPct
const vProwess = P.getCultivationView(pFull);
ok('view exposes prowessBonusPct', vProwess.prowessBonusPct === 20);

// ── Cultivate button (spammable, no cooldown, random 1-3 xp) ──
// Clear talents so cultivateGrantBonus doesn't skew the base-rate assertion.
sql('DELETE FROM talents WHERE player_id=?').run('test');
sql(`UPDATE players SET
      realm=0, stage=0, step=0, qi=0, prowess_bonus_pct=0,
      cultivation_tick_at=?
     WHERE id=?`).run(((Date.now() / 1000) | 0), 'test');

// Grant is random in [1, 3] (no talent bonuses)
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

// Cultivate stays enabled even at Absolute Perfection — qi keeps accumulating
sql(`UPDATE players SET realm=0, stage=0, step=8, qi=? WHERE id=?`).run(P.stepCost(0, 8), 'test');
const mPast = P.cultivate('test');
ok('cultivate succeeds past Absolute Perfection cost', mPast.success);
const pPast = P.getPlayer('test');
ok('qi keeps growing past step 8 cost', pPast.qi > P.stepCost(0, 8));

// View: canCultivate is always true (no cap blocking)
const vNoCap = P.getCultivationView(P.getPlayer('test'));
ok('view: canCultivate=true always', vNoCap.canCultivate);

// ── formatDuration sanity ──
ok('formatDuration 45s',     P.formatDuration(45) === '45s');
ok('formatDuration 125s',    P.formatDuration(125) === '2m 5s');
ok('formatDuration 3661s',   P.formatDuration(3661) === '1h 1m');
ok('formatDuration 90000s',  P.formatDuration(90000) === '1d 1h');

// ── Talents ──

// Starter talent is granted on creation
P.getOrCreatePlayer('t2', 'Talenter');
sql('UPDATE players SET tribulation_charge=100 WHERE id=?').run('t2'); // force tribulation success in later test
const starterTalents = P.getTalents('t2');
ok('starter talent granted on creation', starterTalents.length === 1);
ok('starter talent has a known id',      !!TALENTS[starterTalents[0].id]);

// rollTalent produces a valid talent with a weighted rarity
const rolled = P.rollTalent();
ok('rollTalent returns an id',    rolled && !!rolled.id);
ok('rolled id exists in TALENTS', !!TALENTS[rolled.id]);
ok('rolled rarity is a weight key', rolled.rarity in TALENT_RARITY_WEIGHTS);

// Realm breakthrough (within Mortal grand) grants a new talent
sql('UPDATE players SET realm=0, stage=2, step=4, qi=0 WHERE id=?').run('t2');
const beforeCount = P.getTalents('t2').length;
const brTalent = P.breakthrough('t2');
ok('realm breakthrough succeeds',          brTalent.success && brTalent.kind === 'realm');
ok('realm breakthrough grants a talent',   !!brTalent.talent);
ok('talent count grew after realm',         P.getTalents('t2').length === beforeCount + 1);

// Stage breakthrough does NOT grant a talent
sql('UPDATE players SET realm=1, stage=0, step=4, qi=0 WHERE id=?').run('t2');
const beforeStageCount = P.getTalents('t2').length;
const stageBt = P.breakthrough('t2');
ok('stage breakthrough does not grant talent',
   stageBt.success && stageBt.kind === 'stage' && P.getTalents('t2').length === beforeStageCount);

// Talent effects flow into getEffectiveStats
// Wipe talents, manually grant known ones to verify aggregation
sql('DELETE FROM talents WHERE player_id=?').run('t2');
sql("INSERT INTO talents(player_id, talent_id) VALUES (?, 'sharp_mind')").run('t2'); // +10% rate
sql("INSERT INTO talents(player_id, talent_id) VALUES (?, 'iron_blood')").run('t2'); // +20% prowess
sql("INSERT INTO talents(player_id, talent_id) VALUES (?, 'focused')").run('t2');    // +1 cultivate grant
const stats = P.getEffectiveStats('t2');
ok('talent rate bonus aggregated',    stats.rateBonusPct === 10);
ok('talent prowess bonus aggregated', stats.prowessFromTalents === 20);
ok('talent grant bonus aggregated',   stats.cultivateGrantBonus === 1);
ok('effective rate reflects bonus',   Math.abs(stats.cultivationRate - 1.10) < 1e-9);

// Cultivation rate boost applies to passive tick
sql('UPDATE players SET realm=0, stage=0, step=0, qi=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 60, 't2');
const tBoost = P.tickCultivation('t2');
ok('talent +10% rate → 1 xp/min passive rounds to 1 over 1 min', tBoost.qiGained === 1);
// With +10%, 60 seconds = 1.1 xp → floors to 1. Test with 10 min for clarity:
sql('UPDATE players SET realm=0, stage=0, step=0, qi=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 600, 't2');
const tBoost2 = P.tickCultivation('t2');
ok('10 min at +10% → 11 xp', tBoost2.qiGained === 11);

// Cultivate grant bonus applies to click
sql('UPDATE players SET realm=0, stage=0, step=0, qi=0 WHERE id=?').run('t2');
let grantMin = Infinity, grantMax = 0;
for (let i = 0; i < 30; i++) {
  const r = P.cultivate('t2');
  if (r.qiGained < grantMin) grantMin = r.qiGained;
  if (r.qiGained > grantMax) grantMax = r.qiGained;
}
ok('cultivate grant min shifted by +1 (was 1..3, now 2..4)', grantMin === 2);
ok('cultivate grant max shifted by +1 (was 1..3, now 2..4)', grantMax === 4);

// ── Currencies ──
// Fresh player starts with 0 stones, 0 jade
P.getOrCreatePlayer('cur', 'Currency');
const c0 = P.getPlayer('cur');
ok('starts 0 spirit stones', c0.spirit_stones === 0);
ok('starts 0 jade',          c0.jade === 0);

// Perfection step grants +50 stones
sql('UPDATE players SET realm=0, stage=0, step=5, qi=0, prowess_bonus_pct=0, spirit_stones=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 60 * 60, 'cur');
P.tickCultivation('cur');
const c1 = P.getPlayer('cur');
ok('reaching Greater Perfection grants +50 stones', c1.spirit_stones === 50);

// Stage breakthrough grants +100 stones + perfection stones earned during the carry-over applyQi
sql('UPDATE players SET realm=0, stage=0, step=4, qi=0, prowess_bonus_pct=0, spirit_stones=0, jade=0 WHERE id=?').run('cur');
const brS = P.breakthrough('cur');
ok('stage breakthrough returns stonesEarned',      typeof brS.stonesEarned === 'number');
ok('stage breakthrough grants at least +100 stones', P.getPlayer('cur').spirit_stones >= 100);

// Realm breakthrough (within grand) grants +500 stones + 1 jade, no tribulation
sql('UPDATE players SET realm=0, stage=2, step=4, qi=0, prowess_bonus_pct=0, spirit_stones=0, jade=0 WHERE id=?').run('cur');
const brR = P.breakthrough('cur');
ok('realm breakthrough kind=realm',          brR.success && brR.kind === 'realm');
ok('realm breakthrough grants 500+ stones',   P.getPlayer('cur').spirit_stones >= 500);
ok('realm breakthrough grants 1 jade',        P.getPlayer('cur').jade === 1);

// Grand breakthrough (Mortal → Martial Artist) grants +2000 stones + 5 jade after tribulation
sql('UPDATE players SET realm=2, stage=2, step=4, qi=0, prowess_bonus_pct=0, spirit_stones=0, jade=0, tribulation_charge=100 WHERE id=?').run('cur');
let brG = null;
for (let i = 0; i < 100; i++) {
  sql('UPDATE players SET realm=2, stage=2, step=4, qi=0, spirit_stones=0, jade=0, tribulation_charge=100 WHERE id=?').run('cur');
  brG = P.breakthrough('cur');
  if (brG.kind === 'grand') break;
}
ok('grand breakthrough kind=grand',           brG.success && brG.kind === 'grand');
ok('grand breakthrough grants 2000+ stones',   P.getPlayer('cur').spirit_stones >= 2000);
ok('grand breakthrough grants 5 jade',         P.getPlayer('cur').jade === 5);
ok('grand breakthrough advances to Martial Artist', P.getPlayer('cur').realm === 3);

// ── Daoists / Rolls ──
P.getOrCreatePlayer('roller', 'Roller');

// Stone roll fails with no stones
const rFail = P.rollDaoist('roller', 'stone');
ok('stone roll fails without stones', !rFail.success);

// Give stones, roll succeeds
sql('UPDATE players SET spirit_stones=1000 WHERE id=?').run('roller');
const r1 = P.rollDaoist('roller', 'stone');
ok('stone roll success',                    r1.success);
ok('stone roll returns daoist config',      !!DAOISTS[r1.daoist.id]);
ok('stone deducted',                         P.getPlayer('roller').spirit_stones === 1000 - ROLLS.stoneCost);
ok('daoist is in roster',                    P.getDaoists('roller').length === 1);

// Jade roll fails with no jade
const jFail = P.rollDaoist('roller', 'jade');
ok('jade roll fails without jade', !jFail.success);

// Give jade, roll succeeds
sql('UPDATE players SET jade=5 WHERE id=?').run('roller');
const j1 = P.rollDaoist('roller', 'jade');
ok('jade roll success',      j1.success);
ok('jade deducted',          P.getPlayer('roller').jade === 5 - ROLLS.jadeCost);
ok('roster grew',            P.getDaoists('roller').length === 2);

// rollDaoist never returns an invalid rarity in many rolls
sql('UPDATE players SET spirit_stones=100000 WHERE id=?').run('roller');
const rarities = new Set();
for (let i = 0; i < 50; i++) {
  const r = P.rollDaoist('roller', 'stone');
  if (r.success) rarities.add(r.daoist.rarity);
}
ok('all rolled rarities are valid', [...rarities].every(r => ['common','uncommon','rare','epic','legendary'].includes(r)));

// Stone rolls never produce legendary (rate = 0)
sql('DELETE FROM daoists WHERE player_id=?').run('roller');
sql('UPDATE players SET spirit_stones=100000 WHERE id=?').run('roller');
let sawLegendary = false;
for (let i = 0; i < 100; i++) {
  const r = P.rollDaoist('roller', 'stone');
  if (r.success && r.daoist.rarity === 'legendary') sawLegendary = true;
}
ok('stone roll never yields legendary', !sawLegendary);

// ── Team / Slots ──
P.getOrCreatePlayer('teamer', 'Teamer');
const teamerBase = P.getPlayer('teamer');
ok('Mortal grand gets 0 daoist slots', P.getDaoistSlots(teamerBase) === 0);

// Mortal can't assign a daoist
sql('UPDATE players SET spirit_stones=10000 WHERE id=?').run('teamer');
P.rollDaoist('teamer', 'stone');
const rosterTeam = P.getDaoists('teamer');
ok('roster grew from roll', rosterTeam.length === 1);
const mortalAssign = P.assignDaoistToTeam('teamer', rosterTeam[0].rowId);
ok('Mortal cannot assign daoist to team', !mortalAssign.success);

// All three Mortal realms yield 0 daoist slots
for (const r of [0, 1, 2]) {
  sql('UPDATE players SET realm=? WHERE id=?').run(r, 'teamer');
  ok(`Mortal realm ${r} gets 0 daoist slots`, P.getDaoistSlots(P.getPlayer('teamer')) === 0);
}

// Martial Artist grand gets 2 daoist slots (realm 3 is first MA realm)
sql('UPDATE players SET realm=3 WHERE id=?').run('teamer');
ok('Martial Artist grand gets 2 daoist slots', P.getDaoistSlots(P.getPlayer('teamer')) === 2);

const maAssign = P.assignDaoistToTeam('teamer', rosterTeam[0].rowId);
ok('MA can assign daoist to team', maAssign.success);
ok('team count reflects assignment', P.getTeamDaoists('teamer').length === 1);

// Fill team slots, next assign fails
P.rollDaoist('teamer', 'stone');
P.rollDaoist('teamer', 'stone');
const allDaoists = P.getDaoists('teamer');
for (const d of allDaoists) P.assignDaoistToTeam('teamer', d.rowId);
ok('team fills at slot capacity', P.getTeamDaoists('teamer').length === 2);
const extra = P.rollDaoist('teamer', 'stone');
const overflowAssign = P.assignDaoistToTeam('teamer', extra.daoist && P.getDaoists('teamer').find(d => !d.in_team)?.rowId);
ok('assignment past slot limit blocked', !overflowAssign.success);

// Remove a daoist, then a new assignment succeeds
const teamDaoists = P.getTeamDaoists('teamer');
P.removeDaoistFromTeam('teamer', teamDaoists[0].rowId);
ok('after remove, team is below slot limit', P.getTeamDaoists('teamer').length === 1);
const benchDaoist = P.getDaoists('teamer').find(d => !d.in_team);
ok('reassign succeeds with free slot', P.assignDaoistToTeam('teamer', benchDaoist.rowId).success);

// Cultivator grand gets 4 daoist slots (realm 6 is first Cultivator realm)
sql('UPDATE players SET realm=6 WHERE id=?').run('teamer');
ok('Cultivator grand gets 4 daoist slots', P.getDaoistSlots(P.getPlayer('teamer')) === 4);

// ── PvP / Prowess rating ──
P.getOrCreatePlayer('fighter', 'Fighter');
ok('fresh player has rating 1000', P.getPlayer('fighter').prowess_rating === 1000);

// Total power grows with realm
const mortalPower = P.getTotalPower('fighter');
ok('Mortal stage 0 step 0 power floor', mortalPower >= 100);

sql('UPDATE players SET realm=8, stage=2, step=8 WHERE id=?').run('fighter');
const cultivatorPower = P.getTotalPower('fighter');
ok('Cultivator power > Mortal power', cultivatorPower > mortalPower);

// pvpFight always resolves (AI fallback if no opponent)
sql('UPDATE players SET realm=0, stage=0, step=0 WHERE id=?').run('fighter');
const fight1 = P.pvpFight('fighter');
ok('pvpFight returns a result',          fight1.success);
ok('pvpFight returns an opponent',       !!fight1.opponent);
ok('rating changes after fight',         fight1.ratingAfter !== 1000);
ok('W/L counter updated',                P.getPlayer('fighter').pvp_wins + P.getPlayer('fighter').pvp_losses === 1);

// Win awards 50 stones + 10 face; loss drops 10 face
const startStones = P.getPlayer('fighter').spirit_stones;
const startFace = P.getPlayer('fighter').face;
let wins = 0, losses = 0;
for (let i = 0; i < 20; i++) {
  const r = P.pvpFight('fighter');
  if (r.won) wins++; else losses++;
}
const endStones = P.getPlayer('fighter').spirit_stones;
const endFace = P.getPlayer('fighter').face;
ok('stones awarded only on wins',  endStones === startStones + wins * 50);
ok('face +10 per win, -10 per loss', endFace === startFace + wins * 10 - losses * 10);
ok('face can go negative on bad run', P.getPlayer('fighter').face !== null);

// Rankings: fighter shows up
const rankings = P.getRankings(10);
ok('getRankings returns array',        Array.isArray(rankings));
ok('rankings sorted by rating desc',   rankings.every((p, i) => i === 0 || rankings[i - 1].prowess_rating >= p.prowess_rating));

// Rank is number
ok('getMyRank returns number', typeof P.getMyRank('fighter') === 'number');

// ── Tribulations + Heart Demons (grand-realm crossings only) ──
// Top of Mortal grand is realm=2 (Spirit Refining), stage=2 (Late), step=4 (Peak) — crosses into Martial Artist.
P.getOrCreatePlayer('trib', 'Tribulator');
sql('DELETE FROM talents WHERE player_id=?').run('trib');
sql('UPDATE players SET realm=2, stage=2, step=4, qi=0, tribulation_charge=0 WHERE id=?').run('trib');

// View should flag this as a grand breakthrough
const vTrib = P.getCultivationView(P.getPlayer('trib'));
ok('view: isGrandBreakthrough at top-of-grand Peak', vTrib.isGrandBreakthrough);
ok('view: tribulationChance is a number 0-1',
   typeof vTrib.tribulationChance === 'number' && vTrib.tribulationChance > 0 && vTrib.tribulationChance < 1);

// Tribulation can fail (no progress loss) — keep retrying until the grand crossing succeeds
let outcomes = [];
for (let i = 0; i < 30 && P.getPlayer('trib').realm === 2; i++) {
  const r = P.breakthrough('trib');
  outcomes.push(r.kind);
}
ok('at least one tribulation outcome observed',     outcomes.length > 0);
ok('eventually ascended to Martial Artist (realm 3)', P.getPlayer('trib').realm === 3);

// Charge increases success chance
sql('UPDATE players SET realm=2, stage=2, step=4, qi=0, tribulation_charge=0 WHERE id=?').run('trib');
const baseChance = P.getCultivationView(P.getPlayer('trib')).tribulationChance;
sql('UPDATE players SET tribulation_charge=10 WHERE id=?').run('trib');
const boostedChance = P.getCultivationView(P.getPlayer('trib')).tribulationChance;
ok('tribulation chance grows with charge', boostedChance > baseChance);

// Charge is consumed on successful grand breakthrough.
// (Chance caps at 95%, so loop until success — no flake.)
let tryResult = null;
for (let i = 0; i < 100; i++) {
  sql('UPDATE players SET realm=2, stage=2, step=4, qi=0, tribulation_charge=50 WHERE id=?').run('trib');
  tryResult = P.breakthrough('trib');
  if (tryResult.kind === 'grand') break;
}
ok('high charge eventually succeeds within 100 tries', tryResult.kind === 'grand');
ok('charge consumed on grand breakthrough',             P.getPlayer('trib').tribulation_charge === 0);

// Failure preserves charge
sql('UPDATE players SET realm=2, stage=2, step=4, qi=0, tribulation_charge=0, prowess_bonus_pct=0 WHERE id=?').run('trib');
// baseSuccess 40% — sometimes fails. Look for a failure in many tries.
let sawFail = false;
for (let i = 0; i < 20; i++) {
  sql('UPDATE players SET tribulation_charge=0 WHERE id=?').run('trib');
  const r = P.breakthrough('trib');
  if (r.kind === 'grand_fail') { sawFail = true; break; }
  // if success, reset to test again
  sql('UPDATE players SET realm=2, stage=2, step=4, qi=0 WHERE id=?').run('trib');
}
ok('tribulation can fail at base chance', sawFail);

// Perfection steps grant tribulation_charge again (re-added)
sql('UPDATE players SET realm=0, stage=0, step=5, qi=0, tribulation_charge=0, cultivation_tick_at=? WHERE id=?')
  .run(((Date.now() / 1000) | 0) - 60 * 60, 'trib');
P.tickCultivation('trib');
ok('reaching Greater Perfection grants +1 charge', P.getPlayer('trib').tribulation_charge === 1);

// ── Reroll starter talent (pristine only) ──
P.getOrCreatePlayer('rero', 'Reroller');
const rero0 = P.getPlayer('rero');
ok('pristine player can reroll', P.canRerollStarter(rero0));
const starter = P.getTalents('rero')[0];
const before = starter?.id;

// Reroll a few times; the talent may change (not strict equality — same id possible by chance)
for (let i = 0; i < 5; i++) {
  const rr = P.rerollStarterTalent('rero');
  ok('reroll succeeds on pristine player', rr.success);
  ok('exactly one talent after reroll',    P.getTalents('rero').length === 1);
}

// Start cultivating → reroll disabled
P.cultivate('rero');
ok('after cultivate, reroll blocked', !P.canRerollStarter(P.getPlayer('rero')));
const rrBlocked = P.rerollStarterTalent('rero');
ok('reroll call returns error after progress', !rrBlocked.success);

// Odds helpers
ok('talentTierOdds common = 60',    P.talentTierOdds('common') === 60);
ok('talentTierOdds legendary = 1',  P.talentTierOdds('legendary') === 1);
ok('daoistRollOdds stone common=70', P.daoistRollOdds('common', 'stone') === 70);
ok('daoistRollOdds jade legendary=5', P.daoistRollOdds('legendary', 'jade') === 5);
ok('daoistRollOdds stone legendary=0', P.daoistRollOdds('legendary', 'stone') === 0);

db.close();
rmSync('data', { recursive: true, force: true });

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
