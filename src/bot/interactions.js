import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import * as P from '../core/player.js';
import { ENEMIES, RAIDS, ZONES, SKILLS, EQUIPMENT, TABS } from '../core/config.js';
import { renderDashboard } from '../rendering/views/dashboard.js';
import { renderFight } from '../rendering/views/fight.js';
import { renderRaids } from '../rendering/views/raids.js';
import { renderInventory } from '../rendering/views/inventory.js';
import { renderSkills } from '../rendering/views/skills.js';
import { renderProfile } from '../rendering/views/profile.js';

const activeView = new Map();

// ── Derived data — computed once per render, not per view ──
const enrichEquip = pid => P.getEquipped(pid).map(e => EQUIPMENT[e.item_id]).filter(Boolean);
const enrichSkills = pid => P.getSkills(pid).map(s => { const c = SKILLS[s.skill_id]; return c ? { ...c, level: s.level, id: s.skill_id } : null; }).filter(Boolean);

function renderView(pid, view, extra) {
  P.regenStamina(P.get(pid));
  P.calcNetworth(pid);
  // Single fresh read after all mutations
  const p = P.get(pid);
  if (!p) return null;
  const V = {
    dashboard: () => renderDashboard(p, enrichEquip(pid), enrichSkills(pid), P.getLog(pid), P.getLeaderboard()),
    fight: () => renderFight(p, extra),
    raids: () => renderRaids(p, extra),
    inventory: () => renderInventory(p, P.getEquip(pid), P.getEquipped(pid)),
    skills: () => renderSkills(p, enrichSkills(pid), P.getOffers(pid)),
    profile: () => renderProfile(p, P.getEquip(pid), enrichSkills(pid), playerRank(pid)),
  };
  return (V[view] || V.dashboard)();
}

function playerRank(pid) {
  const idx = P.getLeaderboard(100).findIndex(e => e.id === pid);
  return idx >= 0 ? idx + 1 : 99;
}

function doAction(pid, action, args = {}) {
  P.regenStamina(P.get(pid));
  const fmtCombat = (r, view) => {
    if (!r.success) return r;
    const name = r.foe.name;
    let m = r.won ? `⚔️ Beat ${name}! +${r.gold}g +${r.xp}xp` : `💀 Lost to ${name}. +${r.xp}xp`;
    if (r.lootItem) m += ` 🎁 ${r.lootItem.icon} ${r.lootItem.name}!`;
    if (r.leveled) m += ` 🎉 Level ${r.newLevel}!`;
    return { success: true, message: m, view, extra: r };
  };
  switch (action) {
    case 'fight_enemy': return fmtCombat(P.fightEnemy(pid, args.enemyId), 'fight');
    case 'pvp': return fmtCombat(P.pvpFight(pid), 'fight');
    case 'raid': return fmtCombat(P.fightRaid(pid, args.raidId), 'raids');
    case 'equip': { const r = P.equipItem(pid, args.itemRowId); return r.success ? { success: true, message: `Equipped ${r.item.icon} ${r.item.name}`, view: 'inventory' } : r; }
    case 'sell': { const r = P.sellItem(pid, args.itemRowId); return r.success ? { success: true, message: `Sold ${r.item.icon} ${r.item.name} for ${r.gold}g`, view: 'inventory' } : r; }
    case 'pick_skill': { const r = P.pickSkill(pid, args.skillId); return r.success ? { success: true, message: `${r.skill.icon} ${r.skill.name} ${r.newLevel > 1 ? `→ Lv.${r.newLevel}` : 'learned'}!`, view: 'skills' } : r; }
    case 'heal': { const r = P.heal(pid); return r.success ? { success: true, message: `Healed ${r.healed} HP (-${r.cost}g)`, view: 'fight' } : r; }
    default: return { success: false, message: 'Unknown action' };
  }
}

// ── Discord Handlers ──

function selectMenu(id, placeholder, opts) {
  if (!opts.length) opts = [{ label: 'Nothing available', description: '-', value: 'none' }];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(opts.slice(0, 25)));
}

async function send(i, pid, view, extra, isReply) {
  const payload = { files: [new AttachmentBuilder(renderView(pid, view, extra), { name: 'nexus.png' })], components: buildUI(view, pid), content: '' };
  isReply ? await i.reply(payload) : await i.update(payload);
}

async function sendResult(i, pid, r, fallbackView) {
  const v = r.view || fallbackView || activeView.get(pid) || 'dashboard';
  activeView.set(pid, v);
  await i.update({
    content: r.success ? `✅ ${r.message}` : `❌ ${r.message}`,
    files: [new AttachmentBuilder(renderView(pid, v, r.extra || null), { name: 'nexus.png' })],
    components: buildUI(v, pid),
  });
}

export async function handleNexusCommand(i) {
  P.getOrCreate(i.user.id, i.user.username);
  activeView.set(i.user.id, 'dashboard');
  await send(i, i.user.id, 'dashboard', null, true);
}

export async function handleButton(i) {
  const pid = i.user.id;
  if (!P.get(pid)) return i.reply({ content: '❌ Use `/nexus`', ephemeral: true });
  const [action, ...args] = i.customId.split(':');
  if (action === 'nav') { activeView.set(pid, args[0]); return send(i, pid, args[0]); }
  if (action === 'refresh') return send(i, pid, activeView.get(pid) || 'dashboard');
  // Route combat buttons directly
  const actionMap = { pvp: 'pvp', heal: 'heal' };
  return sendResult(i, pid, doAction(pid, actionMap[action] || action, {}));
}

export async function handleSelectMenu(i) {
  const pid = i.user.id, [menu] = i.customId.split(':'), val = i.values[0];
  if (!P.get(pid)) return i.reply({ content: '❌ Use `/nexus`', ephemeral: true });
  const menuActions = {
    fight_select: ['fight_enemy', { enemyId: val }],
    raid_select: ['raid', { raidId: val }],
    equip: ['equip', { itemRowId: +val }],
    sell: ['sell', { itemRowId: +val }],
    pick_skill: ['pick_skill', { skillId: val }],
  };
  const [action, args] = menuActions[menu] || ['unknown', {}];
  const fallback = { equip: 'inventory', sell: 'inventory', pick_skill: 'skills' }[menu];
  return sendResult(i, pid, doAction(pid, action, args), fallback);
}

// ── UI Builder ──

function buildUI(view, pid) {
  const rows = [
    new ActionRowBuilder().addComponents(...TABS.slice(0, 5).map(t =>
      new ButtonBuilder().setCustomId(`nav:${t.toLowerCase()}`).setLabel(t)
        .setStyle(view === t.toLowerCase() ? ButtonStyle.Success : ButtonStyle.Primary)
        .setDisabled(view === t.toLowerCase()))),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nav:profile').setLabel('PROFILE')
        .setStyle(view === 'profile' ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(view === 'profile'),
      new ButtonBuilder().setCustomId('pvp').setLabel('⚔️ PVP').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('heal').setLabel('❤️ Heal').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary)),
  ];
  const p = P.get(pid);
  if (view === 'fight' && p) rows.push(selectMenu('fight_select', 'Choose enemy...',
    Object.entries(ENEMIES).filter(([, e]) => p.level >= e.minLevel).map(([id, e]) => ({
      label: `${e.icon} ${e.name}`, description: `Lv.${e.minLevel}+ | ⚡${ZONES[e.zone]?.staminaCost || 1}`, value: id,
    }))));
  if (view === 'raids' && p) rows.push(selectMenu('raid_select', 'Choose boss...',
    Object.entries(RAIDS).filter(([, r]) => p.level >= r.minLevel).map(([id, r]) => ({
      label: `${r.icon} ${r.name}`, description: `⚡${r.staminaCost} | ❤${r.hp}`, value: id,
    }))));
  if (view === 'inventory' && p) rows.push(selectMenu('equip', 'Equip item...',
    P.getEquip(pid).filter(e => !e.equipped).slice(0, 24).map(e => {
      const c = EQUIPMENT[e.item_id];
      return c ? { label: `${c.icon} ${c.name} (${c.slot})`, description: Object.entries(c.stats).map(([k, v]) => `+${v} ${k}`).join(', '), value: `${e.id}` } : null;
    }).filter(Boolean)));
  if (view === 'skills' && p?.pending_skill_picks > 0) {
    const o = P.getOffers(pid);
    if (o) rows.push(selectMenu('pick_skill', '🎯 Pick skill...',
      [o.skill1, o.skill2, o.skill3].map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null).filter(Boolean)));
  }
  return rows;
}
