import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } from 'discord.js';
import * as Player from '../core/player.js';
import { ENEMIES, RAIDS, ZONES, SKILLS, EQUIPMENT, ASSETS, CREW, AVATARS, ANCESTORS, TABS } from '../core/config.js';
import { renderHome } from '../rendering/views/home.js';
import { renderFight } from '../rendering/views/fight.js';
import { renderRaids } from '../rendering/views/raids.js';
import { renderInventory } from '../rendering/views/inventory.js';
import { renderSkills } from '../rendering/views/skills.js';
import { renderProfile } from '../rendering/views/profile.js';
import { renderAssets } from '../rendering/views/assets.js';
import { renderGrind } from '../rendering/views/grind.js';

const activeView = new Map();
const lastEnemy = new Map();

const equippedConfigs = playerId => Player.getEquippedItems(playerId).map(row => EQUIPMENT[row.item_id]).filter(Boolean);
const skillConfigs = playerId => Player.getPlayerSkills(playerId)
  .map(row => { const config = SKILLS[row.skill_id]; return config ? { ...config, level: row.level, id: row.skill_id } : null; })
  .filter(Boolean);

// Runs housekeeping + fetches fresh player — used by all views except grind (which does its own)
function freshPlayer(playerId) {
  Player.regenStamina(playerId);
  Player.collectAssetIncome(playerId);
  Player.updateNetworth(playerId);
  return Player.getPlayer(playerId);
}

function renderView(playerId, view, extra) {
  // Grind fast path: extra already has fresh player, skip all housekeeping
  if (view === 'grind' && extra?.player) return renderGrind(extra.player, extra);

  const player = freshPlayer(playerId);
  if (!player) return null;

  const renderers = {
    home: () => renderHome(player, equippedConfigs(playerId), skillConfigs(playerId), Player.getRecentLog(playerId), Player.getLeaderboard(), Player.highestAssetIcon(playerId)),
    fight: () => renderFight(player, extra),
    raids: () => renderRaids(player, extra),
    assets: () => renderAssets(player, Player.getPlayerAssets(playerId)),
    inventory: () => renderInventory(player, Player.getAllEquipment(playerId), Player.getEquippedItems(playerId)),
    skills: () => renderSkills(player, skillConfigs(playerId), Player.getSkillOffers(playerId)),
    profile: () => renderProfile(player, Player.getAllEquipment(playerId), skillConfigs(playerId), Player.getRank(playerId)),
  };
  return (renderers[view] || renderers.home)();
}

function formatCombatResult(result, view) {
  if (!result.success) return result;
  const lines = [];
  lines.push(result.won ? `⚔️ Beat ${result.foe.name}! +${result.gold}g +${result.xp}xp` : `💀 Lost to ${result.foe.name}. +${result.xp}xp`);
  if (result.lootItem) {
    const r = result.lootItem.rarity;
    lines.push(r === 'legendary' ? `🌟 LEGENDARY: ${result.lootItem.icon} ${result.lootItem.name}!!!` :
      r === 'epic' ? `✨ EPIC: ${result.lootItem.icon} ${result.lootItem.name}!` :
      `🎁 ${result.lootItem.icon} ${result.lootItem.name}${result.autoEquipped ? ' (equipped!)' : ''}`);
  }
  if (result.leveled) lines.push(`🎉 LEVEL UP → Lv.${result.newLevel}!`);
  return { success: true, message: lines.join('\n'), view, extra: result };
}

function executeAction(playerId, action, args = {}) {
  Player.regenStamina(playerId);
  const actions = {
    grind: () => {
      const result = Player.grind(playerId);
      let msg = `⚔️ ${result.wins}W/${result.losses}L → +${result.goldEarned}g +${result.xpEarned}xp`;
      if (result.leveled) msg += ` | 🎉 Lv.${result.newLevel}`;
      if (result.player.pending_skill_picks > 0) msg += ` | 🎯 ${result.player.pending_skill_picks} skill pick${result.player.pending_skill_picks > 1 ? 's' : ''}`;
      if (!result.wins && !result.losses) msg = '⏸️ Out of stamina';
      return { success: true, message: msg, view: 'grind', extra: result };
    },
    fight_enemy: () => { lastEnemy.set(playerId, args.enemyId); return formatCombatResult(Player.fightEnemy(playerId, args.enemyId), 'fight'); },
    raid: () => formatCombatResult(Player.fightRaid(playerId, args.raidId), 'raids'),
    heal: () => { const r = Player.healPlayer(playerId); return r.success ? { success: true, message: `❤️ Healed ${r.healed} HP (-${r.cost}g)`, view: null } : r; },
    buy_asset: () => { const r = Player.buyAsset(playerId, args.assetId); return r.success ? { success: true, message: `Bought ${r.asset.icon} ${r.asset.name}!`, view: 'assets' } : r; },
    hire_crew: () => { const r = Player.hireCrew(playerId, args.crewId); return r.success ? { success: true, message: `Hired ${r.crew.icon} ${r.crew.name}!`, view: 'home' } : r; },
    daily: () => { const r = Player.claimDaily(playerId); return r.success ? { success: true, message: `🎁 +${r.gold}g (streak ${r.streak}/${r.maxStreak})`, view: null } : r; },
    equip: () => { const r = Player.equipItem(playerId, args.itemRowId); return r.success ? { success: true, message: `Equipped ${r.item.icon} ${r.item.name}`, view: 'inventory' } : r; },
    sell_junk: () => { const r = Player.sellAllJunk(playerId, 'common'); return r.success ? { success: true, message: `Sold ${r.count} items for ${r.gold}g`, view: 'inventory' } : r; },
    pick_skill: () => { const r = Player.pickSkill(playerId, args.skillId); return r.success ? { success: true, message: `${r.skill.icon} ${r.skill.name}${r.newLevel > 1 ? ` Lv.${r.newLevel}` : ''}`, view: 'skills' } : r; },
    set_avatar: () => { const r = Player.setAvatar(playerId, args.avatarId); return r.success ? { success: true, message: `🙏 Now worshipping: ${r.ancestor.name}`, view: 'profile' } : r; },
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
  const payload = { files: [new AttachmentBuilder(renderView(playerId, view, extra), { name: 'tianming.jpg' })], components: buildUI(view, playerId), content: '' };
  isReply ? await interaction.reply(payload) : await interaction.update(payload);
}

async function sendResult(interaction, playerId, result, fallback) {
  const view = result.view || fallback || activeView.get(playerId) || 'home';
  activeView.set(playerId, view);
  await interaction.update({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    files: [new AttachmentBuilder(renderView(playerId, view, result.extra || null), { name: 'tianming.jpg' })],
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
  if (!Player.getPlayer(playerId)) return interaction.reply({ content: '❌ Use `/tianming`', ephemeral: true });
  const [action, ...args] = interaction.customId.split(':');
  if (action === 'nav') { activeView.set(playerId, args[0]); return sendView(interaction, playerId, args[0]); }
  return sendResult(interaction, playerId, executeAction(playerId, action, {}));
}

export async function handleSelectMenu(interaction) {
  const playerId = interaction.user.id;
  const [menuId] = interaction.customId.split(':');
  const val = interaction.values[0];
  if (!Player.getPlayer(playerId)) return interaction.reply({ content: '❌ Use `/tianming`', ephemeral: true });
  const map = {
    fight_select: ['fight_enemy', { enemyId: val }], raid_select: ['raid', { raidId: val }],
    equip: ['equip', { itemRowId: +val }], pick_skill: ['pick_skill', { skillId: val }],
    buy_asset: ['buy_asset', { assetId: val }], hire_crew: ['hire_crew', { crewId: val }],
    avatar_select: ['set_avatar', { avatarId: val }],
  };
  const [action, args] = map[menuId] || ['unknown', {}];
  const fallback = { equip: 'inventory', pick_skill: 'skills', buy_asset: 'assets', hire_crew: 'home', avatar_select: 'profile' }[menuId];
  return sendResult(interaction, playerId, executeAction(playerId, action, args), fallback);
}

// ── UI — cached player passed through to avoid re-fetching ──

function buildUI(view, playerId) {
  const player = Player.getPlayer(playerId);
  const rows = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('grind').setLabel('🔥 CULTIVATE').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('daily').setLabel('🎁').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('heal').setLabel('❤️').setStyle(ButtonStyle.Secondary)),
    new ActionRowBuilder().addComponents(
      ...TABS.map(tab =>
        new ButtonBuilder().setCustomId(`nav:${tab.toLowerCase()}`).setLabel(tab)
          .setStyle(view === tab.toLowerCase() ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(view === tab.toLowerCase()))),
  ];

  if (view === 'fight') {
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
        new ButtonBuilder().setCustomId('sell_junk').setLabel('Sell Junk').setStyle(ButtonStyle.Secondary)));
    }
  }
  if (view === 'home' && player) {
    const hired = new Set(Player.getPlayerCrew(playerId).map(r => r.crew_id));
    const hireable = Object.entries(CREW).filter(([id, c]) => !hired.has(id) && player.level >= c.minLevel);
    if (hireable.length) rows.push(selectMenu('hire_crew', '🧘 Recruit companion...',
      hireable.map(([id, c]) => ({ label: `${c.icon} ${c.name} (${c.cost}g)`, description: `+${c.bonusValue} ${c.bonusType}`, value: id }))));
  }
  if (view === 'profile' && player) {
    rows.push(selectMenu('avatar_select', '🙏 Choose ancestor...',
      Object.entries(ANCESTORS).map(([id, a]) => ({
        label: `${a.icon} ${a.name}`, description: player.ancestor === id ? `✓ Worshipping (${player.ancestor_favor} favor)` : a.desc.slice(0, 50), value: id }))));
  }
  if (player?.pending_skill_picks > 0) {
    const offers = Player.getSkillOffers(playerId);
    if (offers) rows.push(selectMenu('pick_skill', '🎯 Pick skill...',
      [offers.skill1, offers.skill2, offers.skill3].map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null).filter(Boolean)));
  }
  return rows;
}
