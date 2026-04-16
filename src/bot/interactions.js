import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import * as Player from '../core/player.js';
import { SKILLS, EQUIPMENT, ANCESTORS } from '../core/config.js';
import { renderGrind } from '../rendering/views/grind.js';

function renderView(playerId, extra) {
  Player.regenStamina(playerId);
  const player = extra?.player || Player.getPlayer(playerId);
  if (!player) return null;
  return renderGrind(player, extra || { wins: 0, losses: 0, goldEarned: 0, xpEarned: 0, loot: [], leveled: false, newLevel: player.level, xpPercent: player.xp / player.xp_needed, player });
}

function formatGrindResult(result) {
  if (!result.wins && !result.losses) {
    const eta = Player.formatDuration(Player.staminaEtaSeconds(result.player));
    return { success: true, message: `⏸️ Out of stamina — next ⚡ in ${eta}`, extra: result };
  }
  const parts = [`${result.wins}W/${result.losses}L +${result.goldEarned}g +${result.xpEarned}xp`];
  if (result.leveled) parts.push(`Lv.${result.newLevel}`);
  const legendary = result.loot?.find(i => i.rarity === 'legendary');
  const epic = !legendary && result.loot?.find(i => i.rarity === 'epic');
  if (legendary) parts.push(`LEGENDARY ${legendary.icon} ${legendary.name}`);
  else if (epic) parts.push(`EPIC ${epic.icon} ${epic.name}`);
  if (result.favorGained > 0) parts.push(`+${result.favorGained} ${ANCESTORS[result.player.ancestor]?.icon || '🙏'} favor`);
  for (const boon of result.newBoons || []) parts.push(`✨ ${boon.icon} ${boon.name} unlocked`);
  if (result.player.pending_skill_picks > 0) parts.push(`${result.player.pending_skill_picks} skill pick${result.player.pending_skill_picks > 1 ? 's' : ''}`);
  return { success: true, message: parts.join(' | '), extra: result };
}

function executeAction(playerId, action, args = {}) {
  Player.regenStamina(playerId);
  const actions = {
    grind: () => formatGrindResult(Player.grind(playerId)),
    equip: () => { const r = Player.equipItem(playerId, args.itemRowId); return r.success ? { success: true, message: `Equipped ${r.item.icon} ${r.item.name}` } : r; },
    pick_skill: () => { const r = Player.pickSkill(playerId, args.skillId); return r.success ? { success: true, message: `${r.skill.icon} ${r.skill.name}${r.newLevel > 1 ? ` Lv.${r.newLevel}` : ''}` } : r; },
    set_ancestor: () => { const r = Player.setAncestor(playerId, args.ancestorId); return r.success ? { success: true, message: `🙏 Now worshipping: ${r.ancestor.name}` } : r; },
  };
  const handler = actions[action];
  if (!handler) return { success: false, message: 'Unknown action' };
  return handler();
}

// ── Discord Handlers ──

function selectMenu(id, placeholder, options) {
  if (!options.length) options = [{ label: 'Nothing available', description: '-', value: 'none' }];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(id).setPlaceholder(placeholder).addOptions(options.slice(0, 25)));
}

export async function handleCommand(interaction) {
  Player.getOrCreatePlayer(interaction.user.id, interaction.user.username);
  const buf = renderView(interaction.user.id);
  await interaction.reply({ files: [new AttachmentBuilder(buf, { name: 'tianming.jpg' })], components: buildUI(interaction.user.id) });
}

export async function handleButton(interaction) {
  const playerId = interaction.user.id;
  if (!Player.getPlayer(playerId)) return interaction.reply({ content: '❌ Use `/tianming`', ephemeral: true });
  const result = executeAction(playerId, interaction.customId, {});
  await interaction.update({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    files: [new AttachmentBuilder(renderView(playerId, result.extra), { name: 'tianming.jpg' })],
    components: buildUI(playerId),
  });
}

export async function handleSelectMenu(interaction) {
  const playerId = interaction.user.id;
  const [menuId] = interaction.customId.split(':');
  const val = interaction.values[0];
  if (!Player.getPlayer(playerId)) return interaction.reply({ content: '❌ Use `/tianming`', ephemeral: true });
  const map = {
    equip: ['equip', { itemRowId: +val }],
    pick_skill: ['pick_skill', { skillId: val }],
    ancestor_select: ['set_ancestor', { ancestorId: val }],
  };
  const [action, args] = map[menuId] || ['unknown', {}];
  const result = executeAction(playerId, action, args);
  await interaction.update({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    files: [new AttachmentBuilder(renderView(playerId, result.extra), { name: 'tianming.jpg' })],
    components: buildUI(playerId),
  });
}

// ── UI ──

function buildUI(playerId) {
  const player = Player.getPlayer(playerId);
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('grind').setLabel('🔥 CULTIVATE').setStyle(ButtonStyle.Success)),
  ];

  // Equip items
  if (player) {
    const unequipped = Player.getAllEquipment(playerId).filter(r => !r.equipped);
    if (unequipped.length) rows.push(selectMenu('equip', '⚔️ Equip item...',
      unequipped.slice(0, 24).map(r => { const c = EQUIPMENT[r.item_id]; return c ? { label: `${c.icon} ${c.name} (${c.slot})`, description: Object.entries(c.stats).map(([k, v]) => `+${v} ${k}`).join(', '), value: `${r.id}` } : null; }).filter(Boolean)));
  }

  // Ancestor selection
  if (player) {
    rows.push(selectMenu('ancestor_select', '🙏 Choose ancestor...',
      Object.entries(ANCESTORS).map(([id, a]) => ({
        label: `${a.icon} ${a.name}`, description: player.ancestor === id ? `✓ Worshipping (${player.ancestor_favor} favor)` : a.desc.slice(0, 50), value: id }))));
  }

  // Skill picks
  if (player?.pending_skill_picks > 0) {
    const offers = Player.getSkillOffers(playerId);
    if (offers) rows.push(selectMenu('pick_skill', '🎯 Pick skill...',
      [offers.skill1, offers.skill2, offers.skill3].map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null).filter(Boolean)));
  }

  return rows;
}
