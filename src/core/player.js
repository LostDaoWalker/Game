import { prepare, transaction } from './database.js';
import { LEVEL_CONFIG, ECONOMY, BUSINESSES } from './config.js';

// ─── Player CRUD ────────────────────────────────

export function getPlayer(id) {
  return prepare('SELECT * FROM players WHERE id = ?').get(id);
}

export function createPlayer(id, username) {
  prepare(`
    INSERT OR IGNORE INTO players (id, username)
    VALUES (?, ?)
  `).run(id, username);
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

// ─── Energy System ──────────────────────────────

export function regenEnergy(player) {
  const now = Math.floor(Date.now() / 1000);
  const elapsed = now - player.energy_regen_at;
  const regenAmount = Math.floor(elapsed / ECONOMY.energyRegenRate);
  if (regenAmount > 0 && player.energy < player.max_energy) {
    const newEnergy = Math.min(player.max_energy, player.energy + regenAmount);
    const newRegenAt = player.energy_regen_at + (regenAmount * ECONOMY.energyRegenRate);
    updatePlayer(player.id, { energy: newEnergy, energy_regen_at: newRegenAt });
    player.energy = newEnergy;
    player.energy_regen_at = newRegenAt;
  }
  return player;
}

// ─── XP / Leveling ─────────────────────────────

export function addXp(player, amount) {
  // Check for XP bonus from upgrades
  const xpChips = getInventoryItem(player.id, 'xp_chip');
  const bonus = xpChips ? xpChips.quantity * 10 : 0;
  const totalXp = Math.floor(amount * (1 + bonus / 100));

  let xp = player.xp + totalXp;
  let level = player.level;
  let xpNeeded = player.xp_needed;
  let hp = player.max_hp;
  let attack = player.attack;
  let defense = player.defense;
  let leveled = false;

  while (xp >= xpNeeded) {
    xp -= xpNeeded;
    level++;
    xpNeeded = Math.floor(LEVEL_CONFIG.xpBase * Math.pow(LEVEL_CONFIG.xpMultiplier, level - 1));
    hp += LEVEL_CONFIG.hpPerLevel;
    attack += LEVEL_CONFIG.attackPerLevel;
    defense += LEVEL_CONFIG.defensePerLevel;
    leveled = true;
  }

  updatePlayer(player.id, {
    xp, level, xp_needed: xpNeeded,
    max_hp: hp, hp, attack, defense,
  });

  return { totalXp, leveled, newLevel: level };
}

// ─── Networth Calculation ───────────────────────

export function calculateNetworth(player) {
  const businesses = getPlayerBusinesses(player.id);
  let bizValue = 0;
  for (const biz of businesses) {
    const config = BUSINESSES[biz.type];
    if (!config) continue;
    let totalSpent = 0;
    for (let i = 0; i < biz.level; i++) {
      totalSpent += Math.floor(config.baseCost * Math.pow(config.costMultiplier, i));
    }
    bizValue += totalSpent * ECONOMY.networthMultipliers.businessValue;
  }

  const cryptoPrice = getCryptoPrice();
  const networth = Math.floor(
    player.credits * ECONOMY.networthMultipliers.credits +
    player.crypto * cryptoPrice * ECONOMY.networthMultipliers.crypto +
    bizValue
  );

  updatePlayer(player.id, {
    networth,
    peak_networth: Math.max(networth, player.peak_networth),
  });

  return networth;
}

// ─── Businesses ─────────────────────────────────

export function getPlayerBusinesses(playerId) {
  return prepare('SELECT * FROM businesses WHERE player_id = ?').all(playerId);
}

export function getBusiness(playerId, type) {
  return prepare('SELECT * FROM businesses WHERE player_id = ? AND type = ?').get(playerId, type);
}

export function buyBusiness(playerId, type) {
  const config = BUSINESSES[type];
  if (!config) return { success: false, error: 'Unknown business' };

  const player = getPlayer(playerId);
  const existing = getBusiness(playerId, type);
  const level = existing ? existing.level : 0;

  if (level >= config.maxLevel) return { success: false, error: 'Max level reached' };

  const cost = Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
  if (player.credits < cost) return { success: false, error: 'Not enough credits' };

  const income = Math.floor(config.baseIncome * Math.pow(config.incomeMultiplier, level));

  return transaction(() => {
    updatePlayer(playerId, { credits: player.credits - cost });

    if (existing) {
      prepare(`
        UPDATE businesses SET level = level + 1, income_rate = ?
        WHERE player_id = ? AND type = ?
      `).run(income, playerId, type);
    } else {
      prepare(`
        INSERT INTO businesses (player_id, type, level, income_rate)
        VALUES (?, ?, 1, ?)
      `).run(playerId, type, income);
    }

    return { success: true, cost, newLevel: level + 1, income };
  });
}

export function collectIncome(playerId) {
  const now = Math.floor(Date.now() / 1000);
  const businesses = getPlayerBusinesses(playerId);
  let totalIncome = 0;

  return transaction(() => {
    for (const biz of businesses) {
      const elapsed = now - biz.last_collected;
      const earned = Math.floor(biz.income_rate * (elapsed / 60)); // income per minute
      if (earned > 0) {
        totalIncome += earned;
        prepare('UPDATE businesses SET last_collected = ? WHERE id = ?').run(now, biz.id);
      }
    }

    if (totalIncome > 0) {
      const player = getPlayer(playerId);
      updatePlayer(playerId, { credits: player.credits + totalIncome });
    }

    return totalIncome;
  });
}

// ─── Inventory ──────────────────────────────────

export function getInventory(playerId) {
  return prepare('SELECT * FROM inventory WHERE player_id = ?').all(playerId);
}

export function getInventoryItem(playerId, itemId) {
  return prepare('SELECT * FROM inventory WHERE player_id = ? AND item_id = ?').get(playerId, itemId);
}

export function addInventoryItem(playerId, itemType, itemId, quantity = 1) {
  prepare(`
    INSERT INTO inventory (player_id, item_type, item_id, quantity)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(player_id, item_id) DO UPDATE SET quantity = quantity + ?
  `).run(playerId, itemType, itemId, quantity, quantity);
}

// ─── Missions ───────────────────────────────────

export function getActiveMissions(playerId) {
  return prepare(`
    SELECT * FROM missions WHERE player_id = ? AND completed = 0
  `).all(playerId);
}

export function startMission(playerId, missionId, duration) {
  const now = Math.floor(Date.now() / 1000);
  prepare(`
    INSERT OR REPLACE INTO missions (player_id, mission_id, started_at, completes_at, completed)
    VALUES (?, ?, ?, ?, 0)
  `).run(playerId, missionId, now, now + duration);
}

export function completeMission(playerId, missionId) {
  prepare('UPDATE missions SET completed = 1 WHERE player_id = ? AND mission_id = ?').run(playerId, missionId);
}

// ─── Crypto Market ──────────────────────────────

let cryptoPrice = ECONOMY.cryptoBasePrice;
let lastPriceUpdate = 0;

export function getCryptoPrice() {
  const now = Math.floor(Date.now() / 1000);
  if (now - lastPriceUpdate > 30) {
    const change = (Math.random() - 0.48) * ECONOMY.cryptoVolatility * cryptoPrice;
    cryptoPrice = Math.max(10, Math.floor(cryptoPrice + change));
    lastPriceUpdate = now;
  }
  return cryptoPrice;
}

export function buyCrypto(playerId, amount) {
  const player = getPlayer(playerId);
  const price = getCryptoPrice();
  const cost = amount * price;
  if (player.credits < cost) return { success: false, error: 'Not enough credits' };

  return transaction(() => {
    updatePlayer(playerId, {
      credits: player.credits - cost,
      crypto: player.crypto + amount,
    });
    prepare(`
      INSERT INTO market_history (player_id, action, amount, price)
      VALUES (?, 'buy', ?, ?)
    `).run(playerId, amount, price);
    return { success: true, cost, price };
  });
}

export function sellCrypto(playerId, amount) {
  const player = getPlayer(playerId);
  if (player.crypto < amount) return { success: false, error: 'Not enough crypto' };

  const price = getCryptoPrice();
  const revenue = amount * price;

  return transaction(() => {
    updatePlayer(playerId, {
      credits: player.credits + revenue,
      crypto: player.crypto - amount,
    });
    prepare(`
      INSERT INTO market_history (player_id, action, amount, price)
      VALUES (?, 'sell', ?, ?)
    `).run(playerId, amount, price);
    return { success: true, revenue, price };
  });
}

// ─── Leaderboard ────────────────────────────────

export function getLeaderboard(limit = 10) {
  return prepare(`
    SELECT id, username, networth, level FROM players
    ORDER BY networth DESC LIMIT ?
  `).all(limit);
}
