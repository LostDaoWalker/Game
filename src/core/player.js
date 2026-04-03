import { sql, tx } from './database.js';
import { LEVEL, ECO, EQUIPMENT, SKILLS, ENEMIES, RAIDS, RARITIES, ZONES } from './config.js';

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

// ── CRUD ──

export const get = id => sql('SELECT * FROM players WHERE id=?').get(id);
export const getAll = (q, ...a) => sql(q).all(...a);

export function getOrCreate(id, username) {
  sql('INSERT OR IGNORE INTO players(id,username) VALUES(?,?)').run(id, username);
  return get(id);
}

export function upd(id, f) {
  const k = Object.keys(f), s = k.map(k => `${k}=@${k}`).join(',');
  sql(`UPDATE players SET ${s},last_active=unixepoch() WHERE id=@id`).run({ ...f, id });
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

export function addXp(p, amount) {
  const ql = getSkillMap(p.id).quick_learner;
  let xp = p.xp + Math.floor(amount * (1 + (ql ? ql.level * SKILLS.quick_learner.effect.xpBonus : 0)));
  let { level, xp_needed, max_hp, attack, defense, speed, strength } = p;
  let lvls = 0;
  while (xp >= xp_needed && level < LEVEL.max) {
    xp -= xp_needed; level++; lvls++;
    xp_needed = Math.floor(LEVEL.xpBase * LEVEL.xpMult ** (level - 1));
    max_hp += LEVEL.hp; attack += LEVEL.atk; defense += LEVEL.def; speed += LEVEL.spd; strength += LEVEL.str;
  }
  const u = { xp, level, xp_needed, max_hp, hp: max_hp, attack, defense, speed, strength };
  if (lvls) { u.pending_skill_picks = p.pending_skill_picks + lvls; genSkillOffers(p.id); }
  upd(p.id, u);
  return { xp: amount, leveled: lvls > 0, newLevel: level };
}

// ── Equipment ──

export const getEquip = pid => sql('SELECT * FROM equipment WHERE player_id=?').all(pid);
export const getEquipped = pid => sql('SELECT * FROM equipment WHERE player_id=? AND equipped=1').all(pid);

export function equipItem(pid, rowId) {
  const item = sql('SELECT * FROM equipment WHERE id=? AND player_id=?').get(rowId, pid);
  if (!item) return { success: false, error: 'Not found' };
  const cfg = EQUIPMENT[item.item_id];
  if (!cfg) return { success: false, error: 'Unknown' };
  return tx(() => {
    for (const eq of getEquipped(pid)) if (EQUIPMENT[eq.item_id]?.slot === cfg.slot) sql('UPDATE equipment SET equipped=0 WHERE id=?').run(eq.id);
    sql('UPDATE equipment SET equipped=1 WHERE id=?').run(rowId);
    return { success: true, item: cfg };
  });
}

export function sellItem(pid, rowId) {
  const item = sql('SELECT * FROM equipment WHERE id=? AND player_id=?').get(rowId, pid);
  if (!item) return { success: false, error: 'Not found' };
  if (item.equipped) return { success: false, error: 'Unequip first' };
  const cfg = EQUIPMENT[item.item_id];
  const gold = Math.floor((cfg?.sellValue || 0) * ECO.sellMult);
  return tx(() => {
    sql('DELETE FROM equipment WHERE id=?').run(rowId);
    const p = get(pid); upd(pid, { gold: p.gold + gold });
    return { success: true, gold, item: cfg };
  });
}

function getEquipBonuses(pid) {
  const b = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  for (const eq of getEquipped(pid)) { const c = EQUIPMENT[eq.item_id]; if (c) for (const [k, v] of Object.entries(c.stats)) if (k in b) b[k] += v; }
  return b;
}

// ── Skills ──

export const getSkills = pid => sql('SELECT * FROM skills WHERE player_id=?').all(pid);
export const getOffers = pid => sql('SELECT * FROM skill_offers WHERE player_id=?').get(pid);

function getSkillMap(pid) {
  const m = {};
  for (const s of getSkills(pid)) { const c = SKILLS[s.skill_id]; if (c) m[s.skill_id] = { ...c, level: s.level }; }
  return m;
}

function genSkillOffers(pid) {
  const maxed = new Set(getSkills(pid).filter(s => { const c = SKILLS[s.skill_id]; return c && s.level >= c.maxLevel; }).map(s => s.skill_id));
  const avail = Object.keys(SKILLS).filter(k => !maxed.has(k));
  if (avail.length < 3) return;
  const picks = avail.sort(() => Math.random() - .5).slice(0, 3);
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
    if (p.pending_skill_picks - 1 > 0) genSkillOffers(pid); else sql('DELETE FROM skill_offers WHERE player_id=?').run(pid);
    return { success: true, skill: cfg, newLevel: (ex?.level || 0) + 1 };
  });
}

// ── Combat Engine ──

function effectiveStats(pid) {
  const p = get(pid), b = getEquipBonuses(pid);
  return { hp: p.hp, maxHp: p.max_hp + b.hp, attack: p.attack + b.attack, defense: p.defense + b.defense, speed: p.speed + b.speed, strength: p.strength + b.strength };
}

function simulate(atk, def, askills = {}, dskills = {}) {
  let aHp = atk.maxHp || atk.hp, dHp = def.maxHp || def.hp;
  const aMax = aHp, dMax = dHp;
  let aAtk = atk.attack + (atk.strength >> 1), dAtk = def.attack + ((def.strength || 0) >> 1);
  let aDef = atk.defense, dDef = def.defense;
  let aLS = !!askills.last_stand, dLS = !!dskills.last_stand;
  let aPsn = 0, dPsn = 0;
  const log = [];

  if (askills.intimidate) { dAtk = dAtk * (1 - askills.intimidate.level * .1) | 0; log.push({ text: '👊 Intimidate!', side: 'attacker' }); }
  if (dskills.intimidate) aAtk = aAtk * (1 - dskills.intimidate.level * .1) | 0;

  for (let r = 0; r < 30 && aHp > 0 && dHp > 0; r++) {
    for (const isAtk of [atk.speed >= (def.speed || 0), atk.speed < (def.speed || 0)]) {
      const my = isAtk ? askills : dskills, their = isAtk ? dskills : askills;
      let myAtk = isAtk ? aAtk : dAtk, theirDef = isAtk ? dDef : aDef;
      const myMax = isAtk ? aMax : dMax;
      let myHp = isAtk ? aHp : dHp, eHp = isAtk ? dHp : aHp;
      if (myHp <= 0 || eHp <= 0) continue;

      // Poison tick
      const psn = isAtk ? aPsn : dPsn;
      if (psn > 0) { const d = Math.max(1, myMax * .05 | 0); myHp -= d; if (isAtk) { aPsn--; aHp = myHp; } else { dPsn--; dHp = myHp; } log.push({ text: `🧪 ${d} poison`, side: isAtk ? 'attacker' : 'defender' }); if (myHp <= 0) continue; }

      // Regen
      if (my.regeneration) { myHp = Math.min(myMax, myHp + (myMax * my.regeneration.level * .05 | 0)); if (isAtk) aHp = myHp; else dHp = myHp; }

      // Dodge
      if (their.dodge_master && Math.random() < their.dodge_master.level * .12) { log.push({ text: '💨 Dodged!', side: isAtk ? 'defender' : 'attacker' }); continue; }

      // Berserker
      if (my.berserker_rage && myHp / myMax < .3) myAtk = myAtk * my.berserker_rage.level * 1.5 | 0;
      // Armor break
      if (my.armor_break) theirDef = theirDef * (1 - my.armor_break.level * .25) | 0;

      let dmg = Math.max(1, myAtk - (theirDef * .6 | 0));
      dmg = dmg * (.85 + Math.random() * .3) | 0;

      // Crit
      let crit = false;
      if (my.critical_eye && Math.random() < my.critical_eye.level * .15) { dmg = dmg * 2 | 0; crit = true; }

      // Iron wall
      if (their.iron_wall) dmg = Math.max(1, dmg * (1 - their.iron_wall.level * .1) | 0);

      eHp -= dmg;
      if (eHp <= 0) { const ls = isAtk ? dLS : aLS; if (ls) { eHp = 1; if (isAtk) dLS = false; else aLS = false; log.push({ text: '🛡️ Last Stand!', side: isAtk ? 'defender' : 'attacker' }); } }
      if (isAtk) dHp = eHp; else aHp = eHp;
      log.push({ text: `${crit ? '💥 CRIT! ' : ''}${dmg} dmg`, side: isAtk ? 'attacker' : 'defender' });

      // Poison
      if (my.poison_strike && Math.random() < my.poison_strike.level * .15) { if (isAtk) dPsn = 3; else aPsn = 3; log.push({ text: '🧪 Poisoned!', side: isAtk ? 'attacker' : 'defender' }); }
      // Double strike
      if (my.double_strike && Math.random() < my.double_strike.level * .2) { const d = Math.max(1, dmg * .6 | 0); eHp = isAtk ? dHp : aHp; eHp -= d; if (isAtk) dHp = eHp; else aHp = eHp; log.push({ text: `⚔️ x2! ${d} extra`, side: isAtk ? 'attacker' : 'defender' }); }
      // Counter
      if ((isAtk ? dHp : aHp) > 0 && their.counter_attack && Math.random() < their.counter_attack.level * .2) { const cd = Math.max(1, (isAtk ? dAtk : aAtk) * .4 | 0); myHp -= cd; if (isAtk) aHp = myHp; else dHp = myHp; log.push({ text: `🔄 Counter ${cd}`, side: isAtk ? 'defender' : 'attacker' }); }
    }
  }
  return { winner: aHp > dHp ? 'attacker' : 'defender', attackerHp: Math.max(0, aHp), defenderHp: Math.max(0, dHp), rounds: log.length, log: log.slice(-12), damageDealt: dMax - Math.max(0, dHp), damageTaken: aMax - Math.max(0, aHp) };
}

// ── Unified Combat ──

function doCombat(pid, opponent, type, lootFn) {
  const p = get(pid);
  if (p.stamina < opponent.cost) return { success: false, error: 'Not enough stamina' };

  const stats = effectiveStats(pid), sm = getSkillMap(pid);
  const result = simulate(stats, opponent.stats, sm, opponent.skills || {});
  const won = result.winner === 'attacker';

  const gm = sm.gold_digger ? 1 + sm.gold_digger.level * .2 : 1;
  const xp = won ? rand(...opponent.xpRange) : rand(...opponent.xpRange) * .25 | 0;
  const gold = won ? (rand(...opponent.goldRange) * gm | 0) : 0;
  let loot = won && lootFn ? lootFn(p.level, sm) : null;

  return tx(() => {
    const newHp = won ? Math.max(1, Math.min(p.max_hp, result.attackerHp)) : Math.max(1, p.max_hp * .1 | 0);
    const u = { stamina: p.stamina - opponent.cost, hp: newHp, gold: p.gold + gold };
    if (type === 'pvp') { u[won ? 'pvp_wins' : 'pvp_losses'] = p[won ? 'pvp_wins' : 'pvp_losses'] + 1; }
    else if (type === 'raid') { if (won) { u.raids_completed = p.raids_completed + 1; u.bosses_killed = p.bosses_killed + 1; } }
    else { u[won ? 'wins' : 'losses'] = p[won ? 'wins' : 'losses'] + 1; }
    upd(pid, u);
    if (loot) sql('INSERT INTO equipment(player_id,item_id) VALUES(?,?)').run(pid, loot);
    const xpR = addXp(get(pid), xp);
    sql('INSERT INTO combat_log(player_id,opponent_type,opponent_name,won,damage_dealt,damage_taken,gold_earned,xp_earned,loot_item) VALUES(?,?,?,?,?,?,?,?,?)').run(pid, type, opponent.name, won ? 1 : 0, result.damageDealt, result.damageTaken, gold, xp, loot);
    return { success: true, won, combat: result, gold, xp: xpR.xp, lootItem: loot ? EQUIPMENT[loot] : null, leveled: xpR.leveled, newLevel: xpR.newLevel };
  });
}

export function fightEnemy(pid, enemyId) {
  const p = get(pid), cfg = ENEMIES[enemyId];
  if (!cfg) return { success: false, error: 'Unknown' };
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
  if (!cfg) return { success: false, error: 'Unknown' };
  if (p.level < cfg.minLevel) return { success: false, error: `Need level ${cfg.minLevel}` };
  return doCombat(pid, {
    name: cfg.name, cost: cfg.staminaCost,
    stats: { hp: cfg.hp, maxHp: cfg.hp, attack: cfg.atk, defense: cfg.def, speed: cfg.spd, strength: 0 },
    xpRange: cfg.rewards.xp, goldRange: cfg.rewards.gold,
  }, 'raid', (lvl, sm) => {
    const lb = sm.lucky_looter ? sm.lucky_looter.level * .1 : 0;
    return Math.random() < cfg.lootChance + lb ? cfg.lootTable[rand(0, cfg.lootTable.length - 1)] : null;
  });
}

export function pvpFight(pid) {
  const p = get(pid);
  if (p.stamina < ECO.pvpCost) return { success: false, error: 'Not enough stamina' };
  const opp = sql('SELECT * FROM players WHERE id!=? AND level BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1').get(pid, Math.max(1, p.level - 3), p.level + 3);
  const lvl = opp?.level || Math.max(1, p.level + rand(-2, 2));
  const oppStats = opp ? effectiveStats(opp.id) : { hp: 80 + lvl * 12, maxHp: 80 + lvl * 12, attack: 6 + lvl * 2, defense: 3 + lvl, speed: 4 + lvl, strength: 4 + lvl };
  const oppSkills = opp ? getSkillMap(opp.id) : {};
  const oppName = opp ? opp.username : ['ShadowBot', 'IronFist_AI', 'NPC_Warrior', 'AutoBrute'][rand(0, 3)] + ` (Lv.${lvl})`;

  const stats = effectiveStats(pid), sm = getSkillMap(pid);
  const result = simulate(stats, oppStats, sm, oppSkills);
  const won = result.winner === 'attacker';
  const xp = won ? 30 + p.level * 5 : 10 + p.level * 2, gold = won ? 20 + p.level * 10 : 0;

  return tx(() => {
    upd(pid, { stamina: p.stamina - ECO.pvpCost, hp: Math.max(1, result.attackerHp), gold: p.gold + gold, [won ? 'pvp_wins' : 'pvp_losses']: p[won ? 'pvp_wins' : 'pvp_losses'] + 1 });
    const xpR = addXp(get(pid), xp);
    sql('INSERT INTO combat_log(player_id,opponent_type,opponent_name,won,damage_dealt,damage_taken,gold_earned,xp_earned) VALUES(?,?,?,?,?,?,?,?)').run(pid, 'pvp', oppName, won ? 1 : 0, result.damageDealt, result.damageTaken, gold, xp);
    return { success: true, won, combat: result, opponent: { name: oppName, level: lvl }, gold, xp: xpR.xp, leveled: xpR.leveled, newLevel: xpR.newLevel };
  });
}

// ── Loot ──

function rollLoot(level, sm) {
  const lb = sm.lucky_looter ? sm.lucky_looter.level : 0;
  if (Math.random() > .3 + lb * .05) return null;
  const w = Object.fromEntries(Object.entries(RARITIES).map(([k, v]) => [k, v.weight]));
  if (lb) { w.common = Math.max(10, w.common - lb * 10); w.uncommon += lb * 3; w.rare += lb * 2; w.epic += lb; }
  const total = Object.values(w).reduce((a, b) => a + b, 0);
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
  upd(pid, { gold: p.gold - cost, hp: p.max_hp });
  return { success: true, cost, healed: p.max_hp - p.hp };
}

export function calcNetworth(p) {
  let ev = 0; for (const eq of getEquip(p.id)) ev += EQUIPMENT[eq.item_id]?.sellValue || 0;
  const nw = (p.gold * ECO.networth.gold + ev * ECO.networth.equip + p.level * ECO.networth.level) | 0;
  upd(p.id, { networth: nw, peak_networth: Math.max(nw, p.peak_networth) });
  return nw;
}

export const getLog = (pid, n = 5) => sql('SELECT * FROM combat_log WHERE player_id=? ORDER BY timestamp DESC LIMIT ?').all(pid, n);
export const getLeaderboard = (n = 10) => sql('SELECT id,username,networth,level,pvp_wins FROM players ORDER BY networth DESC LIMIT ?').all(n);
