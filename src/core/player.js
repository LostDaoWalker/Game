import { prepare, transaction } from './database.js';
import {
  LEVEL_CONFIG, ECONOMY, EQUIPMENT, SKILLS, ENEMIES, RAIDS,
  RARITIES, EQUIPMENT_SLOTS,
} from './config.js';

// ═══════════════════════════════════════════════
// Player CRUD
// ═══════════════════════════════════════════════

export function getPlayer(id) {
  return prepare('SELECT * FROM players WHERE id = ?').get(id);
}

export function createPlayer(id, username, mentorId) {
  prepare(`
    INSERT OR IGNORE INTO players (id, username, mentor_id)
    VALUES (?, ?, ?)
  `).run(id, username, mentorId || null);

  // Credit mentor with a pupil
  if (mentorId) {
    const mentor = getPlayer(mentorId);
    if (mentor) {
      updatePlayer(mentorId, { pupil_count: mentor.pupil_count + 1 });
      // Mentor bonus: +50 gold, +20 XP per pupil
      updatePlayer(mentorId, { gold: mentor.gold + 50 });
    }
  }

  return getPlayer(id);
}

export function getOrCreatePlayer(id, username) {
  return getPlayer(id) || createPlayer(id, username);
}

export function updatePlayer(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k} = @${k}`).join(', ');
  prepare(`UPDATE players SET ${sets}, last_active = unixepoch() WHERE id = @id`).run({ ...fields, id });
}

// ═══════════════════════════════════════════════
// Stamina
// ═══════════════════════════════════════════════

export function regenStamina(player) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - player.stamina_regen_at;
  const regen = Math.floor(elapsed / ECONOMY.staminaRegenSeconds);
  if (regen > 0 && player.stamina < player.max_stamina) {
    const newStamina = Math.min(player.max_stamina, player.stamina + regen);
    const newRegenAt = player.stamina_regen_at + (regen * ECONOMY.staminaRegenSeconds);
    updatePlayer(player.id, { stamina: newStamina, stamina_regen_at: newRegenAt });
    player.stamina = newStamina;
    player.stamina_regen_at = newRegenAt;
  }
  return player;
}

// ═══════════════════════════════════════════════
// XP / Leveling
// ═══════════════════════════════════════════════

export function addXp(player, amount) {
  const skills = getPlayerSkills(player.id);
  const qlSkill = skills.find(s => s.skill_id === 'quick_learner');
  const bonus = qlSkill ? qlSkill.level * SKILLS.quick_learner.effect.xpBonus : 0;
  const totalXp = Math.floor(amount * (1 + bonus));

  let xp = player.xp + totalXp;
  let level = player.level;
  let xpNeeded = player.xp_needed;
  let maxHp = player.max_hp;
  let attack = player.attack;
  let defense = player.defense;
  let speed = player.speed;
  let strength = player.strength;
  let leveled = false;
  let levelsGained = 0;

  while (xp >= xpNeeded && level < LEVEL_CONFIG.maxLevel) {
    xp -= xpNeeded;
    level++;
    levelsGained++;
    xpNeeded = Math.floor(LEVEL_CONFIG.xpBase * Math.pow(LEVEL_CONFIG.xpMultiplier, level - 1));
    maxHp += LEVEL_CONFIG.hpPerLevel;
    attack += LEVEL_CONFIG.attackPerLevel;
    defense += LEVEL_CONFIG.defensePerLevel;
    speed += LEVEL_CONFIG.speedPerLevel;
    strength += LEVEL_CONFIG.strengthPerLevel;
    leveled = true;
  }

  const updates = {
    xp, level, xp_needed: xpNeeded,
    max_hp: maxHp, hp: maxHp, // Full heal on level-up
    attack, defense, speed, strength,
  };

  // Grant skill picks on level-up
  if (levelsGained > 0) {
    updates.pending_skill_picks = player.pending_skill_picks + levelsGained;
    generateSkillOffers(player.id);
  }

  updatePlayer(player.id, updates);
  return { totalXp, leveled, newLevel: level, levelsGained };
}

// ═══════════════════════════════════════════════
// Equipment
// ═══════════════════════════════════════════════

export function getPlayerEquipment(playerId) {
  return prepare('SELECT * FROM equipment WHERE player_id = ?').all(playerId);
}

export function getEquippedItems(playerId) {
  return prepare('SELECT * FROM equipment WHERE player_id = ? AND equipped = 1').all(playerId);
}

export function addEquipment(playerId, itemId) {
  prepare('INSERT INTO equipment (player_id, item_id) VALUES (?, ?)').run(playerId, itemId);
}

export function equipItem(playerId, equipRowId) {
  const item = prepare('SELECT * FROM equipment WHERE id = ? AND player_id = ?').get(equipRowId, playerId);
  if (!item) return { success: false, error: 'Item not found' };

  const config = EQUIPMENT[item.item_id];
  if (!config) return { success: false, error: 'Unknown item' };

  return transaction(() => {
    // Unequip current item in same slot
    prepare(`
      UPDATE equipment SET equipped = 0
      WHERE player_id = ? AND equipped = 1
      AND item_id IN (SELECT key FROM json_each(?))
    `); // fallback below

    // Unequip all items in this slot
    const equipped = getEquippedItems(playerId);
    for (const eq of equipped) {
      const eqConfig = EQUIPMENT[eq.item_id];
      if (eqConfig && eqConfig.slot === config.slot) {
        prepare('UPDATE equipment SET equipped = 0 WHERE id = ?').run(eq.id);
      }
    }

    // Equip new item
    prepare('UPDATE equipment SET equipped = 1 WHERE id = ?').run(equipRowId);
    return { success: true, item: config };
  });
}

export function sellItem(playerId, equipRowId) {
  const item = prepare('SELECT * FROM equipment WHERE id = ? AND player_id = ?').get(equipRowId, playerId);
  if (!item) return { success: false, error: 'Item not found' };
  if (item.equipped) return { success: false, error: 'Unequip first' };

  const config = EQUIPMENT[item.item_id];
  if (!config) return { success: false, error: 'Unknown item' };

  const gold = Math.floor(config.sellValue * ECONOMY.sellMultiplier);

  return transaction(() => {
    prepare('DELETE FROM equipment WHERE id = ?').run(equipRowId);
    const player = getPlayer(playerId);
    updatePlayer(playerId, { gold: player.gold + gold });
    return { success: true, gold, item: config };
  });
}

export function getEquipmentBonuses(playerId) {
  const equipped = getEquippedItems(playerId);
  const bonuses = { attack: 0, defense: 0, hp: 0, speed: 0, strength: 0 };
  for (const eq of equipped) {
    const config = EQUIPMENT[eq.item_id];
    if (!config) continue;
    for (const [stat, val] of Object.entries(config.stats)) {
      if (bonuses.hasOwnProperty(stat)) bonuses[stat] += val;
    }
  }
  return bonuses;
}

// ═══════════════════════════════════════════════
// Skills
// ═══════════════════════════════════════════════

export function getPlayerSkills(playerId) {
  return prepare('SELECT * FROM skills WHERE player_id = ?').all(playerId);
}

export function getSkillOffers(playerId) {
  return prepare('SELECT * FROM skill_offers WHERE player_id = ?').get(playerId);
}

export function generateSkillOffers(playerId) {
  const existing = getPlayerSkills(playerId);
  const existingIds = new Set(existing.filter(s => {
    const cfg = SKILLS[s.skill_id];
    return cfg && s.level >= cfg.maxLevel;
  }).map(s => s.skill_id));

  const available = Object.keys(SKILLS).filter(k => !existingIds.has(k));
  if (available.length < 3) return;

  // Pick 3 random
  const shuffled = available.sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 3);

  prepare(`
    INSERT OR REPLACE INTO skill_offers (player_id, skill1, skill2, skill3)
    VALUES (?, ?, ?, ?)
  `).run(playerId, picks[0], picks[1], picks[2]);
}

export function pickSkill(playerId, skillId) {
  const player = getPlayer(playerId);
  if (!player || player.pending_skill_picks <= 0) {
    return { success: false, error: 'No skill picks available' };
  }

  const offers = getSkillOffers(playerId);
  if (!offers) return { success: false, error: 'No skill offers' };

  const validPicks = [offers.skill1, offers.skill2, offers.skill3];
  if (!validPicks.includes(skillId)) {
    return { success: false, error: 'Invalid skill choice' };
  }

  const config = SKILLS[skillId];
  if (!config) return { success: false, error: 'Unknown skill' };

  return transaction(() => {
    const existing = prepare('SELECT * FROM skills WHERE player_id = ? AND skill_id = ?').get(playerId, skillId);
    if (existing) {
      if (existing.level >= config.maxLevel) {
        return { success: false, error: 'Skill already maxed' };
      }
      prepare('UPDATE skills SET level = level + 1 WHERE player_id = ? AND skill_id = ?').run(playerId, skillId);
    } else {
      prepare('INSERT INTO skills (player_id, skill_id, level) VALUES (?, ?, 1)').run(playerId, skillId);
    }

    updatePlayer(playerId, { pending_skill_picks: player.pending_skill_picks - 1 });

    // Generate new offers if more picks remain
    if (player.pending_skill_picks - 1 > 0) {
      generateSkillOffers(playerId);
    } else {
      prepare('DELETE FROM skill_offers WHERE player_id = ?').run(playerId);
    }

    return { success: true, skill: config, newLevel: (existing?.level || 0) + 1 };
  });
}

// ═══════════════════════════════════════════════
// Combat Engine
// ═══════════════════════════════════════════════

function getEffectiveStats(playerId) {
  const player = getPlayer(playerId);
  const bonuses = getEquipmentBonuses(playerId);
  return {
    hp: player.hp,
    maxHp: player.max_hp + bonuses.hp,
    attack: player.attack + bonuses.attack,
    defense: player.defense + bonuses.defense,
    speed: player.speed + bonuses.speed,
    strength: player.strength + bonuses.strength,
  };
}

function buildSkillMap(playerId) {
  const skills = getPlayerSkills(playerId);
  const map = {};
  for (const s of skills) {
    const config = SKILLS[s.skill_id];
    if (!config) continue;
    map[s.skill_id] = { ...config, level: s.level };
  }
  return map;
}

function simulateCombat(attacker, defender, attackerSkills = {}, defenderSkills = {}) {
  let atkHp = attacker.maxHp || attacker.hp;
  let defHp = defender.maxHp || defender.hp;
  const maxAtkHp = atkHp;
  const maxDefHp = defHp;

  let atkAtk = attacker.attack + Math.floor(attacker.strength * 0.5);
  let defAtk = defender.attack + Math.floor((defender.strength || 0) * 0.5);
  let atkDef = attacker.defense;
  let defDef = defender.defense;

  let atkLastStand = !!attackerSkills.last_stand;
  let defLastStand = !!defenderSkills.last_stand;
  let atkPoisoned = 0;
  let defPoisoned = 0;

  const log = [];
  let round = 0;
  const maxRounds = 30;

  // Intimidate
  if (attackerSkills.intimidate) {
    const reduction = attackerSkills.intimidate.level * SKILLS.intimidate.effect.enemyAtkReduction;
    defAtk = Math.floor(defAtk * (1 - reduction));
    log.push({ text: '👊 Intimidate reduces enemy ATK!', side: 'attacker' });
  }
  if (defenderSkills.intimidate) {
    const reduction = defenderSkills.intimidate.level * SKILLS.intimidate.effect.enemyAtkReduction;
    atkAtk = Math.floor(atkAtk * (1 - reduction));
  }

  // Speed determines who goes first
  let atkGoesFirst = attacker.speed >= (defender.speed || 0);

  while (atkHp > 0 && defHp > 0 && round < maxRounds) {
    round++;
    const actors = atkGoesFirst
      ? [{ side: 'attacker', myHp: () => atkHp, enemyHp: () => defHp }]
      : [{ side: 'defender' }];

    // Each round both sides attack
    for (const turn of ['attacker', 'defender']) {
      const isAtk = turn === 'attacker';
      const mySkills = isAtk ? attackerSkills : defenderSkills;
      const theirSkills = isAtk ? defenderSkills : attackerSkills;
      let myAtk = isAtk ? atkAtk : defAtk;
      let theirDef = isAtk ? defDef : atkDef;
      const myMaxHp = isAtk ? maxAtkHp : maxDefHp;
      let currentHp = isAtk ? atkHp : defHp;
      let enemyHp = isAtk ? defHp : atkHp;

      if (currentHp <= 0) continue;

      // Poison damage
      const poisonTicks = isAtk ? atkPoisoned : defPoisoned;
      if (poisonTicks > 0) {
        const poisonDmg = Math.max(1, Math.floor(myMaxHp * 0.05));
        currentHp -= poisonDmg;
        if (isAtk) { atkPoisoned--; atkHp = currentHp; }
        else { defPoisoned--; defHp = currentHp; }
        log.push({ text: `🧪 Poison deals ${poisonDmg} damage`, side: turn });
        if (currentHp <= 0) continue;
      }

      // Regeneration
      if (mySkills.regeneration) {
        const heal = Math.floor(myMaxHp * mySkills.regeneration.level * SKILLS.regeneration.effect.regenPercent);
        currentHp = Math.min(myMaxHp, currentHp + heal);
        if (isAtk) atkHp = currentHp; else defHp = currentHp;
      }

      // Dodge check
      if (theirSkills.dodge_master) {
        const dodgeChance = theirSkills.dodge_master.level * SKILLS.dodge_master.effect.dodgeChance;
        if (Math.random() < dodgeChance) {
          log.push({ text: '💨 Dodged!', side: turn === 'attacker' ? 'defender' : 'attacker' });
          continue;
        }
      }

      // Berserker rage
      if (mySkills.berserker_rage && currentHp / myMaxHp < 0.3) {
        myAtk = Math.floor(myAtk * mySkills.berserker_rage.level * SKILLS.berserker_rage.effect.lowHpDmgMult);
      }

      // Armor break
      if (mySkills.armor_break) {
        theirDef = Math.floor(theirDef * (1 - mySkills.armor_break.level * SKILLS.armor_break.effect.armorPen));
      }

      // Iron wall
      let dmgReduction = 0;
      if (theirSkills.iron_wall) {
        dmgReduction = theirSkills.iron_wall.level * SKILLS.iron_wall.effect.dmgReduction;
      }

      // Calculate damage
      let baseDmg = Math.max(1, myAtk - Math.floor(theirDef * 0.6));
      // Add variance
      baseDmg = Math.floor(baseDmg * (0.85 + Math.random() * 0.3));

      // Crit
      let isCrit = false;
      if (mySkills.critical_eye) {
        const critChance = mySkills.critical_eye.level * SKILLS.critical_eye.effect.critChance;
        if (Math.random() < critChance) {
          baseDmg = Math.floor(baseDmg * SKILLS.critical_eye.effect.critMult);
          isCrit = true;
        }
      }

      // Apply damage reduction
      baseDmg = Math.floor(baseDmg * (1 - dmgReduction));
      baseDmg = Math.max(1, baseDmg);

      enemyHp -= baseDmg;

      // Last stand
      if (enemyHp <= 0) {
        const hasLS = isAtk ? defLastStand : atkLastStand;
        if (hasLS) {
          enemyHp = 1;
          if (isAtk) defLastStand = false; else atkLastStand = false;
          log.push({ text: '🛡️ Last Stand activated!', side: turn === 'attacker' ? 'defender' : 'attacker' });
        }
      }

      if (isAtk) defHp = enemyHp; else atkHp = enemyHp;

      log.push({
        text: `${isCrit ? '💥 CRIT! ' : ''}${baseDmg} damage`,
        side: turn,
      });

      // Poison strike
      if (mySkills.poison_strike && Math.random() < mySkills.poison_strike.level * SKILLS.poison_strike.effect.poisonChance) {
        if (isAtk) defPoisoned = 3; else atkPoisoned = 3;
        log.push({ text: '🧪 Poisoned!', side: turn });
      }

      // Double strike
      if (mySkills.double_strike && Math.random() < mySkills.double_strike.level * SKILLS.double_strike.effect.doubleStrikeChance) {
        const extraDmg = Math.max(1, Math.floor(baseDmg * 0.6));
        enemyHp = isAtk ? defHp : atkHp;
        enemyHp -= extraDmg;
        if (isAtk) defHp = enemyHp; else atkHp = enemyHp;
        log.push({ text: `⚔️ Double Strike! ${extraDmg} extra`, side: turn });
      }

      // Counter attack
      if (enemyHp > 0 && theirSkills.counter_attack) {
        if (Math.random() < theirSkills.counter_attack.level * SKILLS.counter_attack.effect.counterChance) {
          const counterDmg = Math.max(1, Math.floor((isAtk ? defAtk : atkAtk) * 0.4));
          currentHp -= counterDmg;
          if (isAtk) atkHp = currentHp; else defHp = currentHp;
          log.push({ text: `🔄 Counter! ${counterDmg} damage`, side: turn === 'attacker' ? 'defender' : 'attacker' });
        }
      }
    }
  }

  const attackerWon = atkHp > defHp;
  return {
    winner: attackerWon ? 'attacker' : 'defender',
    attackerHp: Math.max(0, atkHp),
    defenderHp: Math.max(0, defHp),
    rounds: round,
    log: log.slice(-12), // Last 12 entries for display
    damageDealt: maxDefHp - Math.max(0, defHp),
    damageTaken: maxAtkHp - Math.max(0, atkHp),
  };
}

// ═══════════════════════════════════════════════
// PvE Combat
// ═══════════════════════════════════════════════

export function fightEnemy(playerId, enemyId) {
  const player = getPlayer(playerId);
  if (!player) return { success: false, error: 'No player' };

  const config = ENEMIES[enemyId];
  if (!config) return { success: false, error: 'Unknown enemy' };
  if (player.level < config.minLevel) return { success: false, error: `Requires level ${config.minLevel}` };

  const zoneCost = getZoneCost(config.zone);
  if (player.stamina < zoneCost) return { success: false, error: 'Not enough stamina' };

  const stats = getEffectiveStats(playerId);
  const skillMap = buildSkillMap(playerId);

  // Scale enemy to player level
  const scaleFactor = Math.pow(config.scaling, Math.max(0, player.level - config.minLevel));
  const enemy = {
    hp: Math.floor(config.baseHp * scaleFactor),
    maxHp: Math.floor(config.baseHp * scaleFactor),
    attack: Math.floor(config.baseAtk * scaleFactor),
    defense: Math.floor(config.baseDef * scaleFactor),
    speed: Math.floor(config.baseSpd * scaleFactor),
    strength: 0,
  };

  const result = simulateCombat(stats, enemy, skillMap, {});
  const won = result.winner === 'attacker';

  // Gold bonus from skill
  const goldSkill = skillMap.gold_digger;
  const goldMult = goldSkill ? 1 + goldSkill.level * SKILLS.gold_digger.effect.goldBonus : 1;

  const xp = won ? randInt(...config.xp) : Math.floor(randInt(...config.xp) * 0.25);
  const gold = won ? Math.floor(randInt(...config.gold) * goldMult) : 0;

  // Loot drop
  let lootItem = null;
  if (won) {
    lootItem = rollLoot(player.level, skillMap);
  }

  return transaction(() => {
    // Deduct stamina, update HP
    const newHp = won ? Math.max(1, Math.min(player.max_hp, result.attackerHp)) : Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayer(playerId, {
      stamina: player.stamina - zoneCost,
      hp: newHp,
      gold: player.gold + gold,
      wins: player.wins + (won ? 1 : 0),
      losses: player.losses + (won ? 0 : 1),
    });

    if (lootItem) {
      addEquipment(playerId, lootItem);
    }

    const xpResult = addXp(getPlayer(playerId), xp);

    // Log combat
    prepare(`
      INSERT INTO combat_log (player_id, opponent_type, opponent_name, won, damage_dealt, damage_taken, gold_earned, xp_earned, loot_item)
      VALUES (?, 'pve', ?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, config.name, won ? 1 : 0, result.damageDealt, result.damageTaken, gold, xp, lootItem);

    return {
      success: true, won, combat: result,
      enemy: config, gold, xp: xpResult.totalXp,
      lootItem: lootItem ? EQUIPMENT[lootItem] : null,
      leveled: xpResult.leveled, newLevel: xpResult.newLevel,
    };
  });
}

// ═══════════════════════════════════════════════
// Raid Boss
// ═══════════════════════════════════════════════

export function fightRaid(playerId, raidId) {
  const player = getPlayer(playerId);
  if (!player) return { success: false, error: 'No player' };

  const config = RAIDS[raidId];
  if (!config) return { success: false, error: 'Unknown raid' };
  if (player.level < config.minLevel) return { success: false, error: `Requires level ${config.minLevel}` };
  if (player.stamina < config.staminaCost) return { success: false, error: 'Not enough stamina' };

  const stats = getEffectiveStats(playerId);
  const skillMap = buildSkillMap(playerId);

  const boss = {
    hp: config.hp, maxHp: config.hp,
    attack: config.atk, defense: config.def,
    speed: config.spd, strength: 0,
  };

  const result = simulateCombat(stats, boss, skillMap, {});
  const won = result.winner === 'attacker';

  const goldSkill = skillMap.gold_digger;
  const goldMult = goldSkill ? 1 + goldSkill.level * SKILLS.gold_digger.effect.goldBonus : 1;

  const xp = won ? randInt(...config.rewards.xp) : Math.floor(randInt(...config.rewards.xp) * 0.2);
  const gold = won ? Math.floor(randInt(...config.rewards.gold) * goldMult) : 0;

  let lootItem = null;
  if (won && Math.random() < config.lootChance) {
    const lootSkill = skillMap.lucky_looter;
    const lootBonus = lootSkill ? lootSkill.level * 0.1 : 0;
    if (Math.random() < config.lootChance + lootBonus) {
      const idx = Math.floor(Math.random() * config.lootTable.length);
      lootItem = config.lootTable[idx];
    }
  }

  return transaction(() => {
    const newHp = won ? Math.max(1, result.attackerHp) : Math.max(1, Math.floor(player.max_hp * 0.1));
    updatePlayer(playerId, {
      stamina: player.stamina - config.staminaCost,
      hp: newHp,
      gold: player.gold + gold,
      raids_completed: player.raids_completed + (won ? 1 : 0),
      bosses_killed: player.bosses_killed + (won ? 1 : 0),
    });

    if (lootItem) addEquipment(playerId, lootItem);

    const xpResult = addXp(getPlayer(playerId), xp);

    prepare(`
      INSERT INTO combat_log (player_id, opponent_type, opponent_name, won, damage_dealt, damage_taken, gold_earned, xp_earned, loot_item)
      VALUES (?, 'raid', ?, ?, ?, ?, ?, ?, ?)
    `).run(playerId, config.name, won ? 1 : 0, result.damageDealt, result.damageTaken, gold, xp, lootItem);

    return {
      success: true, won, combat: result,
      boss: config, gold, xp: xpResult.totalXp,
      lootItem: lootItem ? EQUIPMENT[lootItem] : null,
      leveled: xpResult.leveled, newLevel: xpResult.newLevel,
    };
  });
}

// ═══════════════════════════════════════════════
// PvP Arena (My Brute style)
// ═══════════════════════════════════════════════

export function pvpFight(playerId) {
  const player = getPlayer(playerId);
  if (!player) return { success: false, error: 'No player' };
  if (player.stamina < ECONOMY.pvpStaminaCost) return { success: false, error: 'Not enough stamina' };

  // Find a random opponent close in level
  const opponents = prepare(`
    SELECT * FROM players WHERE id != ? AND level BETWEEN ? AND ?
    ORDER BY RANDOM() LIMIT 1
  `).all(playerId, Math.max(1, player.level - 3), player.level + 3);

  if (opponents.length === 0) {
    // Generate a bot opponent
    return fightPvpBot(player);
  }

  const opponent = opponents[0];
  const myStats = getEffectiveStats(playerId);
  const theirStats = getEffectiveStats(opponent.id);
  const mySkills = buildSkillMap(playerId);
  const theirSkills = buildSkillMap(opponent.id);

  const result = simulateCombat(myStats, theirStats, mySkills, theirSkills);
  const won = result.winner === 'attacker';

  const xp = won ? 30 + player.level * 5 : 10 + player.level * 2;
  const gold = won ? 20 + player.level * 10 : 0;

  return transaction(() => {
    updatePlayer(playerId, {
      stamina: player.stamina - ECONOMY.pvpStaminaCost,
      hp: Math.max(1, result.attackerHp),
      gold: player.gold + gold,
      pvp_wins: player.pvp_wins + (won ? 1 : 0),
      pvp_losses: player.pvp_losses + (won ? 0 : 1),
    });

    const xpResult = addXp(getPlayer(playerId), xp);

    prepare(`
      INSERT INTO combat_log (player_id, opponent_type, opponent_name, won, damage_dealt, damage_taken, gold_earned, xp_earned)
      VALUES (?, 'pvp', ?, ?, ?, ?, ?, ?)
    `).run(playerId, opponent.username, won ? 1 : 0, result.damageDealt, result.damageTaken, gold, xp);

    return {
      success: true, won, combat: result,
      opponent: { name: opponent.username, level: opponent.level },
      gold, xp: xpResult.totalXp,
      leveled: xpResult.leveled, newLevel: xpResult.newLevel,
    };
  });
}

function fightPvpBot(player) {
  const botLevel = Math.max(1, player.level + randInt(-2, 2));
  const botStats = {
    hp: 80 + botLevel * 12,
    maxHp: 80 + botLevel * 12,
    attack: 6 + botLevel * 2,
    defense: 3 + botLevel * 1,
    speed: 4 + botLevel * 1,
    strength: 4 + botLevel * 1,
  };

  const myStats = getEffectiveStats(player.id);
  const mySkills = buildSkillMap(player.id);

  const result = simulateCombat(myStats, botStats, mySkills, {});
  const won = result.winner === 'attacker';
  const xp = won ? 25 + player.level * 4 : 8 + player.level * 2;
  const gold = won ? 15 + player.level * 8 : 0;

  const botName = ['ShadowBot', 'IronFist_AI', 'NPC_Warrior', 'AutoBrute', 'SteelNerve'][randInt(0, 4)];

  return transaction(() => {
    updatePlayer(player.id, {
      stamina: player.stamina - ECONOMY.pvpStaminaCost,
      hp: Math.max(1, result.attackerHp),
      gold: player.gold + gold,
      pvp_wins: player.pvp_wins + (won ? 1 : 0),
      pvp_losses: player.pvp_losses + (won ? 0 : 1),
    });

    const xpResult = addXp(getPlayer(player.id), xp);

    return {
      success: true, won, combat: result,
      opponent: { name: `${botName} (Lv.${botLevel})`, level: botLevel },
      gold, xp: xpResult.totalXp,
      leveled: xpResult.leveled, newLevel: xpResult.newLevel,
    };
  });
}

// ═══════════════════════════════════════════════
// Loot Drop System
// ═══════════════════════════════════════════════

function rollLoot(playerLevel, skillMap) {
  // 30% base drop chance
  const lootSkill = skillMap.lucky_looter;
  const dropChance = 0.30 + (lootSkill ? lootSkill.level * 0.05 : 0);
  if (Math.random() > dropChance) return null;

  // Roll rarity
  const lootBonus = lootSkill ? lootSkill.level : 0;
  const rarity = rollRarity(lootBonus);

  // Find items matching rarity and near player level
  const candidates = Object.entries(EQUIPMENT).filter(([_, item]) =>
    item.rarity === rarity && item.dropLevel <= playerLevel + 2
  );

  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)][0];
}

function rollRarity(bonus) {
  const weights = { ...Object.fromEntries(Object.entries(RARITIES).map(([k, v]) => [k, v.weight])) };
  // Bonus shifts weight toward higher rarities
  if (bonus > 0) {
    weights.common = Math.max(10, weights.common - bonus * 10);
    weights.uncommon += bonus * 3;
    weights.rare += bonus * 2;
    weights.epic += bonus;
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (const [rarity, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  return 'common';
}

// ═══════════════════════════════════════════════
// Healing
// ═══════════════════════════════════════════════

export function healPlayer(playerId) {
  const player = getPlayer(playerId);
  if (player.hp >= player.max_hp) return { success: false, error: 'Already at full HP' };
  const cost = Math.floor((player.max_hp - player.hp) * ECONOMY.healCostPerHp);
  if (player.gold < cost) return { success: false, error: `Need ${cost} gold to heal` };
  updatePlayer(playerId, { gold: player.gold - cost, hp: player.max_hp });
  return { success: true, cost, healed: player.max_hp - player.hp };
}

// ═══════════════════════════════════════════════
// Networth
// ═══════════════════════════════════════════════

export function calculateNetworth(player) {
  const equipment = getPlayerEquipment(player.id);
  let equipValue = 0;
  for (const eq of equipment) {
    const config = EQUIPMENT[eq.item_id];
    if (config) equipValue += config.sellValue;
  }

  const networth = Math.floor(
    player.gold * ECONOMY.networthMultipliers.gold +
    equipValue * ECONOMY.networthMultipliers.equipmentValue +
    player.level * ECONOMY.networthMultipliers.levelValue
  );

  updatePlayer(player.id, {
    networth,
    peak_networth: Math.max(networth, player.peak_networth),
  });
  return networth;
}

// ═══════════════════════════════════════════════
// Leaderboard
// ═══════════════════════════════════════════════

export function getLeaderboard(limit = 10) {
  return prepare('SELECT id, username, networth, level, pvp_wins FROM players ORDER BY networth DESC LIMIT ?').all(limit);
}

// ═══════════════════════════════════════════════
// Combat Log
// ═══════════════════════════════════════════════

export function getRecentCombatLog(playerId, limit = 5) {
  return prepare('SELECT * FROM combat_log WHERE player_id = ? ORDER BY timestamp DESC LIMIT ?').all(playerId, limit);
}

// ═══════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getZoneCost(zone) {
  const zones = { streets: 1, underground: 2, warzone: 3, dragons_lair: 4 };
  return zones[zone] || 1;
}
