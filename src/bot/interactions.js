import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import * as P from '../core/player.js';

function bar(pct, width = 12) {
  const filled = Math.round(Math.max(0, Math.min(1, pct)) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

function renderHome(player) {
  const v = P.getCultivationView(player);
  const lines = [
    `${v.realm.icon} **${v.realm.name} · ${v.stage.name}**`,
    v.stepName,
    `${bar(v.progress)} ${(v.progress * 100) | 0}%`,
  ];
  if (v.isFinalCap) lines.push('*(peak of the known path)*');
  else if (v.etaSeconds > 0) lines.push(`~${P.formatDuration(v.etaSeconds)} to next step`);
  if (v.prowessBonusPct > 0 || v.tribulationCharge > 0) {
    lines.push(`prowess +${v.prowessBonusPct}% · charge ${v.tribulationCharge}`);
  }
  return lines.join('\n');
}

function buildUI(player) {
  const v = P.getCultivationView(player);
  return [new ActionRowBuilder().addComponents(
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

  if (interaction.customId === 'breakthrough') {
    const r = P.breakthrough(id);
    P.tickCultivation(id);
    const player = P.getPlayer(id);
    const banner = r.success
      ? (r.kind === 'realm' ? `✨ **Breakthrough to ${r.next}**` : `${r.previous} → **${r.next}**`)
      : `⚠️ ${r.error}`;
    await interaction.update({ content: `${banner}\n\n${renderHome(player)}`, components: buildUI(player) });
    return;
  }

  P.tickCultivation(id);
  const player = P.getPlayer(id);
  await interaction.update({ content: renderHome(player), components: buildUI(player) });
}

export async function handleSelectMenu(interaction) {
  await interaction.update({ content: '(Not implemented)', components: [] });
}
