import * as P from '../core/player.js';
import { EQUIPMENT, SKILLS } from '../core/config.js';
import { renderDashboard } from '../rendering/views/dashboard.js';
import { renderFight } from '../rendering/views/fight.js';
import { renderRaids } from '../rendering/views/raids.js';
import { renderInventory } from '../rendering/views/inventory.js';
import { renderSkills } from '../rendering/views/skills.js';
import { renderProfile } from '../rendering/views/profile.js';

// ═══════════════════════════════════════════════
// View Renderer — refreshes state then delegates
// ═══════════════════════════════════════════════

export function renderView(playerId, view, extra = null) {
  const player = P.getPlayer(playerId);
  if (!player) return null;

  P.regenStamina(player);
  P.calculateNetworth(P.getPlayer(playerId));
  const p = P.getPlayer(playerId); // re-fetch after updates

  switch (view) {
    case 'dashboard': return renderDashboard(p, getEquippedConfigs(playerId), getSkillConfigs(playerId), P.getRecentCombatLog(playerId), P.getLeaderboard());
    case 'fight':     return renderFight(p, extra);
    case 'raids':     return renderRaids(p, extra);
    case 'inventory': return renderInventory(p, P.getPlayerEquipment(playerId), P.getEquippedItems(playerId));
    case 'skills':    return renderSkills(p, getSkillConfigs(playerId), P.getSkillOffers(playerId));
    case 'profile':   return renderProfile(p, P.getPlayerEquipment(playerId), getSkillConfigs(playerId), getPlayerRank(playerId));
    default:          return renderDashboard(p, getEquippedConfigs(playerId), getSkillConfigs(playerId), P.getRecentCombatLog(playerId), P.getLeaderboard());
  }
}

// ═══════════════════════════════════════════════
// Action Handler — processes game actions, returns { success, message, view?, extra? }
// ═══════════════════════════════════════════════

export function handleAction(playerId, action, args = {}) {
  const player = P.getPlayer(playerId);
  if (!player) return { success: false, message: 'Player not found' };
  P.regenStamina(player);

  switch (action) {
    case 'fight_enemy': {
      const result = P.fightEnemy(playerId, args.enemyId);
      if (!result.success) return result;
      let msg = result.won
        ? `⚔️ Defeated ${result.enemy.name}! +${result.gold}g +${result.xp}xp`
        : `💀 Defeated by ${result.enemy.name}. +${result.xp}xp`;
      if (result.lootItem) msg += ` 🎁 ${result.lootItem.icon} ${result.lootItem.name}!`;
      if (result.leveled) msg += ` 🎉 Level ${result.newLevel}!`;
      return { success: true, message: msg, view: 'fight', extra: result };
    }

    case 'pvp': {
      const result = P.pvpFight(playerId);
      if (!result.success) return result;
      let msg = result.won
        ? `⚔️ Beat ${result.opponent.name}! +${result.gold}g +${result.xp}xp`
        : `💀 Lost to ${result.opponent.name}. +${result.xp}xp`;
      if (result.leveled) msg += ` 🎉 Level ${result.newLevel}!`;
      return { success: true, message: msg, view: 'fight', extra: result };
    }

    case 'raid': {
      const result = P.fightRaid(playerId, args.raidId);
      if (!result.success) return result;
      let msg = result.won
        ? `👑 Slew ${result.boss.name}! +${result.gold}g +${result.xp}xp`
        : `💀 ${result.boss.name} was too strong. +${result.xp}xp`;
      if (result.lootItem) msg += ` 🎁 ${result.lootItem.icon} ${result.lootItem.name}!`;
      if (result.leveled) msg += ` 🎉 Level ${result.newLevel}!`;
      return { success: true, message: msg, view: 'raids', extra: result };
    }

    case 'equip': {
      const result = P.equipItem(playerId, args.itemRowId);
      if (!result.success) return result;
      return { success: true, message: `Equipped ${result.item.icon} ${result.item.name}`, view: 'inventory' };
    }

    case 'sell': {
      const result = P.sellItem(playerId, args.itemRowId);
      if (!result.success) return result;
      return { success: true, message: `Sold ${result.item.icon} ${result.item.name} for ${result.gold}g`, view: 'inventory' };
    }

    case 'pick_skill': {
      const result = P.pickSkill(playerId, args.skillId);
      if (!result.success) return result;
      return {
        success: true,
        message: `${result.skill.icon} ${result.skill.name} ${result.newLevel > 1 ? `upgraded to Lv.${result.newLevel}` : 'learned'}!`,
        view: 'skills',
      };
    }

    case 'heal': {
      const result = P.healPlayer(playerId);
      if (!result.success) return result;
      return { success: true, message: `Healed ${result.healed} HP (-${result.cost}g)`, view: 'fight' };
    }

    default:
      return { success: false, message: 'Unknown action' };
  }
}

// ═══════════════════════════════════════════════
// Helpers — maps DB rows to config objects for views
// ═══════════════════════════════════════════════

function getEquippedConfigs(playerId) {
  return P.getEquippedItems(playerId).map(e => EQUIPMENT[e.item_id]).filter(Boolean);
}

function getSkillConfigs(playerId) {
  return P.getPlayerSkills(playerId).map(s => {
    const cfg = SKILLS[s.skill_id];
    return cfg ? { ...cfg, level: s.level, id: s.skill_id } : null;
  }).filter(Boolean);
}

function getPlayerRank(playerId) {
  const lb = P.getLeaderboard(100);
  const idx = lb.findIndex(e => e.id === playerId);
  return idx >= 0 ? idx + 1 : 99;
}
