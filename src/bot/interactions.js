import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import * as Player from '../core/player.js';
import { ENEMIES, RAIDS, ZONES, SKILLS, EQUIPMENT, TABS } from '../core/config.js';
import { renderHome } from '../rendering/views/home.js';
import { renderFight } from '../rendering/views/fight.js';
import { renderRaids } from '../rendering/views/raids.js';
import { renderInventory } from '../rendering/views/inventory.js';
import { renderSkills } from '../rendering/views/skills.js';
import { renderProfile } from '../rendering/views/profile.js';

const activeView = new Map();

// ── Derived view data — computed once per render ──

const equippedConfigs = playerId => Player.getEquippedItems(playerId).map(row => EQUIPMENT[row.item_id]).filter(Boolean);

const skillConfigs = playerId => Player.getPlayerSkills(playerId)
  .map(row => { const config = SKILLS[row.skill_id]; return config ? { ...config, level: row.level, id: row.skill_id } : null; })
  .filter(Boolean);

function renderView(playerId, view, combatResult) {
  Player.regenStamina(Player.getPlayer(playerId));
  Player.updateNetworth(playerId);
  const player = Player.getPlayer(playerId);
  if (!player) return null;

  const viewRenderers = {
    home: () => renderHome(player, equippedConfigs(playerId), skillConfigs(playerId), Player.getRecentLog(playerId), Player.getLeaderboard()),
    fight: () => renderFight(player, combatResult),
    raids: () => renderRaids(player, combatResult),
    inventory: () => renderInventory(player, Player.getAllEquipment(playerId), Player.getEquippedItems(playerId)),
    skills: () => renderSkills(player, skillConfigs(playerId), Player.getSkillOffers(playerId)),
    profile: () => renderProfile(player, Player.getAllEquipment(playerId), skillConfigs(playerId), playerRank(playerId)),
  };
  return (viewRenderers[view] || viewRenderers.home)();
}

function playerRank(playerId) {
  const index = Player.getLeaderboard(100).findIndex(entry => entry.id === playerId);
  return index >= 0 ? index + 1 : 99;
}

function executeAction(playerId, action, args = {}) {
  Player.regenStamina(Player.getPlayer(playerId));

  const formatCombatResult = (result, view) => {
    if (!result.success) return result;
    const foeName = result.foe.name;
    let message = result.won ? `⚔️ Beat ${foeName}! +${result.gold}g +${result.xp}xp` : `💀 Lost to ${foeName}. +${result.xp}xp`;
    if (result.lootItem) message += ` 🎁 ${result.lootItem.icon} ${result.lootItem.name}!`;
    if (result.leveled) message += ` 🎉 Level ${result.newLevel}!`;
    return { success: true, message, view, extra: result };
  };

  const actions = {
    fight_enemy: () => formatCombatResult(Player.fightEnemy(playerId, args.enemyId), 'fight'),
    pvp: () => formatCombatResult(Player.pvpFight(playerId), 'fight'),
    raid: () => formatCombatResult(Player.fightRaid(playerId, args.raidId), 'raids'),
    equip: () => { const result = Player.equipItem(playerId, args.itemRowId); return result.success ? { success: true, message: `Equipped ${result.item.icon} ${result.item.name}`, view: 'inventory' } : result; },
    sell: () => { const result = Player.sellItem(playerId, args.itemRowId); return result.success ? { success: true, message: `Sold ${result.item.icon} ${result.item.name} for ${result.gold}g`, view: 'inventory' } : result; },
    pick_skill: () => { const result = Player.pickSkill(playerId, args.skillId); return result.success ? { success: true, message: `${result.skill.icon} ${result.skill.name} ${result.newLevel > 1 ? `→ Lv.${result.newLevel}` : 'learned'}!`, view: 'skills' } : result; },
    heal: () => { const result = Player.healPlayer(playerId); return result.success ? { success: true, message: `Healed ${result.healed} HP (-${result.cost}g)`, view: 'fight' } : result; },
  };

  const handler = actions[action];
  if (!handler) return { success: false, message: 'Unknown action' };
  return handler();
}

// ── Discord Handlers ──

function buildSelectMenu(customId, placeholder, options) {
  if (!options.length) options = [{ label: 'Nothing available', description: '-', value: 'none' }];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(customId).setPlaceholder(placeholder).addOptions(options.slice(0, 25)));
}

async function sendView(interaction, playerId, view, combatResult, isReply) {
  const payload = { files: [new AttachmentBuilder(renderView(playerId, view, combatResult), { name: 'halcyon.png' })], components: buildUI(view, playerId), content: '' };
  isReply ? await interaction.reply(payload) : await interaction.update(payload);
}

async function sendActionResult(interaction, playerId, result, fallbackView) {
  const view = result.view || fallbackView || activeView.get(playerId) || 'home';
  activeView.set(playerId, view);
  await interaction.update({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    files: [new AttachmentBuilder(renderView(playerId, view, result.extra || null), { name: 'halcyon.png' })],
    components: buildUI(view, playerId),
  });
}

export async function handleCommand(interaction) {
  Player.getOrCreatePlayer(interaction.user.id, interaction.user.username);
  activeView.set(interaction.user.id, 'home');
  await sendView(interaction, interaction.user.id, 'home', null, true);
}

export async function handleButton(interaction) {
  const playerId = interaction.user.id;
  if (!Player.getPlayer(playerId)) return interaction.reply({ content: '❌ Use `/halcyon`', ephemeral: true });
  const [action, ...args] = interaction.customId.split(':');
  if (action === 'nav') { activeView.set(playerId, args[0]); return sendView(interaction, playerId, args[0]); }
  if (action === 'refresh') return sendView(interaction, playerId, activeView.get(playerId) || 'home');
  return sendActionResult(interaction, playerId, executeAction(playerId, action, {}));
}

export async function handleSelectMenu(interaction) {
  const playerId = interaction.user.id;
  const [menuId] = interaction.customId.split(':');
  const selectedValue = interaction.values[0];
  if (!Player.getPlayer(playerId)) return interaction.reply({ content: '❌ Use `/halcyon`', ephemeral: true });

  const menuActions = {
    fight_select: ['fight_enemy', { enemyId: selectedValue }],
    raid_select: ['raid', { raidId: selectedValue }],
    equip: ['equip', { itemRowId: +selectedValue }],
    sell: ['sell', { itemRowId: +selectedValue }],
    pick_skill: ['pick_skill', { skillId: selectedValue }],
  };
  const [action, args] = menuActions[menuId] || ['unknown', {}];
  const fallbackView = { equip: 'inventory', sell: 'inventory', pick_skill: 'skills' }[menuId];
  return sendActionResult(interaction, playerId, executeAction(playerId, action, args), fallbackView);
}

// ── UI Builder ──

function buildUI(view, playerId) {
  const rows = [
    new ActionRowBuilder().addComponents(...TABS.slice(0, 5).map(tab =>
      new ButtonBuilder().setCustomId(`nav:${tab.toLowerCase()}`).setLabel(tab)
        .setStyle(view === tab.toLowerCase() ? ButtonStyle.Success : ButtonStyle.Primary)
        .setDisabled(view === tab.toLowerCase()))),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('nav:profile').setLabel('PROFILE')
        .setStyle(view === 'profile' ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(view === 'profile'),
      new ButtonBuilder().setCustomId('pvp').setLabel('⚔️ PVP').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('heal').setLabel('❤️ Heal').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary)),
  ];

  const player = Player.getPlayer(playerId);
  if (view === 'fight' && player) rows.push(buildSelectMenu('fight_select', 'Choose enemy...',
    Object.entries(ENEMIES).filter(([, enemy]) => player.level >= enemy.minLevel).map(([id, enemy]) => ({
      label: `${enemy.icon} ${enemy.name}`, description: `Lv.${enemy.minLevel}+ | ⚡${ZONES[enemy.zone]?.staminaCost || 1}`, value: id,
    }))));
  if (view === 'raids' && player) rows.push(buildSelectMenu('raid_select', 'Choose boss...',
    Object.entries(RAIDS).filter(([, raid]) => player.level >= raid.minLevel).map(([id, raid]) => ({
      label: `${raid.icon} ${raid.name}`, description: `⚡${raid.staminaCost} | ❤${raid.hp}`, value: id,
    }))));
  if (view === 'inventory' && player) rows.push(buildSelectMenu('equip', 'Equip item...',
    Player.getAllEquipment(playerId).filter(row => !row.equipped).slice(0, 24).map(row => {
      const config = EQUIPMENT[row.item_id];
      return config ? { label: `${config.icon} ${config.name} (${config.slot})`, description: Object.entries(config.stats).map(([stat, val]) => `+${val} ${stat}`).join(', '), value: `${row.id}` } : null;
    }).filter(Boolean)));
  if (view === 'skills' && player?.pending_skill_picks > 0) {
    const offers = Player.getSkillOffers(playerId);
    if (offers) rows.push(buildSelectMenu('pick_skill', '🎯 Pick skill...',
      [offers.skill1, offers.skill2, offers.skill3]
        .map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null)
        .filter(Boolean)));
  }
  return rows;
}
