import { sql, tx, upd } from './database.js';
import { LEVEL, ECO, EQUIPMENT, SKILLS, ENEMIES, RAIDS, RARITIES, ZONES, ASSETS, CREW, GEAR_SETS, SYNTHESIS, BANK } from './config.js';

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

// ── Player CRUD ──

export const getPlayer = id => sql('SELECT * FROM players WHERE id=?').get(id);

export function getOrCreatePlayer(id, username) {
  sql('INSERT OR IGNORE INTO players(id,username) VALUES(?,?)').run(id, username);
  return getPlayer(id);
}

// Daily bonus: escalating gold for consecutive days, resets on miss
const DAILY_REWARDS = [50, 100, 150, 250, 400, 600, 1000];

export function claimDaily(playerId) {
  const player = getPlayer(playerId);
  const today = Date.now() / 86400000 | 0; // days since epoch
  const lastDay = player.last_daily;
  if (lastDay === today) return { success: false, error: 'Already claimed today' };
  const streak = (lastDay === today - 1) ? Math.min(player.daily_streak + 1, DAILY_REWARDS.length - 1) : 0;
  const reward = DAILY_REWARDS[streak];
  upd(playerId, { gold: floorZero(player.gold + reward), daily_streak: streak, last_daily: today });
  return { success: true, gold: reward, streak: streak + 1, maxStreak: DAILY_REWARDS.length };
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

function getEffectiveStats(playerId) {
  const player = getPlayer(playerId), bonuses = getEquipmentBonuses(playerId);
  const crewBonus = getCrewBonuses(playerId);
  const gearSet = getActiveGearSet(playerId);
  const setBonus = gearSet?.bonus || {};
  return {
    hp: player.hp, max_hp: player.max_hp + bonuses.hp + (setBonus.hp || 0),
    attack: player.attack + bonuses.attack + (crewBonus.attack || 0) + (setBonus.attack || 0),
    defense: player.defense + bonuses.defense + (crewBonus.defense || 0) + (setBonus.defense || 0),
    speed: player.speed + bonuses.speed + (crewBonus.speed || 0) + (setBonus.speed || 0),
    strength: player.strength + bonuses.strength + (crewBonus.strength || 0) + (setBonus.strength || 0),
  };
}

const readLevel = (levelMap, skillId) => levelMap[skillId] ?? 0;

function simulate(attacker, defender, attackerLevels, defenderLevels) {
  let attackerHp = attacker.max_hp || attacker.hp;
  let defenderHp = defender.max_hp || defender.hp;
  const attackerMaxHp = attackerHp, defenderMaxHp = defenderHp;
  let attackerAtk = attacker.attack + (attacker.strength >> 1);
  let defenderAtk = defender.attack + ((defender.strength || 0) >> 1);
  const attackerDef = attacker.defense, defenderDef = defender.defense;
  let attackerLastStand = readLevel(attackerLevels, 'last_stand') > 0;
  let defenderLastStand = readLevel(defenderLevels, 'last_stand') > 0;
  let attackerPoison = 0, defenderPoison = 0;
  const log = [];

  const attackerIntimidate = readLevel(attackerLevels, 'intimidate');
  const defenderIntimidate = readLevel(defenderLevels, 'intimidate');
  if (attackerIntimidate) { defenderAtk = defenderAtk * (1 - attackerIntimidate * .1) | 0; log.push({ text: '👊 Intimidate!', side: 'attacker' }); }
  if (defenderIntimidate) attackerAtk = attackerAtk * (1 - defenderIntimidate * .1) | 0;

  const attackerFirst = attacker.speed >= (defender.speed || 0);
  for (let round = 0; round < 30 && attackerHp > 0 && defenderHp > 0; round++) {
    for (const isAttacker of [attackerFirst, !attackerFirst]) {
      const myLevels = isAttacker ? attackerLevels : defenderLevels;
      const foeLevels = isAttacker ? defenderLevels : attackerLevels;
      let myAtk = isAttacker ? attackerAtk : defenderAtk;
      let foeDef = isAttacker ? defenderDef : attackerDef;
      const myMaxHp = isAttacker ? attackerMaxHp : defenderMaxHp;
      let myHp = isAttacker ? attackerHp : defenderHp;
      let foeHp = isAttacker ? defenderHp : attackerHp;
      if (myHp <= 0 || foeHp <= 0) continue;
      const mySide = isAttacker ? 'attacker' : 'defender';
      const foeSide = isAttacker ? 'defender' : 'attacker';

      // Poison tick
      const poisonTicks = isAttacker ? attackerPoison : defenderPoison;
      if (poisonTicks > 0) {
        const poisonDmg = Math.max(1, myMaxHp * .05 | 0);
        myHp -= poisonDmg;
        if (isAttacker) { attackerPoison--; attackerHp = myHp; } else { defenderPoison--; defenderHp = myHp; }
        log.push({ text: `🧪 ${poisonDmg} poison`, side: mySide });
        if (myHp <= 0) continue;
      }

      // Regeneration
      const regenLevel = readLevel(myLevels, 'regeneration');
      if (regenLevel) { myHp = Math.min(myMaxHp, myHp + (myMaxHp * regenLevel * .05 | 0)); if (isAttacker) attackerHp = myHp; else defenderHp = myHp; }

      // Dodge
      const dodgeLevel = readLevel(foeLevels, 'dodge_master');
      if (dodgeLevel && Math.random() < dodgeLevel * .12) { log.push({ text: '💨 Dodged!', side: foeSide }); continue; }

      // Berserker rage
      const berserkLevel = readLevel(myLevels, 'berserker_rage');
      if (berserkLevel && myHp / myMaxHp < .3) myAtk = myAtk * berserkLevel * 1.5 | 0;

      // Armor break
      const armorBreakLevel = readLevel(myLevels, 'armor_break');
      if (armorBreakLevel) foeDef = foeDef * (1 - armorBreakLevel * .25) | 0;

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
      if (foeHp <= 0) {
        const hasLastStand = isAttacker ? defenderLastStand : attackerLastStand;
        if (hasLastStand) { foeHp = 1; if (isAttacker) defenderLastStand = false; else attackerLastStand = false; log.push({ text: '🛡️ Last Stand!', side: foeSide }); }
      }
      if (isAttacker) defenderHp = foeHp; else attackerHp = foeHp;
      log.push({ text: `${isCrit ? '💥 ' : ''}${damage} dmg`, side: mySide });

      // Poison strike
      const poisonLevel = readLevel(myLevels, 'poison_strike');
      if (poisonLevel && Math.random() < poisonLevel * .15) { if (isAttacker) defenderPoison = 3; else attackerPoison = 3; log.push({ text: '🧪 Poisoned!', side: mySide }); }

      // Double strike
      const doubleLevel = readLevel(myLevels, 'double_strike');
      if (doubleLevel && Math.random() < doubleLevel * .2) {
        const bonusDmg = Math.max(1, damage * .6 | 0);
        foeHp = isAttacker ? defenderHp : attackerHp; foeHp -= bonusDmg;
        if (isAttacker) defenderHp = foeHp; else attackerHp = foeHp;
        log.push({ text: `⚔️ x2 ${bonusDmg}`, side: mySide });
      }

      // Counter attack
      const counterLevel = readLevel(foeLevels, 'counter_attack');
      if ((isAttacker ? defenderHp : attackerHp) > 0 && counterLevel && Math.random() < counterLevel * .2) {
        const counterDmg = Math.max(1, (isAttacker ? defenderAtk : attackerAtk) * .4 | 0);
        myHp -= counterDmg; if (isAttacker) attackerHp = myHp; else defenderHp = myHp;
        log.push({ text: `🔄 ${counterDmg} ctr`, side: foeSide });
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
  const crewGoldBonus = getCrewBonuses(playerId).goldBonus || 0;
  const goldMultiplier = 1 + (goldSkillBonus ? goldSkillBonus * .2 : 0) + crewGoldBonus / 100;
  const earnedXp = won ? randBetween(...foe.xpRange) : randBetween(...foe.xpRange) * .25 | 0;
  const earnedGold = won ? (randBetween(...foe.goldRange) * goldMultiplier | 0) : 0;
  const lootDrop = won && lootFn ? lootFn(player.level, skillLevels) : null;

  return tx(() => {
    const newHp = clamp(won ? result.attackerHp : (player.max_hp * .1 | 0), 1, player.max_hp);
    const updates = { stamina: floorZero(player.stamina - foe.cost), hp: newHp, gold: floorZero(player.gold + earnedGold) };
    const winLossField = combatType === 'pvp' ? (won ? 'pvp_wins' : 'pvp_losses') : combatType === 'raid' ? null : (won ? 'wins' : 'losses');
    if (winLossField) updates[winLossField] = player[winLossField] + 1;
    if (combatType === 'raid' && won) { updates.raids_completed = player.raids_completed + 1; updates.bosses_killed = player.bosses_killed + 1; }
    upd(playerId, updates);
    if (lootDrop) {
      sql('INSERT INTO equipment(player_id,item_id) VALUES(?,?)').run(playerId, lootDrop);
    }
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

export function fightRaid(playerId, raidId) {
  const player = getPlayer(playerId), config = RAIDS[raidId];
  if (!config) return { success: false, error: 'Unknown raid' };
  if (player.level < config.minLevel) return { success: false, error: `Need level ${config.minLevel}` };
  return executeCombat(playerId, {
    name: config.name, cost: config.staminaCost,
    stats: { hp: config.hp, max_hp: config.hp, attack: config.atk, defense: config.def, speed: config.spd, strength: 0 },
    xpRange: config.xp, goldRange: config.gold,
  }, 'raid', (playerLevel, levels) => {
    const luckLevel = levels.lucky_looter || 0;
    return Math.random() < config.lootChance + luckLevel * .05 ? config.lootTable[randBetween(0, config.lootTable.length - 1)] : null;
  });
}

export function pvpFight(playerId) {
  const player = getPlayer(playerId);
  if (player.stamina < ECO.pvpCost) return { success: false, error: 'Not enough stamina' };
  const opponent = sql('SELECT * FROM players WHERE id!=? AND level BETWEEN ? AND ? ORDER BY RANDOM() LIMIT 1').get(playerId, Math.max(1, player.level - 3), player.level + 3);
  const opponentLevel = opponent?.level || Math.max(1, player.level + randBetween(-2, 2));
  const opponentName = opponent ? opponent.username : ['ShadowBot', 'IronFist_AI', 'NPC_Warrior', 'AutoBrute'][randBetween(0, 3)] + ` (Lv.${opponentLevel})`;
  const result = executeCombat(playerId, {
    name: opponentName, cost: ECO.pvpCost,
    stats: opponent ? getEffectiveStats(opponent.id) : { hp: 80 + opponentLevel * 12, max_hp: 80 + opponentLevel * 12, attack: 6 + opponentLevel * 2, defense: 3 + opponentLevel, speed: 4 + opponentLevel, strength: 4 + opponentLevel },
    skills: opponent ? getSkillLevelMap(opponent.id) : {},
    xpRange: [10 + player.level * 3, 30 + player.level * 5],
    goldRange: [10 + player.level * 5, 20 + player.level * 10],
  }, 'pvp', null);
  // Steal unbanked gold from real opponents on win
  if (result.success && result.won && opponent) {
    const stolen = (opponent.gold * BANK.pvpTheftPercent) | 0;
    if (stolen > 0) {
      upd(opponent.id, { gold: floorZero(opponent.gold - stolen) });
      const fresh = getPlayer(playerId);
      upd(playerId, { gold: floorZero(fresh.gold + stolen) });
      result.stolen = stolen;
    }
  }
  return result;
}

// ── Loot ──

const BASE_RARITY_WEIGHTS = Object.fromEntries(Object.entries(RARITIES).map(([rarity, data]) => [rarity, data.weight]));

function rollLoot(playerLevel, skillLevels) {
  const lootBonus = skillLevels.lucky_looter || 0;
  if (Math.random() > .3 + lootBonus * .05) return null;
  const weights = { ...BASE_RARITY_WEIGHTS };
  if (lootBonus) { weights.common = Math.max(10, weights.common - lootBonus * 10); weights.uncommon += lootBonus * 3; weights.rare += lootBonus * 2; weights.epic += lootBonus; }
  let totalWeight = 0; for (const weight of Object.values(weights)) totalWeight += weight;
  let roll = Math.random() * totalWeight, rolledRarity = 'common';
  for (const [rarity, weight] of Object.entries(weights)) { roll -= weight; if (roll <= 0) { rolledRarity = rarity; break; } }
  const candidates = Object.entries(EQUIPMENT).filter(([, item]) => item.rarity === rolledRarity && item.dropLevel <= playerLevel + 2);
  return candidates.length ? candidates[randBetween(0, candidates.length - 1)][0] : null;
}

// ── Assets ──

export const getPlayerAssets = playerId => sql('SELECT * FROM assets WHERE player_id=?').all(playerId);

export function buyAsset(playerId, assetId) {
  const config = ASSETS[assetId];
  if (!config) return { success: false, error: 'Unknown asset' };
  const player = getPlayer(playerId);
  if (player.level < config.minLevel) return { success: false, error: `Need level ${config.minLevel}` };
  const existing = sql('SELECT id FROM assets WHERE player_id=? AND asset_id=?').get(playerId, assetId);
  if (existing) return { success: false, error: 'Already owned' };
  if (player.gold < config.cost) return { success: false, error: `Need ${config.cost}g` };
  return tx(() => {
    upd(playerId, { gold: floorZero(player.gold - config.cost) });
    sql('INSERT INTO assets(player_id,asset_id) VALUES(?,?)').run(playerId, assetId);
    return { success: true, asset: config };
  });
}

export function collectAssetIncome(playerId) {
  const now = Date.now() / 1000 | 0;
  const owned = getPlayerAssets(playerId);
  if (!owned.length) return { success: false, error: 'No assets' };
  return tx(() => {
    let totalIncome = 0, totalMaintenance = 0;
    for (const row of owned) {
      const config = ASSETS[row.asset_id];
      if (!config) continue;
      const hoursElapsed = Math.min(24, (now - row.last_collected) / 3600);  // cap at 24h — no AFK snowball
      if (hoursElapsed < 0.01) continue;
      totalIncome += (config.incomePerHr * hoursElapsed) | 0;
      totalMaintenance += (config.maintenancePerHr * hoursElapsed) | 0;
      sql('UPDATE assets SET last_collected=? WHERE id=?').run(now, row.id);
    }
    const netEarnings = floorZero(totalIncome - totalMaintenance);
    if (netEarnings > 0) {
      const player = getPlayer(playerId);
      upd(playerId, { gold: floorZero(player.gold + netEarnings) });
    }
    return { success: true, income: totalIncome, maintenance: totalMaintenance, net: netEarnings };
  });
}

// ── Healing / Networth ──

export function healPlayer(playerId) {
  const player = getPlayer(playerId);
  if (player.hp >= player.max_hp) return { success: false, error: 'Full HP' };
  const cost = (player.max_hp - player.hp) * ECO.healPerHp | 0;
  if (player.gold < cost) return { success: false, error: `Need ${cost}g` };
  upd(playerId, { gold: floorZero(player.gold - cost), hp: player.max_hp });
  return { success: true, cost, healed: player.max_hp - player.hp };
}

export function updateNetworth(playerId) {
  const player = getPlayer(playerId);
  let equipValue = 0;
  for (const row of getAllEquipment(playerId)) equipValue += EQUIPMENT[row.item_id]?.sellValue || 0;
  let assetValue = 0;
  for (const row of getPlayerAssets(playerId)) assetValue += ASSETS[row.asset_id]?.networthValue || 0;
  let crewValue = 0;
  for (const row of getPlayerCrew(playerId)) crewValue += CREW[row.crew_id]?.cost || 0;
  const networth = floorZero(player.gold + player.banked_gold + equipValue * ECO.networth.equip + player.level * ECO.networth.level + assetValue + crewValue);
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

// Sell all unequipped items worse than currently equipped — smart cleanup
export function sellBelowEquipped(playerId) {
  const RARITY_TIER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const equipped = getEquippedItems(playerId);
  const equippedBySlot = {};
  for (const row of equipped) {
    const config = EQUIPMENT[row.item_id];
    if (config) equippedBySlot[config.slot] = RARITY_TIER[config.rarity] ?? 0;
  }
  const toSell = getAllEquipment(playerId).filter(row => {
    if (row.equipped) return false;
    const config = EQUIPMENT[row.item_id];
    if (!config) return false;
    const equippedTier = equippedBySlot[config.slot];
    return equippedTier !== undefined && (RARITY_TIER[config.rarity] ?? 0) < equippedTier;
  });
  if (!toSell.length) return { success: false, error: 'Nothing to sell' };
  return tx(() => {
    let totalGold = 0;
    for (const row of toSell) {
      totalGold += (EQUIPMENT[row.item_id].sellValue * ECO.sellMult) | 0;
      sql('DELETE FROM equipment WHERE id=?').run(row.id);
    }
    const player = getPlayer(playerId);
    upd(playerId, { gold: floorZero(player.gold + totalGold) });
    return { success: true, gold: totalGold, count: toSell.length };
  });
}

// Highest tier asset owned — for status display
export function highestAssetIcon(playerId) {
  const owned = getPlayerAssets(playerId);
  if (!owned.length) return null;
  let best = null, bestCost = 0;
  for (const row of owned) {
    const config = ASSETS[row.asset_id];
    if (config && config.cost > bestCost) { best = config; bestCost = config.cost; }
  }
  return best?.icon || null;
}

// ── Bank — protects gold from PvP theft ──

export function depositGold(playerId, amount) {
  const player = getPlayer(playerId);
  if (amount <= 0 || amount > player.gold) return { success: false, error: `Can't deposit ${amount}g` };
  const fee = (amount * BANK.depositFee) | 0;
  const deposited = amount - fee;
  upd(playerId, { gold: floorZero(player.gold - amount), banked_gold: player.banked_gold + deposited });
  return { success: true, deposited, fee };
}

export function withdrawGold(playerId, amount) {
  const player = getPlayer(playerId);
  if (amount <= 0 || amount > player.banked_gold) return { success: false, error: `Can't withdraw ${amount}g` };
  upd(playerId, { gold: player.gold + amount, banked_gold: player.banked_gold - amount });
  return { success: true, withdrawn: amount };
}

// ── Crew — hired associates give passive bonuses ──

export const getPlayerCrew = playerId => sql('SELECT * FROM crew WHERE player_id=?').all(playerId);

export function hireCrew(playerId, crewId) {
  const config = CREW[crewId];
  if (!config) return { success: false, error: 'Unknown crew member' };
  const player = getPlayer(playerId);
  if (player.level < config.minLevel) return { success: false, error: `Need level ${config.minLevel}` };
  const existing = sql('SELECT id FROM crew WHERE player_id=? AND crew_id=?').get(playerId, crewId);
  if (existing) return { success: false, error: 'Already hired' };
  if (player.gold < config.cost) return { success: false, error: `Need ${config.cost}g` };
  return tx(() => {
    upd(playerId, { gold: floorZero(player.gold - config.cost) });
    sql('INSERT INTO crew(player_id,crew_id) VALUES(?,?)').run(playerId, crewId);
    return { success: true, crew: config };
  });
}

export function getCrewBonuses(playerId) {
  const bonuses = { attack: 0, defense: 0, speed: 0, strength: 0, goldBonus: 0 };
  for (const row of getPlayerCrew(playerId)) {
    const config = CREW[row.crew_id];
    if (config && config.bonusType in bonuses) bonuses[config.bonusType] += config.bonusValue;
  }
  return bonuses;
}

// ── Gear Sets — matching equipped items grant bonus stats ──

export function getActiveGearSet(playerId) {
  const equippedIds = new Set(getEquippedItems(playerId).map(row => row.item_id));
  for (const [setId, set] of Object.entries(GEAR_SETS)) {
    if (set.items.every(itemId => equippedIds.has(itemId))) return { id: setId, ...set };
  }
  return null;
}

// ── Synthesis — combine 3 items for a chance at higher rarity ──

export function synthesize(playerId, itemRowId1, itemRowId2, itemRowId3) {
  const player = getPlayer(playerId);
  if (player.gold < SYNTHESIS.cost) return { success: false, error: `Need ${SYNTHESIS.cost}g` };
  const rows = [itemRowId1, itemRowId2, itemRowId3].map(id => sql('SELECT * FROM equipment WHERE id=? AND player_id=? AND equipped=0').get(id, playerId));
  if (rows.some(r => !r)) return { success: false, error: 'Item not found or equipped' };
  const configs = rows.map(r => EQUIPMENT[r.item_id]);
  if (configs.some(c => !c)) return { success: false, error: 'Unknown item' };
  // Use the highest rarity among inputs as the base
  const RARITY_TIER = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4 };
  const bestRarity = configs.reduce((best, c) => RARITY_TIER[c.rarity] > RARITY_TIER[best] ? c.rarity : best, 'common');
  const upgradeChance = SYNTHESIS.upgradeChance[bestRarity];
  const nextRarity = SYNTHESIS.nextRarity[bestRarity];
  return tx(() => {
    // Consume all 3 items + gold
    for (const row of rows) sql('DELETE FROM equipment WHERE id=?').run(row.id);
    upd(playerId, { gold: floorZero(player.gold - SYNTHESIS.cost) });
    // Roll for upgrade
    const upgraded = nextRarity && Math.random() < upgradeChance;
    const resultRarity = upgraded ? nextRarity : bestRarity;
    // Pick random item of result rarity at or below player level
    const candidates = Object.entries(EQUIPMENT).filter(([, item]) => item.rarity === resultRarity && item.dropLevel <= player.level + 2);
    if (!candidates.length) return { success: false, error: 'No items available at this rarity' };
    const [resultItemId, resultConfig] = candidates[randBetween(0, candidates.length - 1)];
    sql('INSERT INTO equipment(player_id,item_id) VALUES(?,?)').run(playerId, resultItemId);
    autoEquipIfBetter(playerId, resultItemId);
    return { success: true, upgraded, item: resultConfig, consumed: configs.map(c => c.name) };
  });
}

// ── HUSTLE — one-button game loop ──
// Fights best enemy, auto-heals, auto-banks, auto-buys next affordable asset/crew, auto-sells junk, auto-picks skill.

export function hustle(playerId) {
  regenStamina(playerId);
  collectAssetIncome(playerId);
  const log = [];

  // Daily bonus if available
  const daily = claimDaily(playerId);
  if (daily.success) log.push(`🎁 +${daily.gold}g daily (streak ${daily.streak})`);

  // Fight best enemy (bulk 5 if stamina allows)
  const enemyId = bestEnemy(playerId);
  if (enemyId) {
    const bulk = bulkFight(playerId, enemyId, 5);
    log.push(`⚔️ ${bulk.wins}W/${bulk.losses}L +${bulk.goldEarned}g +${bulk.xpEarned}xp`);
    if (bulk.loot.length) log.push(`🎁 ${bulk.loot.length} drops`);
    if (bulk.levelsGained) log.push(`🎉 → Lv.${bulk.endLevel} (stamina refilled!)`);
    if (bulk.stoppedReason) log.push(`⏸️ ${bulk.stoppedReason}`);
  }

  // Auto-heal if below 50% HP
  const afterFight = getPlayer(playerId);
  if (afterFight.hp < afterFight.max_hp * 0.5) {
    const heal = healPlayer(playerId);
    if (heal.success) log.push(`❤️ Healed ${heal.healed} HP (-${heal.cost}g)`);
  }

  // Auto-sell junk
  const junk = sellAllJunk(playerId, 'common');
  if (junk.success) log.push(`🗑️ Sold ${junk.count} junk (+${junk.gold}g)`);

  // Auto-synthesize if 3+ unequipped items
  const unequipped = getAllEquipment(playerId).filter(r => !r.equipped);
  if (unequipped.length >= 3) {
    const synth = synthesize(playerId, unequipped[0].id, unequipped[1].id, unequipped[2].id);
    if (synth.success) log.push(`🔨 ${synth.upgraded ? '✨ Upgraded!' : 'Forged'} ${synth.item.icon} ${synth.item.name}`);
  }

  // Auto-bank if gold > 500 (bank half)
  const preBuy = getPlayer(playerId);
  if (preBuy.gold > 500) {
    const bankAmount = (preBuy.gold * 0.3) | 0;
    const dep = depositGold(playerId, bankAmount);
    if (dep.success) log.push(`🏦 Banked ${dep.deposited}g`);
  }

  // Auto-buy best affordable asset
  const current = getPlayer(playerId);
  const ownedAssets = new Set(getPlayerAssets(playerId).map(r => r.asset_id));
  const affordableAsset = Object.entries(ASSETS)
    .filter(([id, a]) => !ownedAssets.has(id) && current.level >= a.minLevel && current.gold >= a.cost)
    .sort((a, b) => b[1].cost - a[1].cost)[0];
  if (affordableAsset) {
    const buy = buyAsset(playerId, affordableAsset[0]);
    if (buy.success) log.push(`🏠 Bought ${buy.asset.icon} ${buy.asset.name}!`);
  }

  // Auto-hire best affordable crew
  const afterBuy = getPlayer(playerId);
  const hiredCrew = new Set(getPlayerCrew(playerId).map(r => r.crew_id));
  const affordableCrew = Object.entries(CREW)
    .filter(([id, c]) => !hiredCrew.has(id) && afterBuy.level >= c.minLevel && afterBuy.gold >= c.cost)
    .sort((a, b) => b[1].cost - a[1].cost)[0];
  if (affordableCrew) {
    const hire = hireCrew(playerId, affordableCrew[0]);
    if (hire.success) log.push(`🤵 Hired ${hire.crew.icon} ${hire.crew.name}!`);
  }

  // Auto-pick skill if available
  const postAll = getPlayer(playerId);
  if (postAll.pending_skill_picks > 0) {
    const offers = getSkillOffers(playerId);
    if (offers) {
      const pick = pickSkill(playerId, offers.skill1);
      if (pick.success) log.push(`🎯 ${pick.skill.icon} ${pick.skill.name}${pick.newLevel > 1 ? ` Lv.${pick.newLevel}` : ''}`);
    }
  }

  updateNetworth(playerId);
  return { log, player: getPlayer(playerId) };
}
