import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import * as Player from '../core/player.js';
import { ENEMIES, RAIDS, ZONES, SKILLS, EQUIPMENT, ASSETS, CREW, SYNTHESIS, TABS } from '../core/config.js';
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

function formatCombatResult(result, view) {
  if (!result.success) return result;
  let message = result.won ? `⚔️ Beat ${result.foe.name}! +${result.gold}g +${result.xp}xp` : `💀 Lost to ${result.foe.name}. +${result.xp}xp`;
  if (result.lootItem) message += result.autoEquipped ? ` 🎁 ${result.lootItem.icon} ${result.lootItem.name} (auto-equipped!)` : ` 🎁 ${result.lootItem.icon} ${result.lootItem.name}!`;
  if (result.leveled) message += ` 🎉 Level ${result.newLevel}!`;
  if (result.stolen) message += ` 💰 Stole ${result.stolen}g!`;
  return { success: true, message, view, extra: result };
}

function executeAction(playerId, action, args = {}) {
  Player.regenStamina(playerId);
  const actions = {
    // ── Primary loop ──
    hustle: () => {
      const { log } = Player.hustle(playerId);
      return { success: true, message: log.join(' | ') || 'Nothing to do — out of stamina', view: 'home' };
    },
    // ── Manual fight controls ──
    fight_enemy: () => { lastEnemy.set(playerId, args.enemyId); return formatCombatResult(Player.fightEnemy(playerId, args.enemyId), 'fight'); },
    fight_again: () => { const eid = lastEnemy.get(playerId) || Player.bestEnemy(playerId); if (!eid) return { success: false, message: 'No enemy' }; lastEnemy.set(playerId, eid); return formatCombatResult(Player.fightEnemy(playerId, eid), 'fight'); },
    bulk_fight: () => { const eid = lastEnemy.get(playerId) || Player.bestEnemy(playerId); if (!eid) return { success: false, message: 'No enemy' }; lastEnemy.set(playerId, eid); const r = Player.bulkFight(playerId, eid, 5); return { success: true, message: `${r.wins}W/${r.losses}L +${r.goldEarned}g +${r.xpEarned}xp${r.loot.length ? ` ${r.loot.length} drops` : ''}${r.levelsGained ? ` 🎉 Lv.${r.endLevel}` : ''}`, view: 'fight' }; },
    pvp: () => formatCombatResult(Player.pvpFight(playerId), 'fight'),
    raid: () => formatCombatResult(Player.fightRaid(playerId, args.raidId), 'raids'),
    heal: () => { const r = Player.healPlayer(playerId); return r.success ? { success: true, message: `❤️ Healed ${r.healed} HP (-${r.cost}g)`, view: null } : r; },
    // ── Economy ──
    buy_asset: () => { const r = Player.buyAsset(playerId, args.assetId); return r.success ? { success: true, message: `Bought ${r.asset.icon} ${r.asset.name}!`, view: 'assets' } : r; },
    hire_crew: () => { const r = Player.hireCrew(playerId, args.crewId); return r.success ? { success: true, message: `Hired ${r.crew.icon} ${r.crew.name}!`, view: 'home' } : r; },
    deposit: () => { const p = Player.getPlayer(playerId); const amt = (p.gold * 0.5) | 0 || p.gold; const r = Player.depositGold(playerId, amt); return r.success ? { success: true, message: `🏦 Banked ${r.deposited}g`, view: null } : r; },
    withdraw: () => { const p = Player.getPlayer(playerId); const r = Player.withdrawGold(playerId, p.banked_gold); return r.success ? { success: true, message: `🏦 Withdrew ${r.withdrawn}g`, view: null } : r; },
    daily: () => { const r = Player.claimDaily(playerId); return r.success ? { success: true, message: `🎁 +${r.gold}g (streak ${r.streak}/${r.maxStreak})`, view: null } : r; },
    // ── Inventory ──
    equip: () => { const r = Player.equipItem(playerId, args.itemRowId); return r.success ? { success: true, message: `Equipped ${r.item.icon} ${r.item.name}`, view: 'inventory' } : r; },
    sell_junk: () => { const r = Player.sellAllJunk(playerId, 'common'); return r.success ? { success: true, message: `Sold ${r.count} items for ${r.gold}g`, view: 'inventory' } : r; },
    sell_outgrown: () => { const r = Player.sellBelowEquipped(playerId); return r.success ? { success: true, message: `Sold ${r.count} items for ${r.gold}g`, view: 'inventory' } : r; },
    synthesize: () => { const r = Player.synthesize(playerId, args.item1, args.item2, args.item3); return r.success ? { success: true, message: `${r.upgraded ? '✨' : '🔨'} ${r.item.icon} ${r.item.name}`, view: 'inventory' } : r; },
    pick_skill: () => { const r = Player.pickSkill(playerId, args.skillId); return r.success ? { success: true, message: `${r.skill.icon} ${r.skill.name}${r.newLevel > 1 ? ` Lv.${r.newLevel}` : ''}`, view: 'skills' } : r; },
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

async function sendView(interaction, playerId, view, extra, isReply) {
  const payload = { files: [new AttachmentBuilder(renderView(playerId, view, extra), { name: 'halcyon.png' })], components: buildUI(view, playerId), content: '' };
  isReply ? await interaction.reply(payload) : await interaction.update(payload);
}

async function sendResult(interaction, playerId, result, fallback) {
  const view = result.view || fallback || activeView.get(playerId) || 'home';
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
  return sendResult(interaction, playerId, executeAction(playerId, action, {}));
}

export async function handleSelectMenu(interaction) {
  const playerId = interaction.user.id;
  const [menuId] = interaction.customId.split(':');
  const val = interaction.values[0];
  if (!Player.getPlayer(playerId)) return interaction.reply({ content: '❌ Use `/halcyon`', ephemeral: true });
  const map = {
    fight_select: ['fight_enemy', { enemyId: val }], raid_select: ['raid', { raidId: val }],
    equip: ['equip', { itemRowId: +val }], pick_skill: ['pick_skill', { skillId: val }],
    buy_asset: ['buy_asset', { assetId: val }], hire_crew: ['hire_crew', { crewId: val }],
    synthesize_select: ['synthesize', { item1: +val.split(',')[0], item2: +val.split(',')[1], item3: +val.split(',')[2] }],
  };
  const [action, args] = map[menuId] || ['unknown', {}];
  const fallback = { equip: 'inventory', pick_skill: 'skills', buy_asset: 'assets', hire_crew: 'home', synthesize_select: 'inventory' }[menuId];
  return sendResult(interaction, playerId, executeAction(playerId, action, args), fallback);
}

// ── UI ──
// Row 1: HUSTLE (the one button) + secondary actions
// Row 2: Nav tabs for detail views (only when you want to dig in)
// Row 3+: Context-specific menus per view

function buildUI(view, playerId) {
  const player = Player.getPlayer(playerId);
  const rows = [
    // THE button
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('hustle').setLabel('💰 HUSTLE').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('daily').setLabel('🎁').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('deposit').setLabel('🏦').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('pvp').setLabel('🥊').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('heal').setLabel('❤️').setStyle(ButtonStyle.Secondary)),
    // Nav — only for when you want details
    new ActionRowBuilder().addComponents(
      ...['HOME', 'FIGHT', 'ASSETS', 'INVENTORY', 'PROFILE'].map(tab =>
        new ButtonBuilder().setCustomId(`nav:${tab.toLowerCase()}`).setLabel(tab)
          .setStyle(view === tab.toLowerCase() ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(view === tab.toLowerCase()))),
  ];

  // Context menus — only on detail views
  if (view === 'fight') {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fight_again').setLabel('⚔️ Again').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('bulk_fight').setLabel('⚔️ x5').setStyle(ButtonStyle.Danger)));
    if (player) rows.push(selectMenu('fight_select', 'Choose enemy...',
      Object.entries(ENEMIES).filter(([, e]) => player.level >= e.minLevel).map(([id, e]) => ({
        label: `${e.icon} ${e.name}`, description: `Lv.${e.minLevel}+ | ⚡${ZONES[e.zone]?.staminaCost || 1}`, value: id }))));
  }
  if (view === 'raids' && player) rows.push(selectMenu('raid_select', 'Choose boss...',
    Object.entries(RAIDS).filter(([, r]) => player.level >= r.minLevel).map(([id, r]) => ({
      label: `${r.icon} ${r.name}`, description: `⚡${r.staminaCost} | ❤${r.hp}`, value: id }))));
  if (view === 'assets' && player) {
    const owned = new Set(Player.getPlayerAssets(playerId).map(r => r.asset_id));
    const buyable = Object.entries(ASSETS).filter(([id, a]) => !owned.has(id) && player.level >= a.minLevel);
    if (buyable.length) rows.push(selectMenu('buy_asset', '🏠 Buy asset...',
      buyable.map(([id, a]) => ({ label: `${a.icon} ${a.name} (${a.cost}g)`, description: `+${a.incomePerHr}/hr | +${a.networthValue} net`, value: id }))));
  }
  if (view === 'inventory' && player) {
    const unequipped = Player.getAllEquipment(playerId).filter(r => !r.equipped);
    if (unequipped.length) {
      rows.push(selectMenu('equip', 'Equip item...',
        unequipped.slice(0, 24).map(r => { const c = EQUIPMENT[r.item_id]; return c ? { label: `${c.icon} ${c.name} (${c.slot})`, description: Object.entries(c.stats).map(([k, v]) => `+${v} ${k}`).join(', '), value: `${r.id}` } : null; }).filter(Boolean)));
      rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('sell_junk').setLabel('Sell Junk').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('sell_outgrown').setLabel('Sell Outgrown').setStyle(ButtonStyle.Secondary)));
    }
  }
  if (view === 'home' && player) {
    const hired = new Set(Player.getPlayerCrew(playerId).map(r => r.crew_id));
    const hireable = Object.entries(CREW).filter(([id, c]) => !hired.has(id) && player.level >= c.minLevel);
    if (hireable.length) rows.push(selectMenu('hire_crew', '🤵 Hire crew...',
      hireable.map(([id, c]) => ({ label: `${c.icon} ${c.name} (${c.cost}g)`, description: `+${c.bonusValue} ${c.bonusType}`, value: id }))));
  }
  if (player?.pending_skill_picks > 0) {
    const offers = Player.getSkillOffers(playerId);
    if (offers) rows.push(selectMenu('pick_skill', '🎯 Pick skill...',
      [offers.skill1, offers.skill2, offers.skill3].map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null).filter(Boolean)));
  }
  return rows;
}
