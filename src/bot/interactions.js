import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import * as P from '../core/player.js';
import { TALENT_RARITY_COLORS } from '../core/config.js';

function bar(pct, width = 12) {
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

// ── Home screen ──

function renderHome(player) {
  const v = P.getCultivationView(player);
  const lines = [
    `${v.realm.icon} **${v.realm.name} · ${v.stage.name} · ${v.stepName}**`,
    `${bar(v.progress)} ${v.qi}/${v.qiCost} xp`,
  ];
  if (v.isFinalCap) lines.push('*(peak of the known path)*');
  return lines.join('\n');
}

function homeUI(player) {
  const v = P.getCultivationView(player);
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('cultivate').setLabel('🔥 Cultivate').setStyle(ButtonStyle.Success).setDisabled(!v.canCultivate),
    new ButtonBuilder().setCustomId('breakthrough').setLabel('⚡ Breakthrough').setStyle(ButtonStyle.Primary).setDisabled(!v.canBreakthrough || v.isFinalCap),
    new ButtonBuilder().setCustomId('view:profile').setLabel('📜 Profile').setStyle(ButtonStyle.Secondary),
  )];
}

// ── Profile screen (private — ephemeral message makes this safe) ──

function renderProfile(playerId) {
  const player = P.getPlayer(playerId);
  const v = P.getCultivationView(player);
  const stats = P.getEffectiveStats(playerId);
  const talents = P.getTalents(playerId);

  const lines = [`📜 **Profile**`, `${v.realm.icon} ${v.realm.name} · ${v.stage.name} · ${v.stepName}`];

  lines.push('', '**Talents**');
  if (!talents.length) lines.push('*(none yet)*');
  else for (const t of talents) {
    const tag = TALENT_RARITY_COLORS[t.rarity] || '⚪';
    const effects = Object.entries(t.effects || {}).map(formatEffect).filter(Boolean).join(', ');
    lines.push(`${tag} **${t.name}** — ${effects || '*no effect*'}`);
  }

  lines.push('', '**Stats**');
  lines.push(`Cultivation rate: ${stats.cultivationRate.toFixed(2)} xp/min` + (stats.rateBonusPct ? ` *(+${stats.rateBonusPct}% from talents)*` : ''));
  lines.push(`Prowess: +${stats.totalProwessBonusPct}%` + (stats.prowessFromTalents ? ` *(${stats.prowessFromPerfections} perfections + ${stats.prowessFromTalents} talents)*` : ''));
  if (stats.cultivateGrantBonus) lines.push(`Cultivate bonus: +${stats.cultivateGrantBonus} xp/click`);

  return lines.join('\n');
}

function formatEffect([key, value]) {
  switch (key) {
    case 'cultivationRateBonusPct': return `+${value}% rate`;
    case 'cultivateGrantBonus':     return `+${value} xp/click`;
    case 'prowessBonusPct':         return `+${value}% prowess`;
    default:                         return null;
  }
}

function profileUI() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('view:home').setLabel('← Back').setStyle(ButtonStyle.Secondary),
  )];
}

// ── Discord handlers ──

async function showHome(interaction, banner = null) {
  const id = interaction.user.id;
  P.tickCultivation(id);
  const player = P.getPlayer(id);
  const content = banner ? `${banner}\n\n${renderHome(player)}` : renderHome(player);
  const payload = { content, components: homeUI(player) };
  return interaction.deferred || interaction.replied ? interaction.editReply(payload) : interaction.update(payload);
}

export async function handleCommand(interaction) {
  const id = interaction.user.id;
  P.getOrCreatePlayer(id, interaction.user.username);
  P.tickCultivation(id);
  const player = P.getPlayer(id);
  await interaction.reply({ content: renderHome(player), components: homeUI(player), flags: 64 /* ephemeral */ });
}

export async function handleButton(interaction) {
  const id = interaction.user.id;
  if (!P.getPlayer(id)) return interaction.reply({ content: '❌ Use `/tianming`', ephemeral: true });

  const [action, ...args] = interaction.customId.split(':');

  if (action === 'view') {
    if (args[0] === 'profile') {
      return interaction.update({ content: renderProfile(id), components: profileUI() });
    }
    // view:home
    return showHome(interaction);
  }

  let banner = null;

  if (action === 'cultivate') {
    const r = P.cultivate(id);
    banner = r.success ? `🔥 +${r.qiGained} xp` : `⚠️ ${r.error}`;
  } else if (action === 'breakthrough') {
    const r = P.breakthrough(id);
    P.tickCultivation(id);
    if (r.success) {
      banner = r.kind === 'realm'
        ? `✨ **Breakthrough to ${r.next}**` + (r.talent ? `\n🌟 New talent: **${r.talent.name}** *(${r.talent.rarity})*` : '')
        : `${r.previous} → **${r.next}**`;
    } else {
      banner = `⚠️ ${r.error}`;
    }
  } else {
    P.tickCultivation(id);
  }

  const player = P.getPlayer(id);
  const content = banner ? `${banner}\n\n${renderHome(player)}` : renderHome(player);
  await interaction.update({ content, components: homeUI(player) });
}

export async function handleSelectMenu(interaction) {
  await interaction.update({ content: '(Not implemented)', components: [] });
}
