import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import * as Player from '../core/player.js';
import { ENEMIES, RAIDS, ZONES, SKILLS, EQUIPMENT, ASSETS, TABS } from '../core/config.js';
import { renderHome } from '../rendering/views/home.js';
import { renderFight } from '../rendering/views/fight.js';
import { renderRaids } from '../rendering/views/raids.js';
import { renderInventory } from '../rendering/views/inventory.js';
import { renderSkills } from '../rendering/views/skills.js';
import { renderProfile } from '../rendering/views/profile.js';
import { renderAssets } from '../rendering/views/assets.js';

const activeView = new Map();
const lastEnemy = new Map();

const equippedConfigs = playerId => Player.getEquippedItems(playerId).map(row => EQUIPMENT[row.item_id]).filter(Boolean);
const skillConfigs = playerId => Player.getPlayerSkills(playerId)
  .map(row => { const config = SKILLS[row.skill_id]; return config ? { ...config, level: row.level, id: row.skill_id } : null; })
  .filter(Boolean);

function renderView(playerId, view, combatResult) {
  if (!Player.getPlayer(playerId)) return null;
  Player.regenStamina(playerId);
  Player.collectAssetIncome(playerId);
  Player.updateNetworth(playerId);
  const player = Player.getPlayer(playerId);

  const viewRenderers = {
    home: () => renderHome(player, equippedConfigs(playerId), skillConfigs(playerId), Player.getRecentLog(playerId), Player.getLeaderboard(), Player.highestAssetIcon(playerId)),
    fight: () => renderFight(player, combatResult),
    raids: () => renderRaids(player, combatResult),
    assets: () => renderAssets(player, Player.getPlayerAssets(playerId)),
    inventory: () => renderInventory(player, Player.getAllEquipment(playerId), Player.getEquippedItems(playerId)),
    skills: () => renderSkills(player, skillConfigs(playerId), Player.getSkillOffers(playerId)),
    profile: () => renderProfile(player, Player.getAllEquipment(playerId), skillConfigs(playerId), Player.getRank(playerId)),
  };
  return (viewRenderers[view] || viewRenderers.home)();
}

function executeAction(playerId, action, args = {}) {
  Player.regenStamina(playerId);

  const formatCombatResult = (result, view) => {
    if (!result.success) return result;
    const foeName = result.foe.name;
    let message = result.won ? `⚔️ Beat ${foeName}! +${result.gold}g +${result.xp}xp` : `💀 Lost to ${foeName}. +${result.xp}xp`;
    if (result.lootItem) message += ` 🎁 ${result.lootItem.icon} ${result.lootItem.name}`;
    if (result.autoEquipped) message += ` (auto-equipped!)`;
    else if (result.lootItem) message += `!`;
    if (result.leveled) message += ` 🎉 Level ${result.newLevel}!`;
    return { success: true, message, view, extra: result };
  };

  const actions = {
    fight_enemy: () => {
      lastEnemy.set(playerId, args.enemyId);
      return formatCombatResult(Player.fightEnemy(playerId, args.enemyId), 'fight');
    },
    fight_again: () => {
      const enemyId = lastEnemy.get(playerId) || Player.bestEnemy(playerId);
      if (!enemyId) return { success: false, message: 'No enemy available' };
      lastEnemy.set(playerId, enemyId);
      return formatCombatResult(Player.fightEnemy(playerId, enemyId), 'fight');
    },
    quick_fight: () => {
      const enemyId = Player.bestEnemy(playerId);
      if (!enemyId) return { success: false, message: 'No enemy available' };
      lastEnemy.set(playerId, enemyId);
      return formatCombatResult(Player.fightEnemy(playerId, enemyId), 'fight');
    },
    pvp: () => formatCombatResult(Player.pvpFight(playerId), 'fight'),
    raid: () => formatCombatResult(Player.fightRaid(playerId, args.raidId), 'raids'),
    equip: () => { const result = Player.equipItem(playerId, args.itemRowId); return result.success ? { success: true, message: `Equipped ${result.item.icon} ${result.item.name}`, view: 'inventory' } : result; },
    sell: () => { const result = Player.sellItem(playerId, args.itemRowId); return result.success ? { success: true, message: `Sold ${result.item.icon} ${result.item.name} for ${result.gold}g`, view: 'inventory' } : result; },
    sell_junk: () => { const result = Player.sellAllJunk(playerId, 'common'); return result.success ? { success: true, message: `Sold ${result.count} items for ${result.gold}g`, view: 'inventory' } : result; },
    sell_outgrown: () => { const result = Player.sellBelowEquipped(playerId); return result.success ? { success: true, message: `Sold ${result.count} outgrown items for ${result.gold}g`, view: 'inventory' } : result; },
    bulk_fight: () => {
      const enemyId = lastEnemy.get(playerId) || Player.bestEnemy(playerId);
      if (!enemyId) return { success: false, message: 'No enemy available' };
      lastEnemy.set(playerId, enemyId);
      const result = Player.bulkFight(playerId, enemyId, 5);
      let message = `${result.wins}W/${result.losses}L | +${result.goldEarned}g +${result.xpEarned}xp`;
      if (result.loot.length) message += ` | ${result.loot.length} drops`;
      if (result.levelsGained) message += ` | 🎉 Lv.${result.endLevel}`;
      if (result.stoppedReason) message += ` | Stopped: ${result.stoppedReason}`;
      return { success: true, message, view: 'fight' };
    },
    daily: () => { const result = Player.claimDaily(playerId); return result.success ? { success: true, message: `🎁 Daily bonus: +${result.gold}g (streak: ${result.streak}/${result.maxStreak})`, view: null } : result; },
    buy_asset: () => { const result = Player.buyAsset(playerId, args.assetId); return result.success ? { success: true, message: `Bought ${result.asset.icon} ${result.asset.name}!`, view: 'assets' } : result; },
    collect_income: () => { const result = Player.collectAssetIncome(playerId); return result.success ? { success: true, message: `Earned ${result.net}g (+${result.income} income, -${result.maintenance} maintenance)`, view: 'assets' } : result; },
    pick_skill: () => { const result = Player.pickSkill(playerId, args.skillId); return result.success ? { success: true, message: `${result.skill.icon} ${result.skill.name} ${result.newLevel > 1 ? `→ Lv.${result.newLevel}` : 'learned'}!`, view: 'skills' } : result; },
    heal: () => { const result = Player.healPlayer(playerId); return result.success ? { success: true, message: `Healed ${result.healed} HP (-${result.cost}g)`, view: null } : result; },
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
    buy_asset: ['buy_asset', { assetId: selectedValue }],
    fight_select: ['fight_enemy', { enemyId: selectedValue }],
    raid_select: ['raid', { raidId: selectedValue }],
    equip: ['equip', { itemRowId: +selectedValue }],
    sell: ['sell', { itemRowId: +selectedValue }],
    pick_skill: ['pick_skill', { skillId: selectedValue }],
  };
  const [action, args] = menuActions[menuId] || ['unknown', {}];
  const fallbackView = { equip: 'inventory', sell: 'inventory', pick_skill: 'skills', buy_asset: 'assets' }[menuId];
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
      new ButtonBuilder().setCustomId('nav:skills').setLabel('SKILLS')
        .setStyle(view === 'skills' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(view === 'skills'),
      new ButtonBuilder().setCustomId('nav:profile').setLabel('PROFILE')
        .setStyle(view === 'profile' ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(view === 'profile'),
      new ButtonBuilder().setCustomId('quick_fight').setLabel('⚔️ Fight').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('daily').setLabel('🎁 Daily').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary)),
  ];

  const player = Player.getPlayer(playerId);

  if (view === 'fight') {
    // Fight-again + enemy select
    const fightRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fight_again').setLabel('⚔️ Again').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('bulk_fight').setLabel('⚔️ x5').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('pvp').setLabel('🥊 PVP').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('heal').setLabel('❤️ Heal').setStyle(ButtonStyle.Success));
    rows.push(fightRow);
    if (player) rows.push(buildSelectMenu('fight_select', 'Choose enemy...',
      Object.entries(ENEMIES).filter(([, enemy]) => player.level >= enemy.minLevel).map(([id, enemy]) => ({
        label: `${enemy.icon} ${enemy.name}`, description: `Lv.${enemy.minLevel}+ | ⚡${ZONES[enemy.zone]?.staminaCost || 1}`, value: id,
      }))));
  }

  if (view === 'assets' && player) {
    const ownedSet = new Set(Player.getPlayerAssets(playerId).map(row => row.asset_id));
    const buyable = Object.entries(ASSETS).filter(([id, asset]) => !ownedSet.has(id) && player.level >= asset.minLevel);
    if (buyable.length) rows.push(buildSelectMenu('buy_asset', '🏠 Buy asset...',
      buyable.map(([id, asset]) => ({
        label: `${asset.icon} ${asset.name} (${asset.cost}g)`,
        description: `+${asset.incomePerHr}/hr income | +${asset.networthValue} networth`,
        value: id,
      }))));
    if (ownedSet.size) rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('collect_income').setLabel('💰 Collect Income').setStyle(ButtonStyle.Success)));
  }

  if (view === 'raids' && player) rows.push(buildSelectMenu('raid_select', 'Choose boss...',
    Object.entries(RAIDS).filter(([, raid]) => player.level >= raid.minLevel).map(([id, raid]) => ({
      label: `${raid.icon} ${raid.name}`, description: `⚡${raid.staminaCost} | ❤${raid.hp}`, value: id,
    }))));

  if (view === 'inventory' && player) {
    const unequipped = Player.getAllEquipment(playerId).filter(row => !row.equipped);
    if (unequipped.length) {
      rows.push(buildSelectMenu('equip', 'Equip item...',
        unequipped.slice(0, 24).map(row => {
          const config = EQUIPMENT[row.item_id];
          return config ? { label: `${config.icon} ${config.name} (${config.slot})`, description: Object.entries(config.stats).map(([stat, val]) => `+${val} ${stat}`).join(', '), value: `${row.id}` } : null;
        }).filter(Boolean)));
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sell_junk').setLabel('💰 Sell Junk').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('sell_outgrown').setLabel('💰 Sell Outgrown').setStyle(ButtonStyle.Secondary)));
    }
  }

  if (view === 'skills' && player?.pending_skill_picks > 0) {
    const offers = Player.getSkillOffers(playerId);
    if (offers) rows.push(buildSelectMenu('pick_skill', '🎯 Pick skill...',
      [offers.skill1, offers.skill2, offers.skill3]
        .map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null)
        .filter(Boolean)));
  }

  return rows;
}
