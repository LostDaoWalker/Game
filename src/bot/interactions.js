import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { getOrCreatePlayer, getPlayer } from '../core/player.js';
import { BUSINESSES, MISSIONS, UPGRADES } from '../core/config.js';
import { renderView, handleAction } from '../game/engine.js';

// Track which view each player is on
const playerViews = new Map();

// ─── Slash Command Handler ──────────────────────

export async function handleNexusCommand(interaction) {
  const player = getOrCreatePlayer(interaction.user.id, interaction.user.username);
  playerViews.set(player.id, 'dashboard');

  const image = renderView(player.id, 'dashboard');
  const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });

  await interaction.reply({
    files: [attachment],
    components: buildNavigation('dashboard', player.id),
    ephemeral: false,
  });
}

// ─── Button Interaction Handler ─────────────────

export async function handleButton(interaction) {
  const playerId = interaction.user.id;
  const player = getPlayer(playerId);
  if (!player) {
    return interaction.reply({ content: '❌ Use `/nexus` to start playing.', ephemeral: true });
  }

  const [action, ...args] = interaction.customId.split(':');

  switch (action) {
    case 'nav': {
      const view = args[0];
      playerViews.set(playerId, view);
      const image = renderView(playerId, view);
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        files: [attachment],
        components: buildNavigation(view, playerId),
      });
      break;
    }

    case 'buy_biz': {
      const bizType = args[0];
      const result = handleAction(playerId, 'buy_business', { type: bizType });
      const view = playerViews.get(playerId) || 'business';
      const image = renderView(playerId, view);
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation(view, playerId),
      });
      break;
    }

    case 'mission': {
      const missionAction = args[0]; // start or claim
      const missionId = args[1];

      let result;
      if (missionAction === 'start') {
        result = handleAction(playerId, 'start_mission', { missionId });
      } else {
        result = handleAction(playerId, 'claim_mission', { missionId });
      }

      const view = 'missions';
      const image = renderView(playerId, view);
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation(view, playerId),
      });
      break;
    }

    case 'crypto': {
      const side = args[0]; // buy or sell
      const amount = parseInt(args[1]) || 1;
      const result = handleAction(playerId, side === 'buy' ? 'buy_crypto' : 'sell_crypto', { amount });
      const view = 'market';
      const image = renderView(playerId, view);
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation(view, playerId),
      });
      break;
    }

    case 'buy_upg': {
      const upgradeId = args[0];
      const result = handleAction(playerId, 'buy_upgrade', { upgradeId });
      const view = 'upgrades';
      const image = renderView(playerId, view);
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation(view, playerId),
      });
      break;
    }

    case 'collect': {
      const result = handleAction(playerId, 'collect_income');
      const view = playerViews.get(playerId) || 'dashboard';
      const image = renderView(playerId, view);
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation(view, playerId),
      });
      break;
    }

    case 'refresh': {
      const view = playerViews.get(playerId) || 'dashboard';
      const image = renderView(playerId, view);
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: '',
        files: [attachment],
        components: buildNavigation(view, playerId),
      });
      break;
    }

    default:
      await interaction.reply({ content: '❌ Unknown action', ephemeral: true });
  }
}

// ─── Select Menu Handler ────────────────────────

export async function handleSelectMenu(interaction) {
  const playerId = interaction.user.id;
  const player = getPlayer(playerId);
  if (!player) {
    return interaction.reply({ content: '❌ Use `/nexus` to start playing.', ephemeral: true });
  }

  const [menuType] = interaction.customId.split(':');
  const value = interaction.values[0];

  switch (menuType) {
    case 'biz_select': {
      const result = handleAction(playerId, 'buy_business', { type: value });
      const image = renderView(playerId, 'business');
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation('business', playerId),
      });
      break;
    }

    case 'mission_select': {
      const [action, missionId] = value.split('_');
      let result;
      if (action === 'claim') {
        result = handleAction(playerId, 'claim_mission', { missionId });
      } else {
        result = handleAction(playerId, 'start_mission', { missionId });
      }
      const image = renderView(playerId, 'missions');
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation('missions', playerId),
      });
      break;
    }

    case 'upgrade_select': {
      const result = handleAction(playerId, 'buy_upgrade', { upgradeId: value });
      const image = renderView(playerId, 'upgrades');
      const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
      await interaction.update({
        content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
        files: [attachment],
        components: buildNavigation('upgrades', playerId),
      });
      break;
    }
  }
}

// ─── Navigation Builder ─────────────────────────

function buildNavigation(view, playerId) {
  const rows = [];

  // Row 1: Navigation tabs
  const navRow = new ActionRowBuilder().addComponents(
    makeNavBtn('DASHBOARD', 'nav:dashboard', view === 'dashboard', ButtonStyle.Primary),
    makeNavBtn('BUSINESS', 'nav:business', view === 'business', ButtonStyle.Primary),
    makeNavBtn('MISSIONS', 'nav:missions', view === 'missions', ButtonStyle.Primary),
    makeNavBtn('MARKET', 'nav:market', view === 'market', ButtonStyle.Primary),
    makeNavBtn('UPGRADES', 'nav:upgrades', view === 'upgrades', ButtonStyle.Primary),
  );
  rows.push(navRow);

  // Row 2: Secondary nav + utility
  const utilRow = new ActionRowBuilder().addComponents(
    makeNavBtn('PROFILE', 'nav:profile', view === 'profile', ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('collect').setLabel('💰 Collect').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('refresh').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
  );
  rows.push(utilRow);

  // Row 3-5: Context-specific actions
  switch (view) {
    case 'business':
      rows.push(buildBusinessSelect(playerId));
      break;
    case 'missions':
      rows.push(buildMissionSelect(playerId));
      break;
    case 'market':
      rows.push(buildCryptoButtons('buy'));
      rows.push(buildCryptoButtons('sell'));
      break;
    case 'upgrades':
      rows.push(buildUpgradeSelect(playerId));
      break;
  }

  return rows;
}

function makeNavBtn(label, id, active, style) {
  return new ButtonBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(active ? ButtonStyle.Success : style)
    .setDisabled(active);
}

function buildBusinessSelect(playerId) {
  const options = Object.entries(BUSINESSES).map(([key, config]) => ({
    label: `${config.icon} ${config.name}`,
    description: config.description.slice(0, 50),
    value: key,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('biz_select')
    .setPlaceholder('Buy / Upgrade a business...')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

function buildMissionSelect(playerId) {
  const player = getPlayer(playerId);
  const now = Math.floor(Date.now() / 1000);
  const options = [];
  const activeMissions = player ? getActiveMissionsMap(playerId) : {};

  for (const [key, config] of Object.entries(MISSIONS)) {
    if (player.level < config.minLevel) continue;
    const am = activeMissions[key];
    if (am && am.completes_at <= now) {
      options.push({
        label: `✅ Claim: ${config.icon} ${config.name}`,
        description: `Claim rewards!`,
        value: `claim_${key}`,
      });
    } else if (!am) {
      options.push({
        label: `${config.icon} ${config.name}`,
        description: `⚡${config.energyCost} | ${formatDur(config.duration)} | ₡${config.rewards.credits[0]}-${config.rewards.credits[1]}`,
        value: `start_${key}`,
      });
    }
  }

  if (options.length === 0) {
    options.push({
      label: 'No missions available',
      description: 'All missions are in progress',
      value: 'none',
    });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('mission_select')
    .setPlaceholder('Start or claim a mission...')
    .addOptions(options.slice(0, 25));

  return new ActionRowBuilder().addComponents(select);
}

function buildCryptoButtons(side) {
  const amounts = [1, 5, 10, 50];
  const style = side === 'buy' ? ButtonStyle.Success : ButtonStyle.Danger;
  const label = side === 'buy' ? 'Buy' : 'Sell';

  const row = new ActionRowBuilder();
  for (const amount of amounts) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`crypto:${side}:${amount}`)
        .setLabel(`${label} ${amount}x`)
        .setStyle(style)
    );
  }
  row.addComponents(
    new ButtonBuilder()
      .setCustomId(`crypto:${side}:100`)
      .setLabel(`${label} 100x`)
      .setStyle(style)
  );
  return row;
}

function buildUpgradeSelect(playerId) {
  const options = Object.entries(UPGRADES).map(([key, config]) => ({
    label: `${config.icon} ${config.name} (₡${config.cost})`,
    description: config.description,
    value: key,
  }));

  const select = new StringSelectMenuBuilder()
    .setCustomId('upgrade_select')
    .setPlaceholder('Install an augmentation...')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(select);
}

// Helpers
import { getActiveMissions } from '../core/player.js';

function getActiveMissionsMap(playerId) {
  const missions = getActiveMissions(playerId);
  const map = {};
  for (const m of missions) map[m.mission_id] = m;
  return map;
}

function formatDur(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}
