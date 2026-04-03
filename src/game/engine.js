import * as P from '../core/player.js';
import { EQUIPMENT, SKILLS } from '../core/config.js';
import { renderDashboard } from '../rendering/views/dashboard.js';
import { renderFight } from '../rendering/views/fight.js';
import { renderRaids } from '../rendering/views/raids.js';
import { renderInventory } from '../rendering/views/inventory.js';
import { renderSkills } from '../rendering/views/skills.js';
import { renderProfile } from '../rendering/views/profile.js';

const equipCfgs = pid => P.getEquipped(pid).map(e => EQUIPMENT[e.item_id]).filter(Boolean);
const skillCfgs = pid => P.getSkills(pid).map(s => { const c = SKILLS[s.skill_id]; return c ? { ...c, level: s.level, id: s.skill_id } : null; }).filter(Boolean);
const rank = pid => { const i = P.getLeaderboard(100).findIndex(e => e.id === pid); return i >= 0 ? i + 1 : 99; };

export function renderView(pid, view, extra) {
  const p = P.get(pid); if (!p) return null;
  P.regenStamina(p); P.calcNetworth(P.get(pid));
  const pl = P.get(pid);
  const V = { dashboard: () => renderDashboard(pl, equipCfgs(pid), skillCfgs(pid), P.getLog(pid), P.getLeaderboard()),
    fight: () => renderFight(pl, extra), raids: () => renderRaids(pl, extra),
    inventory: () => renderInventory(pl, P.getEquip(pid), P.getEquipped(pid)),
    skills: () => renderSkills(pl, skillCfgs(pid), P.getOffers(pid)),
    profile: () => renderProfile(pl, P.getEquip(pid), skillCfgs(pid), rank(pid)) };
  return (V[view] || V.dashboard)();
}

export function handleAction(pid, action, args = {}) {
  const p = P.get(pid); if (!p) return { success: false, message: 'No player' };
  P.regenStamina(p);
  const fmtResult = (r, type, name) => {
    if (!r.success) return r;
    let m = r.won ? `⚔️ Beat ${name}! +${r.gold}g +${r.xp}xp` : `💀 Lost to ${name}. +${r.xp}xp`;
    if (r.lootItem) m += ` 🎁 ${r.lootItem.icon} ${r.lootItem.name}!`;
    if (r.leveled) m += ` 🎉 Level ${r.newLevel}!`;
    return { success: true, message: m, view: type === 'raid' ? 'raids' : 'fight', extra: r };
  };
  switch (action) {
    case 'fight_enemy': { const r = P.fightEnemy(pid, args.enemyId); return fmtResult(r, 'pve', r.success ? (r.won ? args.enemyId : args.enemyId) : ''); }
    case 'pvp': { const r = P.pvpFight(pid); return fmtResult(r, 'pvp', r.opponent?.name || '?'); }
    case 'raid': { const r = P.fightRaid(pid, args.raidId); return fmtResult(r, 'raid', r.boss?.name || '?'); }
    case 'equip': { const r = P.equipItem(pid, args.itemRowId); return r.success ? { success: true, message: `Equipped ${r.item.icon} ${r.item.name}`, view: 'inventory' } : r; }
    case 'sell': { const r = P.sellItem(pid, args.itemRowId); return r.success ? { success: true, message: `Sold ${r.item.icon} ${r.item.name} for ${r.gold}g`, view: 'inventory' } : r; }
    case 'pick_skill': { const r = P.pickSkill(pid, args.skillId); return r.success ? { success: true, message: `${r.skill.icon} ${r.skill.name} ${r.newLevel > 1 ? `→ Lv.${r.newLevel}` : 'learned'}!`, view: 'skills' } : r; }
    case 'heal': { const r = P.heal(pid); return r.success ? { success: true, message: `Healed ${r.healed} HP (-${r.cost}g)`, view: 'fight' } : r; }
    default: return { success: false, message: 'Unknown' };
  }
}
