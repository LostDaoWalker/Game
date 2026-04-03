import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import { getOrCreate, get, getEquip, getOffers } from '../core/player.js';
import { ENEMIES, RAIDS, ZONES, SKILLS, EQUIPMENT, ECO } from '../core/config.js';
import { renderView, handleAction } from '../game/engine.js';

const views = new Map();

function selectMenu(id, placeholder, opts) {
  if (!opts.length) opts = [{ label: 'Nothing available', description: '-', value: 'none' }];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(opts.slice(0, 25)));
}

async function send(i, pid, view, extra, reply) {
  const img = renderView(pid, view, extra);
  const payload = { files: [new AttachmentBuilder(img, { name: 'nexus.png' })], components: buildUI(view, pid), content: '' };
  reply ? await i.reply(payload) : await i.update(payload);
}

async function sendResult(i, pid, r, fallback) {
  const v = r.view || fallback || views.get(pid) || 'dashboard'; views.set(pid, v);
  const img = renderView(pid, v, r.extra || null);
  await i.update({ content: r.success ? `✅ ${r.message}` : `❌ ${r.message}`, files: [new AttachmentBuilder(img, { name: 'nexus.png' })], components: buildUI(v, pid) });
}

// ── Handlers ──

export async function handleNexusCommand(i) { getOrCreate(i.user.id, i.user.username); views.set(i.user.id, 'dashboard'); await send(i, i.user.id, 'dashboard', null, true); }

export async function handleButton(i) {
  const pid = i.user.id; if (!get(pid)) return i.reply({ content: '❌ Use `/nexus`', ephemeral: true });
  const [a, ...args] = i.customId.split(':');
  if (a === 'nav') { views.set(pid, args[0]); return send(i, pid, args[0]); }
  if (a === 'refresh') return send(i, pid, views.get(pid) || 'dashboard');
  return sendResult(i, pid, handleAction(pid, a === 'pvp' ? 'pvp' : a === 'heal' ? 'heal' : a, a === 'fight' ? { enemyId: args[0] } : a === 'raid' ? { raidId: args[0] } : {}));
}

export async function handleSelectMenu(i) {
  const pid = i.user.id, [menu] = i.customId.split(':'), val = i.values[0];
  if (!get(pid)) return i.reply({ content: '❌ Use `/nexus`', ephemeral: true });
  const map = { fight_select: ['fight_enemy', { enemyId: val }], raid_select: ['raid', { raidId: val }], equip: ['equip', { itemRowId: +val }], sell: ['sell', { itemRowId: +val }], pick_skill: ['pick_skill', { skillId: val }] };
  const [action, args] = map[menu] || ['unknown', {}];
  return sendResult(i, pid, handleAction(pid, action, args), menu === 'equip' || menu === 'sell' ? 'inventory' : menu === 'pick_skill' ? 'skills' : undefined);
}

// ── UI Builder ──

function buildUI(view, pid) {
  const rows = [
    new ActionRowBuilder().addComponents(
      ...['DASHBOARD', 'FIGHT', 'RAIDS', 'INVENTORY', 'SKILLS'].map(t =>
        new ButtonBuilder().setCustomId(`nav:${t.toLowerCase()}`).setLabel(t).setStyle(view === t.toLowerCase() ? ButtonStyle.Success : ButtonStyle.Primary).setDisabled(view === t.toLowerCase()))
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nav:profile').setLabel('PROFILE').setStyle(view === 'profile' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(view === 'profile'),
      new ButtonBuilder().setCustomId('pvp').setLabel('⚔️ PVP').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('heal').setLabel('❤️ Heal').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary),
    ),
  ];
  const p = get(pid);
  if (view === 'fight' && p) rows.push(selectMenu('fight_select', 'Choose enemy...',
    Object.entries(ENEMIES).filter(([, e]) => p.level >= e.minLevel).map(([id, e]) => ({ label: `${e.icon} ${e.name}`, description: `Lv.${e.minLevel}+ | ⚡${ZONES[e.zone]?.staminaCost || 1}`, value: id }))));
  if (view === 'raids' && p) rows.push(selectMenu('raid_select', 'Choose boss...',
    Object.entries(RAIDS).filter(([, r]) => p.level >= r.minLevel).map(([id, r]) => ({ label: `${r.icon} ${r.name}`, description: `⚡${r.staminaCost} | ❤${r.hp}`, value: id }))));
  if (view === 'inventory' && p) rows.push(selectMenu('equip', 'Equip item...',
    getEquip(pid).filter(e => !e.equipped).slice(0, 24).map(e => { const c = EQUIPMENT[e.item_id]; return c ? { label: `${c.icon} ${c.name} (${c.slot})`, description: Object.entries(c.stats).map(([k, v]) => `+${v} ${k}`).join(', '), value: `${e.id}` } : null; }).filter(Boolean)));
  if (view === 'skills' && p?.pending_skill_picks > 0) { const o = getOffers(pid); if (o) rows.push(selectMenu('pick_skill', '🎯 Pick skill...',
    [o.skill1, o.skill2, o.skill3].map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null).filter(Boolean))); }
  return rows;
}
