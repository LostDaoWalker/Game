import { sql, tx } from './database.js';
import { REALMS, STEP_NAMES, STEP_COST_MULT, BREAKTHROUGH_STEP, PERFECTION_STEPS, CULTIVATION, CURRENCIES, TALENTS, TALENT_RARITY_WEIGHTS, DAOISTS, ROLLS } from './config.js';

// ── Player CRUD ──

export const getPlayer = id => sql('SELECT * FROM players WHERE id=?').get(id);

export function getOrCreatePlayer(id, username) {
  const existing = getPlayer(id);
  if (existing) return existing;
  sql('INSERT OR IGNORE INTO players(id,username) VALUES(?,?)').run(id, username);
  grantTalent(id); // starter talent on creation
  return getPlayer(id);
}

// ── Talents ──
// Weighted-random rarity, uniform pick within rarity. Duplicates allowed.
export function rollTalent() {
  const weights = TALENT_RARITY_WEIGHTS;
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  let chosenRarity = Object.keys(weights)[0];
  for (const [rarity, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) { chosenRarity = rarity; break; }
  }
  const pool = Object.entries(TALENTS).filter(([, t]) => t.rarity === chosenRarity);
  if (!pool.length) return null;
  const [id, t] = pool[Math.floor(Math.random() * pool.length)];
  return { id, name: t.name, rarity: t.rarity, effects: t.effects };
}

export function grantTalent(playerId) {
  const t = rollTalent();
  if (!t) return null;
  sql('INSERT INTO talents(player_id, talent_id) VALUES(?, ?)').run(playerId, t.id);
  return t;
}

export function getTalents(playerId) {
  const rows = sql('SELECT * FROM talents WHERE player_id=? ORDER BY granted_at ASC').all(playerId);
  return rows.map(r => {
    const t = TALENTS[r.talent_id];
    return t ? { id: r.talent_id, rowId: r.id, granted_at: r.granted_at, ...t } : null;
  }).filter(Boolean);
}

function sumTalentEffect(playerId, key) {
  return getTalents(playerId).reduce((sum, t) => sum + (t.effects?.[key] || 0), 0);
}

// ── Daoists ──
// Roll: weighted rarity (type-specific rates), uniform pick within rarity.
// Duplicates allowed. Cost is paid from spirit_stones or jade.
function pickRarityByWeights(weights) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  let roll = Math.random() * total;
  for (const [rarity, w] of Object.entries(weights)) {
    roll -= w;
    if (roll <= 0) return rarity;
  }
  return Object.keys(weights)[0];
}

export function rollDaoist(playerId, type) {
  const player = getPlayer(playerId);
  if (!player) return { success: false, error: 'No player' };
  const isJade = type === 'jade';
  const cost = isJade ? ROLLS.jadeCost : ROLLS.stoneCost;
  const field = isJade ? 'jade' : 'spirit_stones';
  if (player[field] < cost) return { success: false, error: `Need ${cost} ${isJade ? 'jade' : 'spirit stones'}` };
  const rates = isJade ? ROLLS.jadeRates : ROLLS.stoneRates;
  const rarity = pickRarityByWeights(rates);
  const pool = Object.entries(DAOISTS).filter(([, d]) => d.rarity === rarity);
  if (!pool.length) return { success: false, error: `No daoist of rarity ${rarity}` };
  const [id, daoist] = pool[Math.floor(Math.random() * pool.length)];
  return tx(() => {
    sql(`UPDATE players SET ${field}=${field}-?, last_active=unixepoch() WHERE id=?`).run(cost, playerId);
    sql('INSERT INTO daoists(player_id, daoist_id) VALUES(?, ?)').run(playerId, id);
    return { success: true, daoist: { id, ...daoist }, cost, type };
  });
}

export function getDaoists(playerId) {
  const rows = sql('SELECT * FROM daoists WHERE player_id=? ORDER BY obtained_at ASC').all(playerId);
  return rows.map(r => {
    const d = DAOISTS[r.daoist_id];
    return d ? { rowId: r.id, id: r.daoist_id, in_team: !!r.in_team, obtained_at: r.obtained_at, ...d } : null;
  }).filter(Boolean);
}

export function getTeamDaoists(playerId) {
  return getDaoists(playerId).filter(d => d.in_team);
}

// Daoist slots = realm.teamSlots - 1 (the other slot is the player).
export function getDaoistSlots(player) {
  return Math.max(0, REALMS[player.realm].teamSlots - 1);
}

export function assignDaoistToTeam(playerId, rowId) {
  const player = getPlayer(playerId);
  if (!player) return { success: false, error: 'No player' };
  const row = sql('SELECT * FROM daoists WHERE id=? AND player_id=?').get(rowId, playerId);
  if (!row) return { success: false, error: 'Daoist not found' };
  if (row.in_team) return { success: false, error: 'Already on team' };
  const slots = getDaoistSlots(player);
  const onTeam = getTeamDaoists(playerId).length;
  if (onTeam >= slots) return { success: false, error: slots === 0 ? 'Mortals cultivate alone — breakthrough to form a team.' : 'Team is full.' };
  sql('UPDATE daoists SET in_team=1 WHERE id=?').run(rowId);
  return { success: true, daoist: DAOISTS[row.daoist_id] };
}

export function removeDaoistFromTeam(playerId, rowId) {
  const row = sql('SELECT * FROM daoists WHERE id=? AND player_id=?').get(rowId, playerId);
  if (!row) return { success: false, error: 'Daoist not found' };
  if (!row.in_team) return { success: false, error: 'Not on team' };
  sql('UPDATE daoists SET in_team=0 WHERE id=?').run(rowId);
  return { success: true, daoist: DAOISTS[row.daoist_id] };
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
  let { realm, stage, step, qi, prowess_bonus_pct, spirit_stones } = player;
  spirit_stones = spirit_stones || 0;
  qi += qiToAdd;
  let stepsAdvanced = 0, perfectionsReached = 0, stonesEarned = 0;

  while (!isAtMaxStep({ realm, stage, step }) && qi >= stepCost(realm, step)) {
    qi -= stepCost(realm, step);
    step++;
    stepsAdvanced++;
    if (PERFECTION_STEPS.has(step)) {
      prowess_bonus_pct += CULTIVATION.prowessPerPerfection;
      spirit_stones += CURRENCIES.perfectionStones;
      stonesEarned += CURRENCIES.perfectionStones;
      perfectionsReached++;
    }
  }

  // Qi is never capped — past Absolute Perfection it keeps accumulating.
  return { realm, stage, step, qi, prowess_bonus_pct, spirit_stones, stepsAdvanced, perfectionsReached, stonesEarned };
}

// ── Tick: catch up passive xp from walltime ──
// Returns { qiGained, stepsAdvanced, perfectionsReached }
export function tickCultivation(playerId) {
  const player = getPlayer(playerId);
  if (!player) return null;
  const now = (Date.now() / 1000) | 0;
  const secondsElapsed = Math.max(0, now - player.cultivation_tick_at);
  const rateMult = 1 + sumTalentEffect(playerId, 'cultivationRateBonusPct') / 100;
  const qiGained = Math.floor(secondsElapsed * CULTIVATION.baseRatePerMin * rateMult / 60);
  if (!qiGained) {
    sql('UPDATE players SET cultivation_tick_at=? WHERE id=?').run(now, playerId);
    return { qiGained: 0, stepsAdvanced: 0, perfectionsReached: 0 };
  }
  const a = applyQi(player, qiGained);
  sql(`UPDATE players SET
        realm=?, stage=?, step=?, qi=?,
        cultivation_tick_at=?,
        prowess_bonus_pct=?, spirit_stones=?,
        last_active=unixepoch()
       WHERE id=?`)
    .run(a.realm, a.stage, a.step, a.qi, now, a.prowess_bonus_pct, a.spirit_stones, playerId);
  return { qiGained, stepsAdvanced: a.stepsAdvanced, perfectionsReached: a.perfectionsReached, stonesEarned: a.stonesEarned };
}

// ── Cultivate: manual xp grant, spammable (no cooldown) ──
// Returns { success, qiGained, stepsAdvanced, perfectionsReached } or { success:false, error }
export function cultivate(playerId) {
  // Catch up passive first so qi reflects walltime
  tickCultivation(playerId);
  const player = getPlayer(playerId);
  if (!player) return { success: false, error: 'No player' };

  const { cultivateGrantMin: lo, cultivateGrantMax: hi } = CULTIVATION;
  const baseGrant = lo + Math.floor(Math.random() * (hi - lo + 1));
  const grant = baseGrant + sumTalentEffect(playerId, 'cultivateGrantBonus');
  const a = applyQi(player, grant);
  sql(`UPDATE players SET
        realm=?, stage=?, step=?, qi=?,
        prowess_bonus_pct=?, spirit_stones=?,
        last_active=unixepoch()
       WHERE id=?`)
    .run(a.realm, a.stage, a.step, a.qi, a.prowess_bonus_pct, a.spirit_stones, playerId);
  return { success: true, qiGained: grant, stepsAdvanced: a.stepsAdvanced, perfectionsReached: a.perfectionsReached, stonesEarned: a.stonesEarned };
}

// ── Breakthrough ──
// Unlocks at BREAKTHROUGH_STEP (Peak). Advances stage, or realm if at top of realm.
// Qi carries over into the new stage/realm; applyQi re-runs step-advancement.
export function breakthrough(playerId) {
  const p = getPlayer(playerId);
  if (!p) return { success: false, error: 'No player' };
  if (p.step < BREAKTHROUGH_STEP) return { success: false, error: 'Not ready — reach Peak first.' };

  const realm = REALMS[p.realm];

  if (isAtTopOfRealm(p)) {
    if (isAtFinalRealm(p)) return { success: false, error: 'You stand at the summit. No higher realm is known.' };
    const nextRealm = REALMS[p.realm + 1];
    const newState = {
      realm: p.realm + 1, stage: 0, step: 0, qi: p.qi,
      prowess_bonus_pct: p.prowess_bonus_pct,
      spirit_stones: p.spirit_stones + CURRENCIES.realmBreakthroughStones,
    };
    const a = applyQi(newState, 0);
    const newJade = p.jade + CURRENCIES.realmBreakthroughJade;
    sql(`UPDATE players SET realm=?, stage=?, step=?, qi=?, prowess_bonus_pct=?, spirit_stones=?, jade=?, last_active=unixepoch() WHERE id=?`)
      .run(a.realm, a.stage, a.step, a.qi, a.prowess_bonus_pct, a.spirit_stones, newJade, playerId);
    const talent = grantTalent(playerId);
    return {
      success: true, kind: 'realm', previous: realm.name, next: nextRealm.name, talent,
      stonesEarned: CURRENCIES.realmBreakthroughStones + a.stonesEarned,
      jadeEarned: CURRENCIES.realmBreakthroughJade,
    };
  }

  const nextStage = realm.stages[p.stage + 1];
  const newState = {
    realm: p.realm, stage: p.stage + 1, step: 0, qi: p.qi,
    prowess_bonus_pct: p.prowess_bonus_pct,
    spirit_stones: p.spirit_stones + CURRENCIES.stageBreakthroughStones,
  };
  const a = applyQi(newState, 0);
  sql(`UPDATE players SET stage=?, step=?, qi=?, prowess_bonus_pct=?, spirit_stones=?, last_active=unixepoch() WHERE id=?`)
    .run(a.stage, a.step, a.qi, a.prowess_bonus_pct, a.spirit_stones, playerId);
  return {
    success: true, kind: 'stage', previous: realm.stages[p.stage].name, next: nextStage.name,
    stonesEarned: CURRENCIES.stageBreakthroughStones + a.stonesEarned,
  };
}

// ── View: computed read-only state for rendering ──
export function getCultivationView(player) {
  const realm = REALMS[player.realm];
  const stage = realm.stages[player.stage];
  const stepName = STEP_NAMES[player.step];
  const cost = stepCost(player.realm, player.step);
  const atMax = player.step === STEP_NAMES.length - 1;
  const progress = Math.max(0, Math.min(1, player.qi / cost));
  const canBreakthrough = player.step >= BREAKTHROUGH_STEP;
  // At the summit of the highest realm's last stage, Absolute Perfection —
  // qi still accumulates, but breakthrough has nowhere to go.
  const isFinalCap = atMax && isAtTopOfRealm(player) && isAtFinalRealm(player);

  return {
    realm, stage, stepName,
    stepIndex: player.step,
    qi: player.qi, qiCost: cost, progress,
    canBreakthrough, isFinalCap,
    canCultivate: true,
    prowessBonusPct: player.prowess_bonus_pct || 0,
  };
}

// Effective stats including talent contributions.
// Used by the profile screen, not the home screen (no-buff-constantly rule).
export function getEffectiveStats(playerId) {
  const player = getPlayer(playerId);
  const rateBonus = sumTalentEffect(playerId, 'cultivationRateBonusPct');
  const prowessBonus = sumTalentEffect(playerId, 'prowessBonusPct');
  const grantBonus = sumTalentEffect(playerId, 'cultivateGrantBonus');
  return {
    cultivationRate: CULTIVATION.baseRatePerMin * (1 + rateBonus / 100),
    rateBonusPct: rateBonus,
    totalProwessBonusPct: (player.prowess_bonus_pct || 0) + prowessBonus,
    prowessFromPerfections: player.prowess_bonus_pct || 0,
    prowessFromTalents: prowessBonus,
    cultivateGrantBonus: grantBonus,
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
