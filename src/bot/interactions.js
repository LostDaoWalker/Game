import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, AttachmentBuilder,
} from 'discord.js';
import {
  getOrCreatePlayer, getPlayer, getPlayerEquipment,
  getEquippedItems, getActiveMissions, getSkillOffers,
} from '../core/player.js';
import {
  ENEMIES, RAIDS, ZONES, SKILLS, EQUIPMENT, EQUIPMENT_SLOTS, ECONOMY,
} from '../core/config.js';
import { renderView, handleAction } from '../game/engine.js';

// Track active views per player
const views = new Map();

// ═══════════════════════════════════════════════
// Slash Command — entry point
// ═══════════════════════════════════════════════

export async function handleNexusCommand(interaction) {
  const p = getOrCreatePlayer(interaction.user.id, interaction.user.username);
  views.set(p.id, 'dashboard');
  await sendView(interaction, p.id, 'dashboard', null, true);
}

// ═══════════════════════════════════════════════
// Button Handler
// ═══════════════════════════════════════════════

export async function handleButton(interaction) {
  const pid = interaction.user.id;
  if (!getPlayer(pid)) return interaction.reply({ content: '❌ Use `/nexus` first.', ephemeral: true });

  const [action, ...args] = interaction.customId.split(':');

  switch (action) {
    case 'nav': {
      views.set(pid, args[0]);
      return sendView(interaction, pid, args[0]);
    }
    case 'fight': {
      const result = handleAction(pid, 'fight_enemy', { enemyId: args[0] });
      return sendResult(interaction, pid, result);
    }
    case 'pvp': {
      const result = handleAction(pid, 'pvp');
      return sendResult(interaction, pid, result);
    }
    case 'raid': {
      const result = handleAction(pid, 'raid', { raidId: args[0] });
      return sendResult(interaction, pid, result);
    }
    case 'heal': {
      const result = handleAction(pid, 'heal');
      return sendResult(interaction, pid, result);
    }
    case 'refresh': {
      return sendView(interaction, pid, views.get(pid) || 'dashboard');
    }
    default:
      return interaction.reply({ content: '❌ Unknown', ephemeral: true });
  }
}

// ═══════════════════════════════════════════════
// Select Menu Handler
// ═══════════════════════════════════════════════

export async function handleSelectMenu(interaction) {
  const pid = interaction.user.id;
  if (!getPlayer(pid)) return interaction.reply({ content: '❌ Use `/nexus` first.', ephemeral: true });

  const [menu] = interaction.customId.split(':');
  const value = interaction.values[0];

  switch (menu) {
    case 'equip': {
      const result = handleAction(pid, 'equip', { itemRowId: parseInt(value) });
      return sendResult(interaction, pid, result, 'inventory');
    }
    case 'sell': {
      const result = handleAction(pid, 'sell', { itemRowId: parseInt(value) });
      return sendResult(interaction, pid, result, 'inventory');
    }
    case 'pick_skill': {
      const result = handleAction(pid, 'pick_skill', { skillId: value });
      return sendResult(interaction, pid, result, 'skills');
    }
    case 'fight_select': {
      const result = handleAction(pid, 'fight_enemy', { enemyId: value });
      return sendResult(interaction, pid, result);
    }
    case 'raid_select': {
      const result = handleAction(pid, 'raid', { raidId: value });
      return sendResult(interaction, pid, result);
    }
  }
}

// ═══════════════════════════════════════════════
// Response Builders
// ═══════════════════════════════════════════════

async function sendView(interaction, pid, view, extra = null, isReply = false) {
  const image = renderView(pid, view, extra);
  const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });
  const payload = { files: [attachment], components: buildComponents(view, pid), content: '' };

  if (isReply) await interaction.reply(payload);
  else await interaction.update(payload);
}

async function sendResult(interaction, pid, result, viewOverride) {
  const view = viewOverride || result.view || views.get(pid) || 'dashboard';
  views.set(pid, view);
  const image = renderView(pid, view, result.extra || null);
  const attachment = new AttachmentBuilder(image, { name: 'nexus.png' });

  await interaction.update({
    content: result.success ? `✅ ${result.message}` : `❌ ${result.message}`,
    files: [attachment],
    components: buildComponents(view, pid),
  });
}

// ═══════════════════════════════════════════════
// Component Builders (buttons + menus per view)
// ═══════════════════════════════════════════════

function buildComponents(view, pid) {
  const rows = [buildNavRow(view), buildUtilRow(view)];

  switch (view) {
    case 'fight':     rows.push(buildFightSelect(pid)); break;
    case 'raids':     rows.push(buildRaidSelect(pid)); break;
    case 'inventory': rows.push(buildEquipSelect(pid)); break;
    case 'skills':    { const r = buildSkillSelect(pid); if (r) rows.push(r); break; }
  }

  return rows.filter(Boolean);
}

function buildNavRow(active) {
  const tabs = [
    ['DASHBOARD', 'nav:dashboard'], ['FIGHT', 'nav:fight'], ['RAIDS', 'nav:raids'],
    ['INVENTORY', 'nav:inventory'], ['SKILLS', 'nav:skills'],
  ];
  return new ActionRowBuilder().addComponents(
    ...tabs.map(([label, id]) =>
      new ButtonBuilder()
        .setCustomId(id)
        .setLabel(label)
        .setStyle(active === id.split(':')[1] ? ButtonStyle.Success : ButtonStyle.Primary)
        .setDisabled(active === id.split(':')[1])
    ),
  );
}

function buildUtilRow(view) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('nav:profile').setLabel('PROFILE')
      .setStyle(view === 'profile' ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(view === 'profile'),
    new ButtonBuilder().setCustomId('pvp').setLabel('⚔️ PVP Arena').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('heal').setLabel('❤️ Heal').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('refresh').setLabel('🔄').setStyle(ButtonStyle.Secondary),
  );
}

function buildFightSelect(pid) {
  const player = getPlayer(pid);
  const options = Object.entries(ENEMIES)
    .filter(([, e]) => player.level >= e.minLevel)
    .map(([id, e]) => ({
      label: `${e.icon} ${e.name}`,
      description: `Lv.${e.minLevel}+ | ⚡${ZONES[e.zone]?.staminaCost || 1} | ${e.xp[0]}-${e.xp[1]}xp`,
      value: id,
    }));

  if (options.length === 0) {
    options.push({ label: 'No enemies available', description: 'Level up to unlock zones', value: 'none' });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('fight_select').setPlaceholder('Choose an enemy to fight...').addOptions(options.slice(0, 25)),
  );
}

function buildRaidSelect(pid) {
  const player = getPlayer(pid);
  const options = Object.entries(RAIDS)
    .filter(([, r]) => player.level >= r.minLevel)
    .map(([id, r]) => ({
      label: `${r.icon} ${r.name}`,
      description: `⚡${r.staminaCost} | ❤${r.hp} HP | ${r.rewards.gold[0]}-${r.rewards.gold[1]}g`,
      value: id,
    }));

  if (options.length === 0) {
    options.push({ label: 'No raids available', description: 'Level up to unlock raids', value: 'none' });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('raid_select').setPlaceholder('Choose a raid boss...').addOptions(options.slice(0, 25)),
  );
}

function buildEquipSelect(pid) {
  const equipment = getPlayerEquipment(pid);
  const unequipped = equipment.filter(e => !e.equipped);
  const options = unequipped.slice(0, 24).map(e => {
    const cfg = EQUIPMENT[e.item_id];
    if (!cfg) return null;
    return {
      label: `${cfg.icon} ${cfg.name} (${cfg.slot})`,
      description: Object.entries(cfg.stats).map(([k, v]) => `+${v} ${k}`).join(', '),
      value: `${e.id}`,
    };
  }).filter(Boolean);

  if (options.length === 0) {
    options.push({ label: 'No items to equip', description: 'Fight enemies for gear drops', value: 'none' });
  }

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('equip').setPlaceholder('Equip an item...').addOptions(options.slice(0, 25)),
  );
}

function buildSkillSelect(pid) {
  const player = getPlayer(pid);
  if (!player || player.pending_skill_picks <= 0) return null;

  const offers = getSkillOffers(pid);
  if (!offers) return null;

  const options = [offers.skill1, offers.skill2, offers.skill3]
    .map(id => SKILLS[id] ? { label: `${SKILLS[id].icon} ${SKILLS[id].name}`, description: SKILLS[id].description.slice(0, 50), value: id } : null)
    .filter(Boolean);

  if (options.length === 0) return null;

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('pick_skill').setPlaceholder('🎯 Pick a skill...').addOptions(options),
  );
}
