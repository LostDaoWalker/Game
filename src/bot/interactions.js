import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import * as P from '../core/player.js';
import { TALENT_RARITY_COLORS, ROLLS, REALMS } from '../core/config.js';

const RARITY_COLORS = TALENT_RARITY_COLORS; // same mapping for daoists

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
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('cultivate').setLabel('🔥 Cultivate').setStyle(ButtonStyle.Success).setDisabled(!v.canCultivate),
      new ButtonBuilder().setCustomId('breakthrough').setLabel('⚡ Breakthrough').setStyle(ButtonStyle.Primary).setDisabled(!v.canBreakthrough || v.isFinalCap),
      new ButtonBuilder().setCustomId('pvp').setLabel('⚔️ Fight').setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('view:profile').setLabel('📜 Profile').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('view:team').setLabel('👥 Team').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('view:roll').setLabel('🎲 Roll').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('view:rankings').setLabel('🏆 Rankings').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

// ── Rankings screen ──

function renderRankings(playerId) {
  const top = P.getRankings(10);
  const myRank = P.getMyRank(playerId);
  const me = P.getPlayer(playerId);
  const lines = [`🏆 **Top Cultivators**`];
  if (!top.length) lines.push('*(no players yet)*');
  else {
    top.forEach((p, i) => {
      const realm = REALMS[p.realm];
      const marker = p.id === playerId ? '**→**' : `**${i + 1}.**`;
      lines.push(`${marker} ${p.username} — ${p.prowess_rating} *(${realm.icon} ${realm.name})*`);
    });
  }
  if (!top.some(p => p.id === playerId)) {
    const realm = REALMS[me.realm];
    lines.push('', `*Your rank: #${myRank} — ${me.prowess_rating} (${realm.icon} ${realm.name})*`);
  }
  return lines.join('\n');
}

function rankingsUI() {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('view:home').setLabel('← Back').setStyle(ButtonStyle.Secondary),
  )];
}

// ── Team screen ──

function renderTeam(playerId) {
  const player = P.getPlayer(playerId);
  const team = P.getTeamDaoists(playerId);
  const bench = P.getDaoists(playerId).filter(d => !d.in_team);
  const slots = P.getDaoistSlots(player);
  const lines = [`👥 **Team** (${team.length}/${slots} daoist slots)`];

  lines.push('', '**On team**');
  if (!team.length) {
    lines.push(slots === 0 ? '*(you cultivate alone — breakthrough to form a team)*' : '*(empty)*');
  } else for (const d of team) {
    const tag = RARITY_COLORS[d.rarity] || '⚪';
    lines.push(`${tag} **${d.name}** · ${d.power} pwr`);
  }

  lines.push('', `**Bench** (${bench.length})`);
  if (!bench.length) lines.push('*(none — roll for more in 🎲 Roll)*');
  else {
    const grouped = bench.reduce((m, d) => { (m[d.id] ||= { ...d, count: 0 }).count++; return m; }, {});
    for (const d of Object.values(grouped)) {
      const tag = RARITY_COLORS[d.rarity] || '⚪';
      lines.push(`${tag} **${d.name}** ×${d.count} · ${d.power} pwr`);
    }
  }
  return lines.join('\n');
}

function teamUI(playerId) {
  const player = P.getPlayer(playerId);
  const team = P.getTeamDaoists(playerId);
  const bench = P.getDaoists(playerId).filter(d => !d.in_team);
  const slots = P.getDaoistSlots(player);
  const rows = [];

  if (bench.length && team.length < slots) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('team:assign').setPlaceholder('Assign to team…').addOptions(
        bench.slice(0, 25).map(d => ({
          label: `${d.name} (${d.rarity})`,
          description: `${d.power} pwr`,
          value: String(d.rowId),
        }))
      )
    ));
  }
  if (team.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId('team:remove').setPlaceholder('Remove from team…').addOptions(
        team.slice(0, 25).map(d => ({
          label: `${d.name} (${d.rarity})`,
          description: `${d.power} pwr`,
          value: String(d.rowId),
        }))
      )
    ));
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('view:home').setLabel('← Back').setStyle(ButtonStyle.Secondary),
  ));
  return rows;
}

// ── Roll screen ──

function renderRoll(playerId) {
  const player = P.getPlayer(playerId);
  const daoists = P.getDaoists(playerId);
  const lines = [
    `🎲 **Roll for Daoists**`,
    `💎 ${player.spirit_stones} spirit stones · 🟢 ${player.jade} jade`,
    '',
    `• Stone roll — ${ROLLS.stoneCost} 💎 · common-focused odds`,
    `• Jade roll — ${ROLLS.jadeCost} 🟢 · legendary possible`,
    '',
    `**Companions owned** (${daoists.length})`,
  ];
  if (!daoists.length) lines.push('*(none yet)*');
  else {
    const grouped = daoists.reduce((m, d) => { (m[d.id] ||= { ...d, count: 0 }).count++; return m; }, {});
    for (const d of Object.values(grouped)) {
      const tag = RARITY_COLORS[d.rarity] || '⚪';
      lines.push(`${tag} **${d.name}** ×${d.count} · ${d.power} pwr`);
    }
  }
  return lines.join('\n');
}

function rollUI(player) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('roll:stone').setLabel(`🎲 Stone (${ROLLS.stoneCost} 💎)`).setStyle(ButtonStyle.Success).setDisabled(player.spirit_stones < ROLLS.stoneCost),
    new ButtonBuilder().setCustomId('roll:jade').setLabel(`🎲 Jade (${ROLLS.jadeCost} 🟢)`).setStyle(ButtonStyle.Success).setDisabled(player.jade < ROLLS.jadeCost),
    new ButtonBuilder().setCustomId('view:home').setLabel('← Back').setStyle(ButtonStyle.Secondary),
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

  lines.push('', '**Wealth**');
  lines.push(`💎 ${player.spirit_stones} spirit stones · 🟢 ${player.jade} jade`);

  lines.push('', '**Combat**');
  const power = P.getTotalPower(playerId);
  lines.push(`Power: ${power} · Prowess rating: ${player.prowess_rating} · ${player.pvp_wins}W / ${player.pvp_losses}L`);

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
    if (args[0] === 'profile')  return interaction.update({ content: renderProfile(id), components: profileUI() });
    if (args[0] === 'roll')     return interaction.update({ content: renderRoll(id), components: rollUI(P.getPlayer(id)) });
    if (args[0] === 'team')     return interaction.update({ content: renderTeam(id), components: teamUI(id) });
    if (args[0] === 'rankings') return interaction.update({ content: renderRankings(id), components: rankingsUI() });
    return showHome(interaction);
  }

  if (action === 'pvp') {
    const r = P.pvpFight(id);
    if (!r.success) { const player = P.getPlayer(id); return interaction.update({ content: `⚠️ ${r.error}\n\n${renderHome(player)}`, components: homeUI(player) }); }
    const outcome = r.won
      ? `⚔️ **Defeated ${r.opponent.name}**${r.opponent.isAi ? ' *(AI)*' : ''} · +${r.stonesEarned} 💎`
      : `💔 Lost to **${r.opponent.name}**${r.opponent.isAi ? ' *(AI)*' : ''}`;
    const ratingLine = `Rating: ${r.ratingBefore} → **${r.ratingAfter}** (${r.ratingDelta >= 0 ? '+' : ''}${r.ratingDelta})`;
    const powerLine = `Power: ${r.myPower} vs ${r.opponent.power}`;
    const player = P.getPlayer(id);
    return interaction.update({
      content: `${outcome}\n${ratingLine} · ${powerLine}\n\n${renderHome(player)}`,
      components: homeUI(player),
    });
  }

  if (action === 'roll') {
    const r = P.rollDaoist(id, args[0]);
    if (!r.success) return interaction.update({ content: `⚠️ ${r.error}\n\n${renderRoll(id)}`, components: rollUI(P.getPlayer(id)) });
    const tag = RARITY_COLORS[r.daoist.rarity] || '⚪';
    const banner = `🎲 Rolled ${tag} **${r.daoist.name}** *(${r.daoist.rarity})* · ${r.daoist.power} pwr`;
    return interaction.update({ content: `${banner}\n\n${renderRoll(id)}`, components: rollUI(P.getPlayer(id)) });
  }

  let banner = null;

  if (action === 'cultivate') {
    const r = P.cultivate(id);
    banner = r.success ? `🔥 +${r.qiGained} xp` : `⚠️ ${r.error}`;
  } else if (action === 'breakthrough') {
    const r = P.breakthrough(id);
    P.tickCultivation(id);
    if (r.success) {
      const coinsLine = r.kind === 'realm'
        ? `\n💎 +${r.stonesEarned} · 🟢 +${r.jadeEarned}`
        : (r.stonesEarned ? `\n💎 +${r.stonesEarned}` : '');
      banner = r.kind === 'realm'
        ? `✨ **Breakthrough to ${r.next}**${coinsLine}` + (r.talent ? `\n🌟 New talent: **${r.talent.name}** *(${r.talent.rarity})*` : '')
        : `${r.previous} → **${r.next}**${coinsLine}`;
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
  const id = interaction.user.id;
  if (!P.getPlayer(id)) return interaction.reply({ content: '❌ Use `/tianming`', ephemeral: true });

  const [action, kind] = interaction.customId.split(':');

  if (action === 'team') {
    const rowId = Number(interaction.values[0]);
    const r = kind === 'assign' ? P.assignDaoistToTeam(id, rowId) : P.removeDaoistFromTeam(id, rowId);
    const banner = r.success
      ? (kind === 'assign' ? `✅ Assigned **${r.daoist.name}**` : `↩️ Removed **${r.daoist.name}**`)
      : `⚠️ ${r.error}`;
    return interaction.update({ content: `${banner}\n\n${renderTeam(id)}`, components: teamUI(id) });
  }

  await interaction.update({ content: '(Unknown menu)', components: [] });
}
