import { sql, tx, upd } from './database.js';
import { LEVEL, ECO, EQUIPMENT, SKILLS, ENEMIES, RARITIES, ZONES, ANCESTORS, CLASSES } from './config.js';

const randBetween = (min, max) => (Math.random() * (max - min + 1) | 0) + min;
const floorZero = v => Math.max(0, v | 0);

// Unbiased Fisher-Yates
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Player CRUD ──

export const getPlayer = id => sql('SELECT * FROM players WHERE id=?').get(id);

export function getOrCreatePlayer(id, username) {
  const existing = getPlayer(id);
  if (existing) return existing;
  sql('INSERT OR IGNORE INTO players(id,username) VALUES(?,?)').run(id, username);
  return getPlayer(id);
}

// ── Stamina ──

export function regenStamina(playerId) {
  const player = getPlayer(playerId);
  const now = Date.now() / 1000 | 0;
  const ticks = (now - player.stamina_regen_at) / ECO.staminaRegen | 0;
  if (ticks > 0 && player.stamina < player.max_stamina) {
    const newStamina = Math.min(player.max_stamina, player.stamina + ticks);
    upd(playerId, { stamina: newStamina, stamina_regen_at: player.stamina_regen_at + ticks * ECO.staminaRegen });
  }
}

export function staminaEtaSeconds(player) {
  if (player.stamina >= player.max_stamina) return 0;
  const now = Date.now() / 1000 | 0;
  return Math.max(0, player.stamina_regen_at + ECO.staminaRegen - now);
}

export function formatDuration(seconds) {
  if (seconds <= 0) return 'now';
  if (seconds < 60) return `${seconds}s`;
  const m = (seconds / 60) | 0, s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

// ── XP / Leveling ──

export function addXp(playerId, amount) {
  const player = getPlayer(playerId);
  const quickLearnLevel = getSkillLevel(playerId, 'quick_learner');
  let xp = player.xp + (amount * (1 + quickLearnLevel * SKILLS.quick_learner.effect.xpBonus) | 0);
  let { level, xp_needed, max_hp, attack, defense, speed, strength } = player;
  let levelsGained = 0;
  while (xp >= xp_needed) {
    xp -= xp_needed; level++; levelsGained++;
    xp_needed = LEVEL.xpBase * LEVEL.xpMult ** (level - 1) | 0;
    max_hp += LEVEL.hp; attack += LEVEL.atk; defense += LEVEL.def; speed += LEVEL.spd; strength += LEVEL.str;
  }
  const updates = { xp, level, xp_needed, max_hp, hp: max_hp, attack, defense, speed, strength };
  if (levelsGained) {
    updates.pending_skill_picks = player.pending_skill_picks + levelsGained;
    updates.stamina = player.max_stamina;
    updates.ancestor_favor = player.ancestor_favor + levelsGained * 10;
    generateSkillOffers(playerId);
  }
  upd(playerId, updates);
  return { xp: amount, leveled: levelsGained > 0, newLevel: level };
}

// ── Equipment ──

export const getAllEquipment = playerId => sql('SELECT * FROM equipment WHERE player_id=?').all(playerId);
export const getEquippedItems = playerId => sql('SELECT * FROM equipment WHERE player_id=? AND equipped=1').all(playerId);

export function equipItem(playerId, rowId) {
  const row = sql('SELECT * FROM equipment WHERE id=? AND player_id=?').get(rowId, playerId);
  if (!row) return { success: false, error: 'Not found' };
  const config = EQUIPMENT[row.item_id];
  if (!config) return { success: false, error: 'Unknown item' };
  return tx(() => {
    for (const equipped of getEquippedItems(playerId))
      if (EQUIPMENT[equipped.item_id]?.slot === config.slot) sql('UPDATE equipment SET equipped=0 WHERE id=?').run(equipped.id);
    sql('UPDATE equipment SET equipped=1 WHERE id=?').run(rowId);
    return { success: true, item: config };
  });
}

function getEquipmentBonuses(playerId) {
  const b = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  for (const equipped of getEquippedItems(playerId)) {
    const config = EQUIPMENT[equipped.item_id];
    if (config) for (const stat in config.stats) if (stat in b) b[stat] += config.stats[stat];
  }
  return b;
}

// Auto-equip if loot is stronger than current slot occupant
function autoEquipIfBetter(playerId, itemId) {
  const config = EQUIPMENT[itemId];
  if (!config) return null;
  const currentInSlot = getEquippedItems(playerId).find(row => EQUIPMENT[row.item_id]?.slot === config.slot);
  const currentConfig = currentInSlot ? EQUIPMENT[currentInSlot.item_id] : null;
  const sum = stats => Object.values(stats).reduce((a, b) => a + b, 0);
  if (!currentConfig || sum(config.stats) > sum(currentConfig.stats)) {
    const newRow = sql('SELECT id FROM equipment WHERE player_id=? AND item_id=? AND equipped=0 ORDER BY id DESC LIMIT 1').get(playerId, itemId);
    if (newRow) { equipItem(playerId, newRow.id); return config; }
  }
  return null;
}

// Sell all unequipped items of a given rarity (or below)
export function sellAllJunk(playerId, maxRarity = 'common') {
  const tier = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const maxTier = tier[maxRarity] ?? 0;
  const items = getAllEquipment(playerId).filter(row => {
    if (row.equipped) return false;
    const config = EQUIPMENT[row.item_id];
    return config && (tier[config.rarity] ?? 0) <= maxTier;
  });
  if (!items.length) return { success: false, error: 'Nothing to sell' };
  return tx(() => {
    let totalGold = 0;
    for (const row of items) {
      totalGold += (EQUIPMENT[row.item_id].sellValue * ECO.sellMult) | 0;
      sql('DELETE FROM equipment WHERE id=?').run(row.id);
    }
    const player = getPlayer(playerId);
    upd(playerId, { gold: floorZero(player.gold + totalGold) });
    return { success: true, gold: totalGold, count: items.length };
  });
}

// ── Skills ──

export const getPlayerSkills = playerId => sql('SELECT * FROM skills WHERE player_id=?').all(playerId);
export const getSkillOffers = playerId => sql('SELECT * FROM skill_offers WHERE player_id=?').get(playerId);

function getSkillLevel(playerId, skillId) {
  return sql('SELECT level FROM skills WHERE player_id=? AND skill_id=?').get(playerId, skillId)?.level || 0;
}

function getSkillLevelMap(playerId) {
  const levels = {};
  for (const row of getPlayerSkills(playerId)) levels[row.skill_id] = row.level;
  return levels;
}

function generateSkillOffers(playerId) {
  const maxed = new Set(
    getPlayerSkills(playerId)
      .filter(row => SKILLS[row.skill_id] && row.level >= SKILLS[row.skill_id].maxLevel)
      .map(row => row.skill_id)
  );
  const available = Object.keys(SKILLS).filter(id => !maxed.has(id));
  if (available.length < 3) return;
  const picks = shuffle([...available]).slice(0, 3);
  sql('INSERT OR REPLACE INTO skill_offers(player_id,skill1,skill2,skill3) VALUES(?,?,?,?)').run(playerId, ...picks);
}

export function pickSkill(playerId, skillId) {
  const player = getPlayer(playerId);
  if (!player || player.pending_skill_picks <= 0) return { success: false, error: 'No picks' };
  const offers = getSkillOffers(playerId);
  if (!offers || ![offers.skill1, offers.skill2, offers.skill3].includes(skillId)) return { success: false, error: 'Invalid' };
  const config = SKILLS[skillId];
  if (!config) return { success: false, error: 'Unknown' };
  return tx(() => {
    const existing = sql('SELECT * FROM skills WHERE player_id=? AND skill_id=?').get(playerId, skillId);
    if (existing && existing.level >= config.maxLevel) return { success: false, error: 'Maxed' };
    if (existing) sql('UPDATE skills SET level=level+1 WHERE player_id=? AND skill_id=?').run(playerId, skillId);
    else sql('INSERT INTO skills(player_id,skill_id,level) VALUES(?,?,1)').run(playerId, skillId);
    upd(playerId, { pending_skill_picks: player.pending_skill_picks - 1 });
    if (player.pending_skill_picks - 1 > 0) generateSkillOffers(playerId);
    else sql('DELETE FROM skill_offers WHERE player_id=?').run(playerId);
    return { success: true, skill: config, newLevel: (existing?.level || 0) + 1 };
  });
}

// ── Ancestor (patron worship) + Class (cultivation path) ──

export function setAncestor(playerId, ancestorId) {
  if (!ANCESTORS[ancestorId]) return { success: false, error: 'Unknown ancestor' };
  upd(playerId, { ancestor: ancestorId, ancestor_favor: 0 }); // switching resets favor
  return { success: true, ancestor: ANCESTORS[ancestorId] };
}

export function setClass(playerId, classId) {
  if (!CLASSES[classId]) return { success: false, error: 'Unknown cultivation path' };
  upd(playerId, { class: classId });
  return { success: true, class: CLASSES[classId] };
}

function getAncestorBoons(player) {
  const ancestor = ANCESTORS[player.ancestor];
  const b = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  if (!ancestor) return b;
  for (const boon of ancestor.boons) {
    if (player.ancestor_favor >= boon.favor) for (const s in boon.bonus) if (s in b) b[s] += boon.bonus[s];
  }
  return b;
}

// ── Combat ──

function getEffectiveStats(playerId) {
  const player = getPlayer(playerId);
  const eq = getEquipmentBonuses(playerId);
  const cls = CLASSES[player.class]?.bonus || {};
  const anc = getAncestorBoons(player);
  const get = k => (cls[k] || 0);
  return {
    hp: player.hp,
    max_hp: player.max_hp + eq.hp + get('hp') + anc.hp,
    attack: player.attack + eq.attack + get('attack') + anc.attack,
    defense: player.defense + eq.defense + get('defense') + anc.defense,
    speed: player.speed + eq.speed + get('speed') + anc.speed,
    strength: player.strength + eq.strength + get('strength') + anc.strength,
  };
}

const readLevel = (levelMap, skillId) => levelMap[skillId] ?? 0;

function simulate(attacker, defender, attackerLevels, defenderLevels) {
  let attackerHp = attacker.max_hp || attacker.hp;
  let defenderHp = defender.max_hp || defender.hp;
  const attackerMaxHp = attackerHp, defenderMaxHp = defenderHp;
  const attackerAtk = attacker.attack + (attacker.strength >> 1);
  const defenderAtk = defender.attack + ((defender.strength || 0) >> 1);
  const attackerDef = attacker.defense, defenderDef = defender.defense;
  const log = [];

  const attackerFirst = attacker.speed >= (defender.speed || 0);
  for (let round = 0; round < 30 && attackerHp > 0 && defenderHp > 0; round++) {
    for (const isAttacker of [attackerFirst, !attackerFirst]) {
      const myLevels = isAttacker ? attackerLevels : defenderLevels;
      const foeLevels = isAttacker ? defenderLevels : attackerLevels;
      let myAtk = isAttacker ? attackerAtk : defenderAtk;
      const foeDef = isAttacker ? defenderDef : attackerDef;
      const myMaxHp = isAttacker ? attackerMaxHp : defenderMaxHp;
      let myHp = isAttacker ? attackerHp : defenderHp;
      let foeHp = isAttacker ? defenderHp : attackerHp;
      if (myHp <= 0 || foeHp <= 0) continue;
      const mySide = isAttacker ? 'attacker' : 'defender';
      const foeSide = isAttacker ? 'defender' : 'attacker';

      const regenLevel = readLevel(myLevels, 'regeneration');
      if (regenLevel) { myHp = Math.min(myMaxHp, myHp + (myMaxHp * regenLevel * .05 | 0)); if (isAttacker) attackerHp = myHp; else defenderHp = myHp; }

      const dodgeLevel = readLevel(foeLevels, 'dodge_master');
      if (dodgeLevel && Math.random() < dodgeLevel * .12) { log.push({ text: '💨 Dodged!', side: foeSide }); continue; }

      const berserkLevel = readLevel(myLevels, 'berserker_rage');
      if (berserkLevel && myHp / myMaxHp < .3) myAtk = myAtk * berserkLevel * 1.5 | 0;

      let damage = Math.max(1, myAtk - (foeDef * .6 | 0));
      damage = damage * (.85 + Math.random() * .3) | 0;

      let isCrit = false;
      const critLevel = readLevel(myLevels, 'critical_eye');
      if (critLevel && Math.random() < critLevel * .15) { damage = damage * 2 | 0; isCrit = true; }

      const wallLevel = readLevel(foeLevels, 'iron_wall');
      if (wallLevel) damage = Math.max(1, damage * (1 - wallLevel * .1) | 0);

      foeHp -= damage;
      if (isAttacker) defenderHp = foeHp; else attackerHp = foeHp;
      log.push({ text: `${isCrit ? '💥 ' : ''}${damage} dmg`, side: mySide });

      const doubleLevel = readLevel(myLevels, 'double_strike');
      if (doubleLevel && Math.random() < doubleLevel * .2) {
        const bonusDmg = Math.max(1, damage * .6 | 0);
        foeHp = isAttacker ? defenderHp : attackerHp; foeHp -= bonusDmg;
        if (isAttacker) defenderHp = foeHp; else attackerHp = foeHp;
        log.push({ text: `⚔️ x2 ${bonusDmg}`, side: mySide });
      }
    }
  }
  return {
    winner: attackerHp > defenderHp ? 'attacker' : 'defender',
    attackerHp: Math.max(0, attackerHp), defenderHp: Math.max(0, defenderHp),
    rounds: log.length, log: log.slice(-12),
    damageDealt: defenderMaxHp - Math.max(0, defenderHp),
    damageTaken: attackerMaxHp - Math.max(0, attackerHp),
  };
}

function executeCombat(playerId, foe) {
  const player = getPlayer(playerId);
  if (player.stamina < foe.cost) return { success: false, error: 'Not enough stamina' };
  const skillLevels = getSkillLevelMap(playerId);
  const result = simulate(getEffectiveStats(playerId), foe.stats, skillLevels, {});
  const won = result.winner === 'attacker';
  const goldMult = 1 + readLevel(skillLevels, 'gold_digger') * .2;
  const earnedXp = won ? randBetween(...foe.xpRange) : randBetween(...foe.xpRange) * .25 | 0;
  const earnedGold = won ? (randBetween(...foe.goldRange) * goldMult | 0) : 0;
  const lootDrop = won ? rollLoot(player.level) : null;

  return tx(() => {
    const updates = {
      stamina: floorZero(player.stamina - foe.cost),
      hp: player.max_hp, // always full between fights
      gold: floorZero(player.gold + earnedGold),
      total_gold_earned: player.total_gold_earned + earnedGold,
      total_xp_earned: player.total_xp_earned + earnedXp,
      [won ? 'wins' : 'losses']: player[won ? 'wins' : 'losses'] + 1,
    };
    if (won) updates.ancestor_favor = player.ancestor_favor + 1;
    upd(playerId, updates);
    if (lootDrop) sql('INSERT INTO equipment(player_id,item_id) VALUES(?,?)').run(playerId, lootDrop);
    const xpResult = addXp(playerId, earnedXp);
    const autoEquipped = lootDrop ? autoEquipIfBetter(playerId, lootDrop) : null;
    return { success: true, won, gold: earnedGold, xp: xpResult.xp, lootItem: lootDrop ? EQUIPMENT[lootDrop] : null, autoEquipped, leveled: xpResult.leveled, newLevel: xpResult.newLevel, foe };
  });
}

export function fightEnemy(playerId, enemyId) {
  const player = getPlayer(playerId), config = ENEMIES[enemyId];
  if (!config) return { success: false, error: 'Unknown enemy' };
  if (player.level < config.minLevel) return { success: false, error: `Need level ${config.minLevel}` };
  const scale = config.scaling ** Math.max(0, player.level - config.minLevel);
  return executeCombat(playerId, {
    name: config.name, cost: ZONES[config.zone]?.staminaCost || 1,
    stats: { hp: config.baseHp * scale | 0, max_hp: config.baseHp * scale | 0, attack: config.baseAtk * scale | 0, defense: config.baseDef * scale | 0, speed: config.baseSpd * scale | 0, strength: 0 },
    xpRange: config.xp, goldRange: config.gold,
  });
}

// ── Loot ──

const BASE_RARITY_WEIGHTS = Object.fromEntries(Object.entries(RARITIES).map(([r, d]) => [r, d.weight]));

function rollLoot(playerLevel) {
  if (Math.random() > .3) return null;
  let total = 0; for (const w of Object.values(BASE_RARITY_WEIGHTS)) total += w;
  let roll = Math.random() * total, rolled = 'common';
  for (const [r, w] of Object.entries(BASE_RARITY_WEIGHTS)) { roll -= w; if (roll <= 0) { rolled = r; break; } }
  const candidates = Object.entries(EQUIPMENT).filter(([, item]) => item.rarity === rolled && item.dropLevel <= playerLevel + 2);
  return candidates.length ? candidates[randBetween(0, candidates.length - 1)][0] : null;
}

// Best available enemy for the player's current level
export function bestEnemy(playerId) {
  const player = getPlayer(playerId);
  let best = null;
  for (const [id, config] of Object.entries(ENEMIES)) if (player.level >= config.minLevel) best = id;
  return best;
}

// ── GRIND — core loop: 5 fights, auto-sell junk ──

export function grind(playerId) {
  regenStamina(playerId);
  const result = { wins: 0, losses: 0, goldEarned: 0, xpEarned: 0, loot: [], leveled: false, newLevel: getPlayer(playerId).level, stoppedReason: null };

  const enemyId = bestEnemy(playerId);
  if (enemyId) {
    const startLevel = getPlayer(playerId).level;
    for (let i = 0; i < 5; i++) {
      const r = fightEnemy(playerId, enemyId);
      if (!r.success) { result.stoppedReason = r.error; break; }
      if (r.won) result.wins++; else result.losses++;
      result.goldEarned += r.gold;
      result.xpEarned += r.xp;
      if (r.lootItem) result.loot.push(r.lootItem);
    }
    const endLevel = getPlayer(playerId).level;
    if (endLevel > startLevel) { result.leveled = true; result.newLevel = endLevel; }
  }

  const junk = sellAllJunk(playerId, 'common');
  if (junk.success) { result.goldEarned += junk.gold; }

  result.player = getPlayer(playerId);
  result.xpPercent = result.player.xp / result.player.xp_needed;
  return result;
}
