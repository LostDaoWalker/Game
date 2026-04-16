import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import * as Player from '../core/player.js';
import { SKILLS, EQUIPMENT, ANCESTORS, CLASSES } from '../core/config.js';
import { renderGrind } from '../rendering/views/grind.js';

function renderView(playerId, extra) {
  Player.regenStamina(playerId);
  Player.updateNetworth(playerId);
  const player = extra?.player || Player.getPlayer(playerId);
  if (!player) return null;
  return renderGrind(player, extra || { wins: 0, losses: 0, goldEarned: 0, xpEarned: 0, loot: [], leveled: false, newLevel: player.level, beforeNetworth: player.networth, afterNetworth: player.networth, xpPercent: player.xp / player.xp_needed, player });
}

function formatQuestResult(result, flavorVerb) {
  if (!result.wins && !result.losses) {
    const eta = Player.formatDuration(Player.staminaEtaSeconds(result.player));
    return { success: true, message: `⏸️ Out of stamina — next ⚡ in ${eta}`, extra: result };
  }
  const verb = flavorVerb || 'Quest';
  const enemyName = result.enemy?.name || 'foe';
  const parts = [`⚔️ ${verb} ${enemyName}: ${result.wins}W/${result.losses}L → +${result.goldEarned}g +${result.xpEarned}xp`];
  if (result.leveled) parts.push(`🎉 Lv.${result.newLevel} — ${Player.pickFlavor('levelUp')}`);
  if (result.newRealm) parts.push(`✨ Breakthrough → ${result.newRealm.icon} ${result.newRealm.name}`);
  const legendary = result.loot?.find(i => i.rarity === 'legendary');
  const epic = !legendary && result.loot?.find(i => i.rarity === 'epic');
  if (legendary) parts.push(`🌟 LEGENDARY: ${legendary.icon} ${legendary.name}!!!`);
  else if (epic) parts.push(`✨ EPIC: ${epic.icon} ${epic.name}!`);
  else if (result.loot?.length && Math.random() < 0.4) parts.push(Player.pickFlavor('loot'));
  if (result.player.pending_skill_picks > 0) parts.push(`🎯 ${result.player.pending_skill_picks} skill pick${result.player.pending_skill_picks > 1 ? 's' : ''}`);
  // tail flavor for win/loss balance
  if (!parts.some(p => p.includes('—')) && result.wins >= result.losses) parts.push(`"${Player.pickFlavor('victory')}"`);
  else if (result.losses > result.wins) parts.push(`"${Player.pickFlavor('defeat')}"`);
  return { success: true, message: parts.join(' | '), extra: result };
}

function executeAction(playerId, action, args = {}) {
  Player.regenStamina(playerId);
  const actions = {
    quest: () => formatQuestResult(Player.grind(playerId, args.enemyId), args.verb),
    arena: () => {
      const r = Player.pvpFight(playerId);
      if (!r.success) return r;
      const head = r.won ? `🏆 Defeated ${r.opponentName}! +${r.gold}g +${r.xp}xp` : `💀 Lost to ${r.opponentName}. +${r.xp}xp`;
      const tail = r.won ? Player.pickFlavor('arena_win') : Player.pickFlavor('arena_loss');
      const realm = r.leveled ? ` | 🎉 Lv.${r.newLevel}` : '';
      return { success: true, message: `${head}${realm} | "${tail}"` };
    },
    equip: () => { const r = Player.equipItem(playerId, args.itemRowId); return r.success ? { success: true, message: `Equipped ${r.item.icon} ${r.item.name}` } : r; },
    pick_skill: () => { const r = Player.pickSkill(playerId, args.skillId); return r.success ? { success: true, message: `${r.skill.icon} ${r.skill.name}${r.newLevel > 1 ? ` Lv.${r.newLevel}` : ''}` } : r; },
    set_ancestor: () => { const r = Player.setAncestor(playerId, args.ancestorId); return r.success ? { success: true, message: `🙏 Now worshipping: ${r.ancestor.name}` } : r; },
    set_class: () => { const r = Player.setClass(playerId, args.classId); return r.success ? { success: true, message: `${r.class.icon} Path set: ${r.class.name}` } : r; },
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
  const [action, ...rest] = interaction.customId.split(':');
  let args = {};
  if (action === 'quest') args = { enemyId: rest[0], verb: rest[1] };
  const result = executeAction(playerId, action, args);
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
    class_select: ['set_class', { classId: val }],
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
  const rows = [];

  // Row 1: Tavern — 3 quest buttons + ARENA
  if (player) {
    const quests = Player.getQuestOffers(playerId);
    const questButtons = quests.map(q => {
      const label = `${q.enemy.icon} ${q.verb} ${q.enemy.name}`.slice(0, 80);
      return new ButtonBuilder().setCustomId(`quest:${q.enemyId}:${q.verb}`).setLabel(label).setStyle(ButtonStyle.Success);
    });
    questButtons.push(new ButtonBuilder().setCustomId('arena').setLabel('🗡️ ARENA').setStyle(ButtonStyle.Danger));
    rows.push(new ActionRowBuilder().addComponents(...questButtons));
  }

  // Equip items
  if (player) {
    const unequipped = Player.getAllEquipment(playerId).filter(r => !r.equipped);
    if (unequipped.length) rows.push(selectMenu('equip', '⚔️ Equip item...',
      unequipped.slice(0, 24).map(r => { const c = EQUIPMENT[r.item_id]; return c ? { label: `${c.icon} ${c.name} (${c.slot})`, description: Object.entries(c.stats).map(([k, v]) => `+${v} ${k}`).join(', '), value: `${r.id}` } : null; }).filter(Boolean)));
  }

  // Cultivation path (class)
  if (player) {
    rows.push(selectMenu('class_select', '🧘 Choose cultivation path...',
      Object.entries(CLASSES).map(([id, c]) => ({
        label: `${c.icon} ${c.name}`,
        description: player.class === id ? `✓ Walking this path` : c.desc.slice(0, 50),
        value: id }))));
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
