import { sql, tx, upd } from './database.js';
import { LEVEL, ECO, EQUIPMENT, SKILLS, ENEMIES, RAIDS, RARITIES, ZONES } from './config.js';

const rand = (a, b) => (Math.random() * (b - a + 1) | 0) + a;

// Unbiased Fisher-Yates
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Floor values at write boundary — CHECK constraints catch anything we miss
const floor0 = n => Math.max(0, n | 0);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n | 0));

// ── CRUD ──
export const get = id => sql('SELECT * FROM players WHERE id=?').get(id);

export function getOrCreate(id, username) {
  sql('INSERT OR IGNORE INTO players(id,username) VALUES(?,?)').run(id, username);
  return get(id);
}

// ── Stamina ──
export function regenStamina(p) {
  const now = Date.now() / 1000 | 0, n = (now - p.stamina_regen_at) / ECO.staminaRegen | 0;
  if (n > 0 && p.stamina < p.max_stamina) {
    p.stamina = Math.min(p.max_stamina, p.stamina + n);
    upd(p.id, { stamina: p.stamina, stamina_regen_at: p.stamina_regen_at + n * ECO.staminaRegen });
  }
}

// ── XP ──
export function addXp(pid, amount) {
  const p = get(pid);
  const ql = skillLevel(pid, 'quick_learner');
  let xp = p.xp + (amount * (1 + ql * SKILLS.quick_learner.effect.xpBonus) | 0);
  let { level, xp_needed, max_hp, attack, defense, speed, strength } = p;
  let lvls = 0;
  while (xp >= xp_needed && level < LEVEL.max) {
    xp -= xp_needed; level++; lvls++;
    xp_needed = LEVEL.xpBase * LEVEL.xpMult ** (level - 1) | 0;
    max_hp += LEVEL.hp; attack += LEVEL.atk; defense += LEVEL.def; speed += LEVEL.spd; strength += LEVEL.str;
  }
  const u = { xp, level, xp_needed, max_hp, hp: max_hp, attack, defense, speed, strength };
  if (lvls) { u.pending_skill_picks = p.pending_skill_picks + lvls; genOffers(pid); }
  upd(pid, u);
  return { xp: amount, leveled: lvls > 0, newLevel: level };
}

// ── Equipment ──
export const getEquip = pid => sql('SELECT * FROM equipment WHERE player_id=?').all(pid);
export const getEquipped = pid => sql('SELECT * FROM equipment WHERE player_id=? AND equipped=1').all(pid);

function lookupItem(rowId, pid) {
  const item = sql('SELECT * FROM equipment WHERE id=? AND player_id=?').get(rowId, pid);
  if (!item) return { err: 'Not found' };
  const cfg = EQUIPMENT[item.item_id];
  if (!cfg) return { err: 'Unknown item' };
  return { item, cfg };
}

export function equipItem(pid, rowId) {
  const result = lookupItem(rowId, pid);
  if (result.err) return { success: false, error: result.err };
  return tx(() => {
    for (const eq of getEquipped(pid)) if (EQUIPMENT[eq.item_id]?.slot === result.cfg.slot) sql('UPDATE equipment SET equipped=0 WHERE id=?').run(eq.id);
    sql('UPDATE equipment SET equipped=1 WHERE id=?').run(rowId);
    return { success: true, item: result.cfg };
  });
}

export function sellItem(pid, rowId) {
  const result = lookupItem(rowId, pid);
  if (result.err) return { success: false, error: result.err };
  if (result.item.equipped) return { success: false, error: 'Unequip first' };
  const gold = (result.cfg.sellValue * ECO.sellMult) | 0;
  return tx(() => {
    sql('DELETE FROM equipment WHERE id=?').run(rowId);
    const p = get(pid);
    upd(pid, { gold: floor0(p.gold + gold) });
    return { success: true, gold, item: result.cfg };
  });
}

export function equipBonuses(pid) {
  const b = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  for (const eq of getEquipped(pid)) {
    const c = EQUIPMENT[eq.item_id];
    if (c) for (const k in c.stats) if (k in b) b[k] += c.stats[k];
  }
  return b;
}

// ── Skills ──
export const getSkills = pid => sql('SELECT * FROM skills WHERE player_id=?').all(pid);
export const getOffers = pid => sql('SELECT * FROM skill_offers WHERE player_id=?').get(pid);

function skillLevel(pid, skillId) {
  const row = sql('SELECT level FROM skills WHERE player_id=? AND skill_id=?').get(pid, skillId);
  return row?.level || 0;
}

// Combat needs all skills as a flat map { skill_id: level }
function skillLevels(pid) {
  const m = {};
  for (const s of getSkills(pid)) m[s.skill_id] = s.level;
  return m;
}

function genOffers(pid) {
  const maxed = new Set(getSkills(pid).filter(s => { const c = SKILLS[s.skill_id]; return c && s.level >= c.maxLevel; }).map(s => s.skill_id));
  const avail = Object.keys(SKILLS).filter(k => !maxed.has(k));
  if (avail.length < 3) return;
  const picks = shuffle([...avail]).slice(0, 3);
  sql('INSERT OR REPLACE INTO skill_offers(player_id,skill1,skill2,skill3) VALUES(?,?,?,?)').run(pid, ...picks);
}

export function pickSkill(pid, skillId) {
  const p = get(pid);
  if (!p || p.pending_skill_picks <= 0) return { success: false, error: 'No picks' };
  const offers = getOffers(pid);
  if (!offers || ![offers.skill1, offers.skill2, offers.skill3].includes(skillId)) return { success: false, error: 'Invalid' };
  const cfg = SKILLS[skillId];
  if (!cfg) return { success: false, error: 'Unknown' };
  return tx(() => {
    const ex = sql('SELECT * FROM skills WHERE player_id=? AND skill_id=?').get(pid, skillId);
    if (ex && ex.level >= cfg.maxLevel) return { success: false, error: 'Maxed' };
    if (ex) sql('UPDATE skills SET level=level+1 WHERE player_id=? AND skill_id=?').run(pid, skillId);
    else sql('INSERT INTO skills(player_id,skill_id,level) VALUES(?,?,1)').run(pid, skillId);
    upd(pid, { pending_skill_picks: p.pending_skill_picks - 1 });
    if (p.pending_skill_picks - 1 > 0) genOffers(pid); else sql('DELETE FROM skill_offers WHERE player_id=?').run(pid);
    return { success: true, skill: cfg, newLevel: (ex?.level || 0) + 1 };
  });
}

// ── Combat Sim ──
function effectiveStats(pid) {
  const p = get(pid), b = equipBonuses(pid);
  return { hp: p.hp, maxHp: p.max_hp + b.hp, attack: p.attack + b.attack, defense: p.defense + b.defense, speed: p.speed + b.speed, strength: p.strength + b.strength };
}

const sl = (sm, id) => sm[id] || 0;

function simulate(atk, def, as, ds) {
  let aHp = atk.maxHp || atk.hp, dHp = def.maxHp || def.hp;
  const aMax = aHp, dMax = dHp;
  let aAtk = atk.attack + (atk.strength >> 1), dAtk = def.attack + ((def.strength || 0) >> 1);
  const aDef = atk.defense, dDef = def.defense;
  let aLS = sl(as, 'last_stand') > 0, dLS = sl(ds, 'last_stand') > 0;
  let aPsn = 0, dPsn = 0;
  const log = [];

  const intA = sl(as, 'intimidate'), intD = sl(ds, 'intimidate');
  if (intA) { dAtk = dAtk * (1 - intA * .1) | 0; log.push({ text: '👊 Intimidate!', side: 'attacker' }); }
  if (intD) aAtk = aAtk * (1 - intD * .1) | 0;

  const aFirst = atk.speed >= (def.speed || 0);
  for (let r = 0; r < 30 && aHp > 0 && dHp > 0; r++) {
    for (const isA of [aFirst, !aFirst]) {
      const mySk = isA ? as : ds, foeSk = isA ? ds : as;
      let mAtk = isA ? aAtk : dAtk, fDef = isA ? dDef : aDef;
      const mMax = isA ? aMax : dMax;
      let mHp = isA ? aHp : dHp, fHp = isA ? dHp : aHp;
      if (mHp <= 0 || fHp <= 0) continue;
      const mSide = isA ? 'attacker' : 'defender';
      const fSide = isA ? 'defender' : 'attacker';

      const psn = isA ? aPsn : dPsn;
      if (psn > 0) {
        const d = Math.max(1, mMax * .05 | 0);
        mHp -= d;
        if (isA) { aPsn--; aHp = mHp; } else { dPsn--; dHp = mHp; }
        log.push({ text: `🧪 ${d} poison`, side: mSide });
        if (mHp <= 0) continue;
      }

      const regen = sl(mySk, 'regeneration');
      if (regen) { mHp = Math.min(mMax, mHp + (mMax * regen * .05 | 0)); if (isA) aHp = mHp; else dHp = mHp; }

      const dodge = sl(foeSk, 'dodge_master');
      if (dodge && Math.random() < dodge * .12) { log.push({ text: '💨 Dodged!', side: fSide }); continue; }

      const berserk = sl(mySk, 'berserker_rage');
      if (berserk && mHp / mMax < .3) mAtk = mAtk * berserk * 1.5 | 0;
      const armorBr = sl(mySk, 'armor_break');
      if (armorBr) fDef = fDef * (1 - armorBr * .25) | 0;

      let dmg = Math.max(1, mAtk - (fDef * .6 | 0));
      dmg = dmg * (.85 + Math.random() * .3) | 0;

      let crit = false;
      const critLv = sl(mySk, 'critical_eye');
      if (critLv && Math.random() < critLv * .15) { dmg = dmg * 2 | 0; crit = true; }

      const wall = sl(foeSk, 'iron_wall');
      if (wall) dmg = Math.max(1, dmg * (1 - wall * .1) | 0);

      fHp -= dmg;
      if (fHp <= 0) {
        const ls = isA ? dLS : aLS;
        if (ls) { fHp = 1; if (isA) dLS = false; else aLS = false; log.push({ text: '🛡️ Last Stand!', side: fSide }); }
      }
      if (isA) dHp = fHp; else aHp = fHp;
      log.push({ text: `${crit ? '💥 ' : ''}${dmg} dmg`, side: mSide });

      const psnLv = sl(mySk, 'poison_strike');
      if (psnLv && Math.random() < psnLv * .15) { if (isA) dPsn = 3; else aPsn = 3; log.push({ text: '🧪 Poisoned!', side: mSide }); }

      const dblLv = sl(mySk, 'double_strike');
      if (dblLv && Math.random() < dblLv * .2) {
        const d = Math.max(1, dmg * .6 | 0);
        fHp = isA ? dHp : aHp; fHp -= d; if (isA) dHp = fHp; else aHp = fHp;
        log.push({ text: `⚔️ x2 ${d}`, side: mSide });
      }

      const ctrLv = sl(foeSk, 'counter_attack');
      if ((isA ? dHp : aHp) > 0 && ctrLv && Math.random() < ctrLv * .2) {
        const cd = Math.max(1, (isA ? dAtk : aAtk) * .4 | 0);
        mHp -= cd; if (isA) aHp = mHp; else dHp = mHp;
        log.push({ text: `🔄 ${cd} ctr`, side: fSide });
      }
    }
  }
  return {
    winner: aHp > dHp ? 'attacker' : 'defender',
    attackerHp: Math.max(0, aHp), defenderHp: Math.max(0, dHp),
    rounds: log.length, log: log.slice(-12),
    damageDealt: dMax - Math.max(0, dHp), damageTaken: aMax - Math.max(0, aHp),
  };
}

// ── Unified Combat ──
function doCombat(pid, foe, type, lootFn) {
  const p = get(pid);
  if (p.stamina < foe.cost) return { success: false, error: 'Not enough stamina' };
  const stats = effectiveStats(pid), sm = skillLevels(pid);
  const result = simulate(stats, foe.stats, sm, foe.skills || {});
  const won = result.winner === 'attacker';
  const goldMult = sl(sm, 'gold_digger') ? 1 + sm.gold_digger * .2 : 1;
  const xp = won ? rand(...foe.xpRange) : rand(...foe.xpRange) * .25 | 0;
  const gold = won ? (rand(...foe.goldRange) * goldMult | 0) : 0;
  const loot = won && lootFn ? lootFn(p.level, sm) : null;

  return tx(() => {
    const newHp = clamp(won ? result.attackerHp : (p.max_hp * .1 | 0), 1, p.max_hp);
    const u = { stamina: floor0(p.stamina - foe.cost), hp: newHp, gold: floor0(p.gold + gold) };
    const wl = type === 'pvp' ? (won ? 'pvp_wins' : 'pvp_losses') : type === 'raid' ? null : (won ? 'wins' : 'losses');
    if (wl) u[wl] = p[wl] + 1;
    if (type === 'raid' && won) { u.raids_completed = p.raids_completed + 1; u.bosses_killed = p.bosses_killed + 1; }
    upd(pid, u);
    if (loot) sql('INSERT INTO equipment(player_id,item_id) VALUES(?,?)').run(pid, loot);
    const xpR = addXp(pid, xp);
    sql('INSERT INTO combat_log(player_id,opponent_type,opponent_name,won,damage_dealt,damage_taken,gold_earned,xp_earned,loot_item) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(pid, type, foe.name, won ? 1 : 0, result.damageDealt, result.damageTaken, gold, xp, loot);
    return { success: true, won, combat: result, gold, xp: xpR.xp, lootItem: loot ? EQUIPMENT[loot] : null, leveled: xpR.leveled, newLevel: xpR.newLevel, foe };
  });
}

export function fightEnemy(pid, enemyId) {
  const p = get(pid), cfg = ENEMIES[enemyId];
  if (!cfg) return { success: false, error: 'Unknown enemy' };
  if (p.level < cfg.minLevel) return { success: false, error: `Need level ${cfg.minLevel}` };
  const s = cfg.scaling ** Math.max(0, p.level - cfg.minLevel);
  return doCombat(pid, {
    name: cfg.name, cost: ZONES[cfg.zone]?.staminaCost || 1,
    stats: { hp: cfg.baseHp * s | 0, maxHp: cfg.baseHp * s | 0, attack: cfg.baseAtk * s | 0, defense: cfg.baseDef * s | 0, speed: cfg.baseSpd * s | 0, strength: 0 },
    xpRange: cfg.xp, goldRange: cfg.gold,
  }, 'pve', rollLoot);
}

export function fightRaid(pid, raidId) {
  const p = get(pid), cfg = RAIDS[raidId];
  if (!cfg) return { success: false, error: 'Unknown raid' };
  if (p.level < cfg.minLevel) return { success: false, error: `Need level ${cfg.minLevel}` };
  return doCombat(pid, {
    name: cfg.name, cost: cfg.staminaCost,
    stats: { hp: cfg.hp, maxHp: cfg.hp, attack: cfg.atk, defense: cfg.def, speed: cfg.spd, strength: 0 },
    xpRange: cfg.xp, goldRange: cfg.gold,
  }, 'raid', (lvl, sm) => {
    const lb = (sm.lucky_looter || 0) * .1;
    return Math.random() < cfg.lootChance + lb ? cfg.lootTable[rand(0, cfg.lootTable.length - 1)] : null;
  });
}

export function pvpFight(pid) {
  const p = get(pid);
  if (p.stamina < ECO.pvpCost) return { success: false, error: 'Not enough stamina' };
  const opp = sql('SELECT * FROM players WHERE id!=? AND level BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1').get(pid, Math.max(1, p.level - 3), p.level + 3);
  const lvl = opp?.level || Math.max(1, p.level + rand(-2, 2));
  const name = opp ? opp.username : ['ShadowBot', 'IronFist_AI', 'NPC_Warrior', 'AutoBrute'][rand(0, 3)] + ` (Lv.${lvl})`;
  return doCombat(pid, {
    name, cost: ECO.pvpCost,
    stats: opp ? effectiveStats(opp.id) : { hp: 80 + lvl * 12, maxHp: 80 + lvl * 12, attack: 6 + lvl * 2, defense: 3 + lvl, speed: 4 + lvl, strength: 4 + lvl },
    skills: opp ? skillLevels(opp.id) : {},
    xpRange: [10 + p.level * 3, 30 + p.level * 5],
    goldRange: [10 + p.level * 5, 20 + p.level * 10],
  }, 'pvp', null);
}

// ── Loot ──
const BASE_WEIGHTS = Object.fromEntries(Object.entries(RARITIES).map(([k, v]) => [k, v.weight]));

function rollLoot(level, sm) {
  const lb = sm.lucky_looter || 0;
  if (Math.random() > .3 + lb * .05) return null;
  const w = { ...BASE_WEIGHTS };
  if (lb) { w.common = Math.max(10, w.common - lb * 10); w.uncommon += lb * 3; w.rare += lb * 2; w.epic += lb; }
  let total = 0; for (const v of Object.values(w)) total += v;
  let roll = Math.random() * total, rarity = 'common';
  for (const [r, wt] of Object.entries(w)) { roll -= wt; if (roll <= 0) { rarity = r; break; } }
  const cands = Object.entries(EQUIPMENT).filter(([, i]) => i.rarity === rarity && i.dropLevel <= level + 2);
  return cands.length ? cands[rand(0, cands.length - 1)][0] : null;
}

// ── Misc ──
export function heal(pid) {
  const p = get(pid);
  if (p.hp >= p.max_hp) return { success: false, error: 'Full HP' };
  const cost = (p.max_hp - p.hp) * ECO.healPerHp | 0;
  if (p.gold < cost) return { success: false, error: `Need ${cost}g` };
  upd(pid, { gold: floor0(p.gold - cost), hp: p.max_hp });
  return { success: true, cost, healed: p.max_hp - p.hp };
}

export function calcNetworth(pid) {
  const p = get(pid);
  let ev = 0; for (const eq of getEquip(pid)) ev += EQUIPMENT[eq.item_id]?.sellValue || 0;
  const nw = floor0(p.gold * ECO.networth.gold + ev * ECO.networth.equip + p.level * ECO.networth.level);
  upd(pid, { networth: nw, peak_networth: Math.max(nw, p.peak_networth) });
  return nw;
}

export const getLog = (pid, n = 5) => sql('SELECT * FROM combat_log WHERE player_id=? ORDER BY timestamp DESC LIMIT ?').all(pid, n);
export const getLeaderboard = (n = 10) => sql('SELECT id,username,networth,level,pvp_wins FROM players ORDER BY networth DESC LIMIT ?').all(n);
