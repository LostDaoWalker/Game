import { sql, tx } from './database.js';
import { REALMS, STEP_NAMES, STEP_COST_MULT, BREAKTHROUGH_STEP, PERFECTION_STEPS, CULTIVATION } from './config.js';

// ── Player CRUD ──

export const getPlayer = id => sql('SELECT * FROM players WHERE id=?').get(id);

export function getOrCreatePlayer(id, username) {
  const existing = getPlayer(id);
  if (existing) return existing;
  sql('INSERT OR IGNORE INTO players(id,username) VALUES(?,?)').run(id, username);
  return getPlayer(id);
}

// ── Cultivation math ──

// Effective qi rate per minute, including essence bonus (additive).
export function cultivationRate(player) {
  return CULTIVATION.baseRatePerMin * (1 + (player.essence || 0) * CULTIVATION.essenceRateBonus);
}

export function stepCost(realmIndex, stepIndex) {
  const realm = REALMS[realmIndex];
  if (!realm) return Infinity;
  const mult = STEP_COST_MULT[stepIndex] ?? STEP_COST_MULT[STEP_COST_MULT.length - 1];
  return Math.max(1, Math.ceil(realm.baseStepCost * mult));
}

const isAtTopOfRealm  = p => p.stage === REALMS[p.realm].stages.length - 1;
const isAtFinalRealm  = p => p.realm >= REALMS.length - 1;
const isAtMaxStep     = p => p.step >= STEP_NAMES.length - 1;

// ── Tick: catch up qi from walltime, auto-advance steps, grant perfection rewards ──
// Returns { qiGained, stepsAdvanced, perfectionsReached }
export function tickCultivation(playerId) {
  const player = getPlayer(playerId);
  if (!player) return null;
  const now = (Date.now() / 1000) | 0;
  const secondsElapsed = Math.max(0, now - player.cultivation_tick_at);
  const qiGained = Math.floor(secondsElapsed * cultivationRate(player) / 60);
  // Always advance the tick clock so we don't accumulate forever on zero gain
  if (!qiGained) {
    sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(now, playerId);
    return { qiGained: 0, stepsAdvanced: 0, perfectionsReached: 0 };
  }

  let { realm, stage, step, qi, essence, tribulation_charge } = player;
  qi += qiGained;
  let stepsAdvanced = 0, perfectionsReached = 0;

  while (!isAtMaxStep({ realm, stage, step }) && qi >= stepCost(realm, step)) {
    qi -= stepCost(realm, step);
    step++;
    stepsAdvanced++;
    if (PERFECTION_STEPS.has(step)) {
      essence++;
      tribulation_charge++;
      perfectionsReached++;
    }
  }

  // Cap qi at the Extreme Perfection cost so excess doesn't pool uselessly
  if (step === STEP_NAMES.length - 1) {
    const cap = stepCost(realm, step);
    if (qi > cap) qi = cap;
  }

  sql(`UPDATE players SET
        realm=?, stage=?, step=?, qi=?,
        cultivation_tick_at=?,
        essence=?, tribulation_charge=?,
        last_active=unixepoch()
      WHERE id=?`)
    .run(realm, stage, step, qi, now, essence, tribulation_charge, playerId);

  return { qiGained, stepsAdvanced, perfectionsReached };
}

// ── Breakthrough ──
// Unlocks at BREAKTHROUGH_STEP (Peak). Advances stage, or realm if at top of realm.
// On realm breakthrough, tribulation_charge is consumed (spent on the tribulation).
// Returns { success, kind: 'stage'|'realm', previous, next }
export function breakthrough(playerId) {
  const p = getPlayer(playerId);
  if (!p) return { success: false, error: 'No player' };
  if (p.step < BREAKTHROUGH_STEP) return { success: false, error: 'Not ready — reach Peak first.' };

  const realm = REALMS[p.realm];

  if (isAtTopOfRealm(p)) {
    if (isAtFinalRealm(p)) return { success: false, error: 'You stand at the summit. No higher realm is known.' };
    const nextRealm = REALMS[p.realm + 1];
    sql(`UPDATE players SET
          realm=?, stage=0, step=0, qi=0, tribulation_charge=0,
          last_active=unixepoch()
         WHERE id=?`).run(p.realm + 1, playerId);
    return { success: true, kind: 'realm', previous: realm.name, next: nextRealm.name };
  }

  const nextStage = realm.stages[p.stage + 1];
  sql(`UPDATE players SET stage=stage+1, step=0, qi=0, last_active=unixepoch() WHERE id=?`).run(playerId);
  return { success: true, kind: 'stage', previous: realm.stages[p.stage].name, next: nextStage.name };
}

// ── View: computed read-only state for rendering ──
export function getCultivationView(player) {
  const realm = REALMS[player.realm];
  const stage = realm.stages[player.stage];
  const stepName = STEP_NAMES[player.step];
  const cost = stepCost(player.realm, player.step);
  const atMax = player.step === STEP_NAMES.length - 1;
  const progress = atMax && player.qi >= cost ? 1 : Math.max(0, Math.min(1, player.qi / cost));
  const remaining = Math.max(0, cost - player.qi);
  const rate = cultivationRate(player);
  const etaSeconds = (atMax && player.qi >= cost) ? 0 : Math.ceil(remaining * 60 / rate);
  const canBreakthrough = player.step >= BREAKTHROUGH_STEP;
  const isFinalCap = isAtTopOfRealm(player) && isAtFinalRealm(player) && atMax && player.qi >= cost;
  return {
    realm, stage, stepName,
    stepIndex: player.step,
    qi: player.qi, qiCost: cost, progress,
    canBreakthrough, isFinalCap, etaSeconds,
    rate, rateBonusPct: Math.round((player.essence || 0) * CULTIVATION.essenceRateBonus * 100),
    essence: player.essence, tribulationCharge: player.tribulation_charge,
  };
}

export function formatDuration(seconds) {
  if (seconds <= 0) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60), s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60), mm = m % 60;
  if (h < 24) return mm ? `${h}h ${mm}m` : `${h}h`;
  const d = Math.floor(h / 24), hh = h % 24;
  return hh ? `${d}d ${hh}h` : `${d}d`;
}
