import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import * as P from '../core/player.js';

function bar(pct, width = 12) {
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function renderHome(player) {
  const v = P.getCultivationView(player);
  const lines = [
    `${v.realm.icon} **${v.realm.name} · ${v.stage.name} · ${v.stepName}**`,
    `${bar(v.progress)} ${v.qi}/${v.qiCost} xp`,
  ];
  if (v.isFinalCap) lines.push('*(peak of the known path)*');
  return lines.join('\n');
}

function buildUI(player) {
  const v = P.getCultivationView(player);
  const meditateLabel = v.meditateCdLeft > 0 ? `🧘 Meditate (${P.formatDuration(v.meditateCdLeft)})` : '🧘 Meditate';
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('meditate')
      .setLabel(meditateLabel)
      .setStyle(ButtonStyle.Success)
      .setDisabled(!v.canMeditate),
    new ButtonBuilder()
      .setCustomId('breakthrough')
      .setLabel('⚡ Breakthrough')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!v.canBreakthrough || v.isFinalCap),
  )];
}

export async function handleCommand(interaction) {
  const id = interaction.user.id;
  P.getOrCreatePlayer(id, interaction.user.username);
  P.tickCultivation(id);
  const player = P.getPlayer(id);
  await interaction.reply({ content: renderHome(player), components: buildUI(player) });
}

export async function handleButton(interaction) {
  const id = interaction.user.id;
  if (!P.getPlayer(id)) return interaction.reply({ content: '❌ Use `/tianming`', ephemeral: true });

  let banner = null;

  if (interaction.customId === 'meditate') {
    const r = P.meditate(id);
    banner = r.success ? `🧘 +${r.qiGained} xp` : `⚠️ ${r.error}`;
  } else if (interaction.customId === 'breakthrough') {
    const r = P.breakthrough(id);
    P.tickCultivation(id);
    banner = r.success
      ? (r.kind === 'realm' ? `✨ **Breakthrough to ${r.next}**` : `${r.previous} → **${r.next}**`)
      : `⚠️ ${r.error}`;
  } else {
    P.tickCultivation(id);
  }

  const player = P.getPlayer(id);
  const content = banner ? `${banner}\n\n${renderHome(player)}` : renderHome(player);
  await interaction.update({ content, components: buildUI(player) });
}

export async function handleSelectMenu(interaction) {
  await interaction.update({ content: '(Not implemented)', components: [] });
}
