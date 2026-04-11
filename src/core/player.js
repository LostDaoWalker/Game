import { sql, tx, upd } from './database.js';
import { LEVEL, ECO, EQUIPMENT, SKILLS, ENEMIES, RARITIES, ZONES, AVATARS, BLOODLINES, PHYSIQUES, TALENTS, ANCESTORS, getRealm } from './config.js';

const randBetween = (min, max) => (Math.random() * (max - min + 1) | 0) + min;

// Unbiased Fisher-Yates — biased sort(() => Math.random() - .5) produces non-uniform distributions
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const swapIndex = (Math.random() * (i + 1)) | 0;
    [array[i], array[swapIndex]] = [array[swapIndex], array[i]];
  }
  return array;
}

// Write-boundary guards — CHECK constraints are the real enforcement, these prevent noisy constraint errors
const floorZero = value => Math.max(0, value | 0);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value | 0));

// ── Weighted random pick — used for bloodlines, physiques, talents ──
function weightedPick(table) {
  const entries = Object.entries(table);
  let total = 0;
  for (const [, v] of entries) total += v.weight;
  let roll = Math.random() * total;
  for (const [id, v] of entries) { roll -= v.weight; if (roll <= 0) return id; }
  return entries[0][0];
}

// ── Player CRUD ──

export const getPlayer = id => sql('SELECT * FROM players WHERE id=?').get(id);

export function getOrCreatePlayer(id, username) {
  const existing = getPlayer(id);
  if (existing) return existing;
  const bloodline = weightedPick(BLOODLINES);
  const physique = weightedPick(PHYSIQUES);
  const talent = weightedPick(TALENTS);
  sql('INSERT OR IGNORE INTO players(id,username,bloodline,physique,talent) VALUES(?,?,?,?,?)').run(id, username, bloodline, physique, talent);
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
    updates.stamina = player.max_stamina; // full refill on level-up
    updates.ancestor_favor = player.ancestor_favor + levelsGained * 10; // ancestor favor on level-up
    generateSkillOffers(playerId);
  }
  upd(playerId, updates);
  return { xp: amount, leveled: levelsGained > 0, newLevel: level };
}

// ── Equipment ──

export const getAllEquipment = playerId => sql('SELECT * FROM equipment WHERE player_id=?').all(playerId);
export const getEquippedItems = playerId => sql('SELECT * FROM equipment WHERE player_id=? AND equipped=1').all(playerId);

function lookupOwnedItem(rowId, playerId) {
  const row = sql('SELECT * FROM equipment WHERE id=? AND player_id=?').get(rowId, playerId);
  if (!row) return { err: 'Not found' };
  const config = EQUIPMENT[row.item_id];
  if (!config) return { err: 'Unknown item' };
  return { row, config };
}

export function equipItem(playerId, rowId) {
  const lookup = lookupOwnedItem(rowId, playerId);
  if (lookup.err) return { success: false, error: lookup.err };
  return tx(() => {
    for (const equipped of getEquippedItems(playerId))
      if (EQUIPMENT[equipped.item_id]?.slot === lookup.config.slot) sql('UPDATE equipment SET equipped=0 WHERE id=?').run(equipped.id);
    sql('UPDATE equipment SET equipped=1 WHERE id=?').run(rowId);
    return { success: true, item: lookup.config };
  });
}

export function sellItem(playerId, rowId) {
  const lookup = lookupOwnedItem(rowId, playerId);
  if (lookup.err) return { success: false, error: lookup.err };
  if (lookup.row.equipped) return { success: false, error: 'Unequip first' };
  const goldValue = (lookup.config.sellValue * ECO.sellMult) | 0;
  return tx(() => {
    sql('DELETE FROM equipment WHERE id=?').run(rowId);
    const player = getPlayer(playerId);
    upd(playerId, { gold: floorZero(player.gold + goldValue) });
    return { success: true, gold: goldValue, item: lookup.config };
  });
}

export function getEquipmentBonuses(playerId) {
  const bonuses = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  for (const equipped of getEquippedItems(playerId)) {
    const config = EQUIPMENT[equipped.item_id];
    if (config) for (const stat in config.stats) if (stat in bonuses) bonuses[stat] += config.stats[stat];
  }
  return bonuses;
}

// ── Skills ──

export const getPlayerSkills = playerId => sql('SELECT * FROM skills WHERE player_id=?').all(playerId);
export const getSkillOffers = playerId => sql('SELECT * FROM skill_offers WHERE player_id=?').get(playerId);

function getSkillLevel(playerId, skillId) {
  const row = sql('SELECT level FROM skills WHERE player_id=? AND skill_id=?').get(playerId, skillId);
  return row?.level || 0;
}

function getSkillLevelMap(playerId) {
  const levels = {};
  for (const row of getPlayerSkills(playerId)) levels[row.skill_id] = row.level;
  return levels;
}

function generateSkillOffers(playerId) {
  const maxedSkills = new Set(
    getPlayerSkills(playerId)
      .filter(row => { const config = SKILLS[row.skill_id]; return config && row.level >= config.maxLevel; })
      .map(row => row.skill_id)
  );
  const available = Object.keys(SKILLS).filter(id => !maxedSkills.has(id));
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

// ── Combat ──

function getTraitBonuses(player) {
  const b = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  for (const src of [BLOODLINES[player.bloodline], PHYSIQUES[player.physique], TALENTS[player.talent]]) {
    if (src?.bonus) for (const s in src.bonus) if (s in b) b[s] += src.bonus[s];
  }
  return b;
}

export function getAncestorBoons(player) {
  const ancestor = ANCESTORS[player.ancestor];
  if (!ancestor) return { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  const b = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  for (const boon of ancestor.boons) {
    if (player.ancestor_favor >= boon.favor) for (const s in boon.bonus) if (s in b) b[s] += boon.bonus[s];
  }
  return b;
}

function getEffectiveStats(playerId) {
  const player = getPlayer(playerId), bonuses = getEquipmentBonuses(playerId);
  const traitBonus = getTraitBonuses(player);
  const ancestorBonus = getAncestorBoons(player);
  return {
    hp: player.hp, max_hp: player.max_hp + bonuses.hp + traitBonus.hp + ancestorBonus.hp,
    attack: player.attack + bonuses.attack + traitBonus.attack + ancestorBonus.attack,
    defense: player.defense + bonuses.defense + traitBonus.defense + ancestorBonus.defense,
    speed: player.speed + bonuses.speed + traitBonus.speed + ancestorBonus.speed,
    strength: player.strength + bonuses.strength + traitBonus.strength + ancestorBonus.strength,
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

      // Regeneration
      const regenLevel = readLevel(myLevels, 'regeneration');
      if (regenLevel) { myHp = Math.min(myMaxHp, myHp + (myMaxHp * regenLevel * .05 | 0)); if (isAttacker) attackerHp = myHp; else defenderHp = myHp; }

      // Dodge
      const dodgeLevel = readLevel(foeLevels, 'dodge_master');
      if (dodgeLevel && Math.random() < dodgeLevel * .12) { log.push({ text: '💨 Dodged!', side: foeSide }); continue; }

      // Berserker rage
      const berserkLevel = readLevel(myLevels, 'berserker_rage');
      if (berserkLevel && myHp / myMaxHp < .3) myAtk = myAtk * berserkLevel * 1.5 | 0;

      // Base damage with variance
      let damage = Math.max(1, myAtk - (foeDef * .6 | 0));
      damage = damage * (.85 + Math.random() * .3) | 0;

      // Critical hit
      let isCrit = false;
      const critLevel = readLevel(myLevels, 'critical_eye');
      if (critLevel && Math.random() < critLevel * .15) { damage = damage * 2 | 0; isCrit = true; }

      // Iron wall damage reduction
      const wallLevel = readLevel(foeLevels, 'iron_wall');
      if (wallLevel) damage = Math.max(1, damage * (1 - wallLevel * .1) | 0);

      // Apply damage
      foeHp -= damage;
      if (isAttacker) defenderHp = foeHp; else attackerHp = foeHp;
      log.push({ text: `${isCrit ? '💥 ' : ''}${damage} dmg`, side: mySide });

      // Double strike
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

function executeCombat(playerId, foe, combatType, lootFn) {
  const player = getPlayer(playerId);
  if (player.stamina < foe.cost) return { success: false, error: 'Not enough stamina' };
  const stats = getEffectiveStats(playerId);
  const skillLevels = getSkillLevelMap(playerId);
  const result = simulate(stats, foe.stats, skillLevels, foe.skills || {});
  const won = result.winner === 'attacker';
  const goldSkillBonus = readLevel(skillLevels, 'gold_digger');
  const goldMultiplier = 1 + (goldSkillBonus ? goldSkillBonus * .2 : 0);
  const earnedXp = won ? randBetween(...foe.xpRange) : randBetween(...foe.xpRange) * .25 | 0;
  const earnedGold = won ? (randBetween(...foe.goldRange) * goldMultiplier | 0) : 0;
  const lootDrop = won && lootFn ? lootFn(player.level) : null;

  return tx(() => {
    const newHp = player.max_hp; // always full HP between fights
    const updates = {
      stamina: floorZero(player.stamina - foe.cost), hp: newHp,
      gold: floorZero(player.gold + earnedGold),
      total_gold_earned: player.total_gold_earned + earnedGold,
      total_xp_earned: player.total_xp_earned + earnedXp,
    };
    if (combatType === 'raid') { if (won) { updates.raids_completed = player.raids_completed + 1; updates.bosses_killed = player.bosses_killed + 1; } }
    else { updates[won ? 'wins' : 'losses'] = player[won ? 'wins' : 'losses'] + 1; }
    // Ancestor favor: +1 pve, +5 raid (only on win)
    if (won) updates.ancestor_favor = player.ancestor_favor + (combatType === 'raid' ? 5 : 1);
    upd(playerId, updates);
    if (lootDrop) sql('INSERT INTO equipment(player_id,item_id) VALUES(?,?)').run(playerId, lootDrop);
    const xpResult = addXp(playerId, earnedXp);
    sql('INSERT INTO combat_log(player_id,opponent_type,opponent_name,won,damage_dealt,damage_taken,gold_earned,xp_earned,loot_item) VALUES(?,?,?,?,?,?,?,?,?)')
      .run(playerId, combatType, foe.name, won ? 1 : 0, result.damageDealt, result.damageTaken, earnedGold, earnedXp, lootDrop);
    const autoEquipped = lootDrop ? autoEquipIfBetter(playerId, lootDrop) : null;
    return { success: true, won, combat: result, gold: earnedGold, xp: xpResult.xp, lootItem: lootDrop ? EQUIPMENT[lootDrop] : null, autoEquipped, leveled: xpResult.leveled, newLevel: xpResult.newLevel, foe };
  });
}

export function fightEnemy(playerId, enemyId) {
  const player = getPlayer(playerId), config = ENEMIES[enemyId];
  if (!config) return { success: false, error: 'Unknown enemy' };
  if (player.level < config.minLevel) return { success: false, error: `Need level ${config.minLevel}` };
  const scaleFactor = config.scaling ** Math.max(0, player.level - config.minLevel);
  return executeCombat(playerId, {
    name: config.name, cost: ZONES[config.zone]?.staminaCost || 1,
    stats: { hp: config.baseHp * scaleFactor | 0, max_hp: config.baseHp * scaleFactor | 0, attack: config.baseAtk * scaleFactor | 0, defense: config.baseDef * scaleFactor | 0, speed: config.baseSpd * scaleFactor | 0, strength: 0 },
    xpRange: config.xp, goldRange: config.gold,
  }, 'pve', rollLoot);
}

// ── Loot ──

const BASE_RARITY_WEIGHTS = Object.fromEntries(Object.entries(RARITIES).map(([rarity, data]) => [rarity, data.weight]));

function rollLoot(playerLevel) {
  if (Math.random() > .3) return null;
  let totalWeight = 0; for (const weight of Object.values(BASE_RARITY_WEIGHTS)) totalWeight += weight;
  let roll = Math.random() * totalWeight, rolledRarity = 'common';
  for (const [rarity, weight] of Object.entries(BASE_RARITY_WEIGHTS)) { roll -= weight; if (roll <= 0) { rolledRarity = rarity; break; } }
  const candidates = Object.entries(EQUIPMENT).filter(([, item]) => item.rarity === rolledRarity && item.dropLevel <= playerLevel + 2);
  return candidates.length ? candidates[randBetween(0, candidates.length - 1)][0] : null;
}

// ── Networth ──

export function updateNetworth(playerId) {
  const player = getPlayer(playerId);
  let equipValue = 0;
  for (const row of getAllEquipment(playerId)) equipValue += EQUIPMENT[row.item_id]?.sellValue || 0;
  const networth = floorZero(player.gold + player.banked_gold + equipValue * ECO.networth.equip + player.level * ECO.networth.level);
  upd(playerId, { networth, peak_networth: Math.max(networth, player.peak_networth) });
  return networth;
}

export const getRecentLog = (playerId, limit = 5) => sql('SELECT * FROM combat_log WHERE player_id=? ORDER BY timestamp DESC LIMIT ?').all(playerId, limit);
export const getLeaderboard = (limit = 10) => sql('SELECT id,username,networth,level,pvp_wins FROM players ORDER BY networth DESC LIMIT ?').all(limit);
export function getRank(playerId) {
  const row = sql('SELECT COUNT(*) + 1 AS rank FROM players WHERE networth > (SELECT networth FROM players WHERE id=?)').get(playerId);
  return row?.rank || 99;
}

// Auto-equip if loot is stronger than current slot occupant
export function autoEquipIfBetter(playerId, itemId) {
  const config = EQUIPMENT[itemId];
  if (!config) return null;
  const equipped = getEquippedItems(playerId);
  const currentInSlot = equipped.find(row => EQUIPMENT[row.item_id]?.slot === config.slot);
  const currentConfig = currentInSlot ? EQUIPMENT[currentInSlot.item_id] : null;
  const totalStats = stats => Object.values(stats).reduce((sum, val) => sum + val, 0);
  if (!currentConfig || totalStats(config.stats) > totalStats(currentConfig.stats)) {
    const newRow = sql('SELECT id FROM equipment WHERE player_id=? AND item_id=? AND equipped=0 ORDER BY id DESC LIMIT 1').get(playerId, itemId);
    if (newRow) { equipItem(playerId, newRow.id); return config; }
  }
  return null;
}

// Sell all unequipped items of a given rarity (or below)
export function sellAllJunk(playerId, maxRarity = 'common') {
  const rarityTier = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const maxTier = rarityTier[maxRarity] ?? 0;
  const items = getAllEquipment(playerId).filter(row => {
    if (row.equipped) return false;
    const config = EQUIPMENT[row.item_id];
    return config && (rarityTier[config.rarity] ?? 0) <= maxTier;
  });
  if (!items.length) return { success: false, error: 'Nothing to sell' };
  return tx(() => {
    let totalGold = 0;
    for (const row of items) {
      const config = EQUIPMENT[row.item_id];
      totalGold += (config.sellValue * ECO.sellMult) | 0;
      sql('DELETE FROM equipment WHERE id=?').run(row.id);
    }
    const player = getPlayer(playerId);
    upd(playerId, { gold: floorZero(player.gold + totalGold) });
    return { success: true, gold: totalGold, count: items.length };
  });
}

// Best available enemy for quick-fight
export function bestEnemy(playerId) {
  const player = getPlayer(playerId);
  let best = null;
  for (const [id, config] of Object.entries(ENEMIES)) {
    if (player.level >= config.minLevel) best = id;
  }
  return best;
}

// Bulk fight — fight N times, return aggregated results
export function bulkFight(playerId, enemyId, count) {
  const results = { wins: 0, losses: 0, goldEarned: 0, xpEarned: 0, loot: [], levelsGained: 0, startLevel: getPlayer(playerId).level };
  for (let i = 0; i < count; i++) {
    const result = fightEnemy(playerId, enemyId);
    if (!result.success) { results.stoppedReason = result.error; break; }
    if (result.won) results.wins++; else results.losses++;
    results.goldEarned += result.gold;
    results.xpEarned += result.xp;
    if (result.lootItem) results.loot.push(result.lootItem);
    if (result.leveled) results.levelsGained += result.newLevel - (results.startLevel + results.levelsGained);
  }
  results.endLevel = getPlayer(playerId).level;
  return results;
}

// ── Ancestor (patron worship) ──

export function setAncestor(playerId, ancestorId) {
  if (!ANCESTORS[ancestorId]) return { success: false, error: 'Unknown ancestor' };
  upd(playerId, { ancestor: ancestorId, ancestor_favor: 0 }); // switching resets favor
  return { success: true, ancestor: ANCESTORS[ancestorId] };
}

// Legacy compat — avatar field now points to ancestor
export function setAvatar(playerId, avatarId) {
  return setAncestor(playerId, avatarId);
}

// ── GRIND — core loop: fight, sell junk ──

export function grind(playerId) {
  regenStamina(playerId);
  const before = getPlayer(playerId);
  const result = { wins: 0, losses: 0, goldEarned: 0, xpEarned: 0, loot: [], leveled: false, newLevel: before.level, junkGold: 0, junkCount: 0, stoppedReason: null, beforeNetworth: before.networth, beforeGold: before.gold, beforeLevel: before.level };

  const enemyId = bestEnemy(playerId);
  if (enemyId) {
    const bulk = bulkFight(playerId, enemyId, 5);
    result.wins = bulk.wins; result.losses = bulk.losses;
    result.goldEarned = bulk.goldEarned; result.xpEarned = bulk.xpEarned;
    result.loot = bulk.loot; result.stoppedReason = bulk.stoppedReason;
    if (bulk.levelsGained) { result.leveled = true; result.newLevel = bulk.endLevel; }
  }


  const junk = sellAllJunk(playerId, 'common');
  if (junk.success) { result.junkGold = junk.gold; result.junkCount = junk.count; }

  updateNetworth(playerId);
  const after = getPlayer(playerId);
  result.afterNetworth = after.networth;
  result.afterGold = after.gold;
  result.player = getPlayer(playerId);
  result.xpPercent = after.xp / after.xp_needed;
  return result;
}
