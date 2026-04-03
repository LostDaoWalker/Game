import * as Player from '../core/player.js';
import { MISSIONS, UPGRADES, BUSINESSES } from '../core/config.js';
import { renderDashboard } from '../rendering/views/dashboard.js';
import { renderBusiness } from '../rendering/views/business.js';
import { renderMissions } from '../rendering/views/missions.js';
import { renderMarket } from '../rendering/views/market.js';
import { renderUpgrades } from '../rendering/views/upgrades.js';
import { renderProfile } from '../rendering/views/profile.js';

// Price history for chart
const priceHistory = new Map(); // playerId -> number[]
const MAX_HISTORY = 30;

function getPriceHistory() {
  const price = Player.getCryptoPrice();
  return price;
}

function trackPrice(key) {
  if (!priceHistory.has(key)) priceHistory.set(key, []);
  const history = priceHistory.get(key);
  history.push(Player.getCryptoPrice());
  if (history.length > MAX_HISTORY) history.shift();
  return history;
}

// ─── View Renderer ──────────────────────────────

export function renderView(playerId, view) {
  const player = Player.getPlayer(playerId);
  if (!player) return null;

  // Auto-regen energy
  Player.regenEnergy(player);
  // Auto-collect income
  Player.collectIncome(playerId);
  // Recalc networth
  Player.calculateNetworth(player);

  // Re-fetch after updates
  const updatedPlayer = Player.getPlayer(playerId);
  const businesses = Player.getPlayerBusinesses(playerId);
  const activeMissions = Player.getActiveMissions(playerId);
  const inventory = Player.getInventory(playerId);
  const cryptoPrice = Player.getCryptoPrice();
  const history = trackPrice('global');
  const leaderboard = Player.getLeaderboard(10);

  // Find player rank
  let rank = leaderboard.findIndex(e => e.id === playerId) + 1;
  if (rank === 0) rank = 99;

  switch (view) {
    case 'dashboard':
      return renderDashboard(updatedPlayer, businesses, activeMissions, cryptoPrice, leaderboard);
    case 'business':
      return renderBusiness(updatedPlayer, businesses);
    case 'missions':
      return renderMissions(updatedPlayer, activeMissions);
    case 'market':
      return renderMarket(updatedPlayer, cryptoPrice, history);
    case 'upgrades':
      return renderUpgrades(updatedPlayer, inventory);
    case 'profile':
      return renderProfile(updatedPlayer, businesses, inventory, rank);
    default:
      return renderDashboard(updatedPlayer, businesses, activeMissions, cryptoPrice, leaderboard);
  }
}

// ─── Game Actions ───────────────────────────────

export function handleAction(playerId, action, args = {}) {
  const player = Player.getPlayer(playerId);
  if (!player) return { success: false, message: 'Player not found' };

  Player.regenEnergy(player);

  switch (action) {
    case 'buy_business': {
      const type = args.type;
      if (!BUSINESSES[type]) return { success: false, message: 'Unknown business type' };
      const result = Player.buyBusiness(playerId, type);
      if (result.success) {
        Player.addXp(Player.getPlayer(playerId), 20 + result.newLevel * 5);
        return {
          success: true,
          message: `${BUSINESSES[type].icon} ${BUSINESSES[type].name} upgraded to Lv.${result.newLevel}! (-₡${result.cost})`,
        };
      }
      return { success: false, message: result.error };
    }

    case 'start_mission': {
      const missionId = args.missionId;
      const config = MISSIONS[missionId];
      if (!config) return { success: false, message: 'Unknown mission' };
      if (player.level < config.minLevel) return { success: false, message: `Requires level ${config.minLevel}` };
      if (player.energy < config.energyCost) return { success: false, message: 'Not enough energy' };

      // Check if already active
      const active = Player.getActiveMissions(playerId);
      const existing = active.find(m => m.mission_id === missionId && !m.completed);
      if (existing) {
        const now = Math.floor(Date.now() / 1000);
        if (existing.completes_at > now) {
          return { success: false, message: 'Mission already in progress' };
        }
      }

      Player.updatePlayer(playerId, { energy: player.energy - config.energyCost });
      Player.startMission(playerId, missionId, config.duration);
      return {
        success: true,
        message: `${config.icon} ${config.name} started! Completes in ${formatDuration(config.duration)}`,
      };
    }

    case 'claim_mission': {
      const missionId = args.missionId;
      const config = MISSIONS[missionId];
      if (!config) return { success: false, message: 'Unknown mission' };

      const active = Player.getActiveMissions(playerId);
      const mission = active.find(m => m.mission_id === missionId);
      if (!mission) return { success: false, message: 'No active mission found' };

      const now = Math.floor(Date.now() / 1000);
      if (mission.completes_at > now) {
        return { success: false, message: 'Mission not complete yet' };
      }

      const [minCr, maxCr] = config.rewards.credits;
      const [minXp, maxXp] = config.rewards.xp;
      const credits = randInt(minCr, maxCr);
      const xp = randInt(minXp, maxXp);

      Player.completeMission(playerId, missionId);
      const updatedPlayer = Player.getPlayer(playerId);
      Player.updatePlayer(playerId, {
        credits: updatedPlayer.credits + credits,
        reputation: updatedPlayer.reputation + Math.floor(xp / 10),
      });
      const levelResult = Player.addXp(Player.getPlayer(playerId), xp);

      let msg = `${config.icon} Mission complete! +₡${credits} +${levelResult.totalXp}XP`;
      if (levelResult.leveled) msg += ` 🎉 LEVEL UP → ${levelResult.newLevel}!`;
      return { success: true, message: msg };
    }

    case 'buy_crypto': {
      const amount = args.amount || 1;
      const result = Player.buyCrypto(playerId, amount);
      if (result.success) {
        return { success: true, message: `Bought ${amount}x crypto at ₡${result.price}/unit (-₡${result.cost})` };
      }
      return { success: false, message: result.error };
    }

    case 'sell_crypto': {
      const amount = args.amount || 1;
      const result = Player.sellCrypto(playerId, amount);
      if (result.success) {
        return { success: true, message: `Sold ${amount}x crypto at ₡${result.price}/unit (+₡${result.revenue})` };
      }
      return { success: false, message: result.error };
    }

    case 'buy_upgrade': {
      const upgradeId = args.upgradeId;
      const config = UPGRADES[upgradeId];
      if (!config) return { success: false, message: 'Unknown upgrade' };

      const existing = Player.getInventoryItem(playerId, upgradeId);
      const owned = existing ? existing.quantity : 0;
      if (owned >= config.maxOwned) return { success: false, message: 'Max augmentations reached' };
      if (player.credits < config.cost) return { success: false, message: 'Not enough credits' };

      Player.updatePlayer(playerId, { credits: player.credits - config.cost });
      Player.addInventoryItem(playerId, 'upgrade', upgradeId);

      // Apply stat effects
      const effects = config.effects;
      const p = Player.getPlayer(playerId);
      const updates = {};
      if (effects.attack) updates.attack = p.attack + effects.attack;
      if (effects.defense) updates.defense = p.defense + effects.defense;
      if (effects.max_hp) { updates.max_hp = p.max_hp + effects.max_hp; updates.hp = p.hp + effects.max_hp; }
      if (effects.max_energy) updates.max_energy = p.max_energy + effects.max_energy;
      if (Object.keys(updates).length > 0) Player.updatePlayer(playerId, updates);

      Player.addXp(Player.getPlayer(playerId), 30);

      return {
        success: true,
        message: `${config.icon} ${config.name} installed! ${config.description}`,
      };
    }

    case 'collect_income': {
      const income = Player.collectIncome(playerId);
      if (income > 0) {
        return { success: true, message: `Collected +₡${income} from operations` };
      }
      return { success: false, message: 'No income to collect yet' };
    }

    case 'heal': {
      if (player.hp >= player.max_hp) return { success: false, message: 'Already at full HP' };
      const cost = Math.floor((player.max_hp - player.hp) * 2);
      if (player.credits < cost) return { success: false, message: 'Not enough credits' };
      Player.updatePlayer(playerId, { credits: player.credits - cost, hp: player.max_hp });
      return { success: true, message: `Healed to full HP (-₡${cost})` };
    }

    default:
      return { success: false, message: 'Unknown action' };
  }
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
