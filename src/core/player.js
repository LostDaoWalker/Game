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

export function stepCost(realmIndex, stepIndex) {
  const realm = REALMS[realmIndex];
  if (!realm) return Infinity;
  const mult = STEP_COST_MULT[stepIndex] ?? STEP_COST_MULT[STEP_COST_MULT.length - 1];
  return Math.max(1, Math.ceil(realm.baseStepCost * mult));
}

const isAtTopOfRealm = p => p.stage === REALMS[p.realm].stages.length - 1;
const isAtFinalRealm = p => p.realm >= REALMS.length - 1;
const isAtMaxStep    = p => p.step >= STEP_NAMES.length - 1;

// Apply a qi grant to a player, auto-advancing steps and granting perfection rewards.
// Returns the new cultivation state (caller persists).
function applyQi(player, qiToAdd) {
  let { realm, stage, step, qi, prowess_bonus_pct, tribulation_charge } = player;
  qi += qiToAdd;
  let stepsAdvanced = 0, perfectionsReached = 0;

  while (!isAtMaxStep({ realm, stage, step }) && qi >= stepCost(realm, step)) {
    qi -= stepCost(realm, step);
    step++;
    stepsAdvanced++;
    if (PERFECTION_STEPS.has(step)) {
      prowess_bonus_pct += CULTIVATION.prowessPerPerfection;
      tribulation_charge++;
      perfectionsReached++;
    }
  }

  if (step === STEP_NAMES.length - 1) {
    const cap = stepCost(realm, step);
    if (qi > cap) qi = cap;
  }

  return { realm, stage, step, qi, prowess_bonus_pct, tribulation_charge, stepsAdvanced, perfectionsReached };
}

// ── Tick: catch up passive xp from walltime ──
// Returns { qiGained, stepsAdvanced, perfectionsReached }
export function tickCultivation(playerId) {
  const player = getPlayer(playerId);
  if (!player) return null;
  const now = (Date.now() / 1000) | 0;
  const secondsElapsed = Math.max(0, now - player.cultivation_tick_at);
  const qiGained = Math.floor(secondsElapsed * CULTIVATION.baseRatePerMin / 60);
  if (!qiGained) {
    sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(now, playerId);
    return { qiGained: 0, stepsAdvanced: 0, perfectionsReached: 0 };
  }
  const a = applyQi(player, qiGained);
  sql(`UPDATE players SET
        realm=?, stage=?, step=?, qi=?,
        cultivation_tick_at=?,
        prowess_bonus_pct=?, tribulation_charge=?,
        last_active=unixepoch()
       WHERE id=?`)
    .run(a.realm, a.stage, a.step, a.qi, now, a.prowess_bonus_pct, a.tribulation_charge, playerId);
  return { qiGained, stepsAdvanced: a.stepsAdvanced, perfectionsReached: a.perfectionsReached };
}

// ── Meditate: manual xp grant, spammable (no cooldown) ──
// Grant scales with realm's baseStepCost so clicks-per-step stays roughly constant.
// Returns { success, qiGained, stepsAdvanced, perfectionsReached } or { success:false, error }
export function meditate(playerId) {
  // Catch up passive first so qi reflects walltime
  tickCultivation(playerId);
  const player = getPlayer(playerId);
  if (!player) return { success: false, error: 'No player' };

  // Can't meditate usefully when at Extreme Perfection with qi already capped
  const atMax = player.step === STEP_NAMES.length - 1;
  if (atMax && player.qi >= stepCost(player.realm, player.step)) {
    return { success: false, error: 'Breakthrough first — no more room to accumulate.' };
  }

  const grant = Math.max(1, CULTIVATION.meditateGrant);
  const a = applyQi(player, grant);
  sql(`UPDATE players SET
        realm=?, stage=?, step=?, qi=?,
        prowess_bonus_pct=?, tribulation_charge=?,
        last_active=unixepoch()
       WHERE id=?`)
    .run(a.realm, a.stage, a.step, a.qi, a.prowess_bonus_pct, a.tribulation_charge, playerId);
  return { success: true, qiGained: grant, stepsAdvanced: a.stepsAdvanced, perfectionsReached: a.perfectionsReached };
}

// ── Breakthrough ──
// Unlocks at BREAKTHROUGH_STEP (Peak). Advances stage, or realm if at top of realm.
// On realm breakthrough, tribulation_charge is consumed.
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
  const canBreakthrough = player.step >= BREAKTHROUGH_STEP;
  const isStageCap = atMax && player.qi >= cost;
  const isFinalCap = isStageCap && isAtTopOfRealm(player) && isAtFinalRealm(player);

  return {
    realm, stage, stepName,
    stepIndex: player.step,
    qi: player.qi, qiCost: cost, progress,
    canBreakthrough, isFinalCap, isStageCap,
    canMeditate: !isStageCap,
    prowessBonusPct: player.prowess_bonus_pct || 0,
    tribulationCharge: player.tribulation_charge,
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
