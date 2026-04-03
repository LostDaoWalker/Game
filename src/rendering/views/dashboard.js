import { THEME } from '../../core/config.js';
import * as C from '../canvas.js';
import { createLayout, drawLabeledBar, drawStatRow } from '../layout.js';

const { colors } = THEME;

export function renderDashboard(player, equipped, skills, recentLog, leaderboard) {
  const { canvas, ctx, body } = createLayout(player, 'dashboard', {
    subtitle: `// ${player.username}`,
    rightStats: [
      { label: 'LVL', value: `${player.level}`, color: colors.secondary },
      { label: 'NET', value: `${C.formatNumber(player.networth)}g`, color: colors.gold },
    ],
  });

  const bx = body.x;
  const by = body.y;

  // ─── Stats Panel ───
  C.drawPanel(ctx, bx, by, 240, 200, { title: 'STATUS' });
  let sy = by + 28;
  drawLabeledBar(ctx, bx + 12, sy, 216, 'XP', player.xp, player.xp_needed, colors.xpBar);
  sy += 28;
  drawLabeledBar(ctx, bx + 12, sy, 216, 'HP', player.hp, player.max_hp, colors.hpBar);
  sy += 28;
  drawLabeledBar(ctx, bx + 12, sy, 216, 'STAMINA', player.stamina, player.max_stamina, colors.staminaBar);
  sy += 32;

  C.drawText(ctx, `⚔ ${player.attack}`, bx + 12, sy, { size: 12, bold: true, color: colors.danger });
  C.drawText(ctx, `🛡 ${player.defense}`, bx + 80, sy, { size: 12, bold: true, color: colors.primary });
  C.drawText(ctx, `💪 ${player.strength}`, bx + 148, sy, { size: 12, bold: true, color: colors.accent });
  sy += 18;
  C.drawText(ctx, `⚡ ${player.speed}`, bx + 12, sy, { size: 12, bold: true, color: colors.energyBar });
  C.drawText(ctx, `🪙 ${C.formatNumber(player.gold)}`, bx + 80, sy, { size: 13, bold: true, color: colors.gold });

  // ─── Gear Panel ───
  C.drawPanel(ctx, bx + 252, by, 248, 200, { title: 'EQUIPPED GEAR' });
  const slotIcons = { weapon: '⚔️', armor: '🛡️', helmet: '⛑️', boots: '👟', accessory: '💍' };
  let ey = by + 28;
  for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'accessory']) {
    const item = equipped.find(e => e.slot === slot);
    C.drawText(ctx, `${slotIcons[slot]} ${slot.toUpperCase()}`, bx + 264, ey, { size: 10, color: colors.textMuted });
    if (item) {
      C.drawText(ctx, item.name, bx + 488, ey, {
        size: 11, bold: true, color: C.getRarityColor(item.rarity), align: 'right',
      });
    } else {
      C.drawText(ctx, '— empty —', bx + 488, ey, { size: 10, color: colors.textMuted, align: 'right' });
    }
    ey += 24;
  }
  ey += 4;
  C.drawDivider(ctx, bx + 264, ey, 224);
  ey += 10;
  C.drawText(ctx, `⚔ W/L: ${player.wins}/${player.losses}`, bx + 264, ey, { size: 11, color: colors.text });
  C.drawText(ctx, `PVP: ${player.pvp_wins}/${player.pvp_losses}`, bx + 400, ey, { size: 11, color: colors.secondary });
  ey += 16;
  C.drawText(ctx, `👑 Raids: ${player.raids_completed}`, bx + 264, ey, { size: 11, color: colors.legendary });

  // ─── Battle Log ───
  C.drawPanel(ctx, bx + 512, by, 248, 200, { title: 'BATTLE LOG' });
  let ly = by + 28;
  if (recentLog.length === 0) {
    C.drawText(ctx, 'No battles yet.', bx + 524, ly, { size: 11, color: colors.textMuted });
    C.drawText(ctx, 'Head to FIGHT or RAIDS', bx + 524, ly + 16, { size: 10, color: colors.textDim });
  } else {
    for (const entry of recentLog.slice(0, 6)) {
      const icon = entry.won ? '✅' : '❌';
      const badge = entry.opponent_type === 'pvp' ? '⚔️' : entry.opponent_type === 'raid' ? '👑' : '🗡️';
      C.drawText(ctx, `${icon}${badge} ${entry.opponent_name}`, bx + 524, ly, {
        size: 10, color: entry.won ? colors.success : colors.danger, maxWidth: 200,
      });
      C.drawText(ctx, entry.won ? `+${entry.gold_earned}g +${entry.xp_earned}xp` : `+${entry.xp_earned}xp`, bx + 524, ly + 12, {
        size: 9, color: colors.textDim,
      });
      ly += 28;
    }
  }

  // ─── Leaderboard ───
  C.drawPanel(ctx, bx, by + 212, 370, 108, { title: 'TOP FIGHTERS', glow: true, glowColor: colors.accent });
  let lby = by + 240;
  const medals = ['🥇', '🥈', '🥉'];
  for (let i = 0; i < Math.min(4, leaderboard.length); i++) {
    const e = leaderboard[i];
    const isMe = e.id === player.id;
    C.drawText(ctx, `${medals[i] || `#${i + 1}`} ${e.username}`, bx + 12, lby, {
      size: 11, bold: isMe, color: isMe ? colors.primary : colors.text, maxWidth: 200,
    });
    C.drawText(ctx, `Lv.${e.level}`, bx + 260, lby, { size: 11, color: colors.secondary });
    C.drawText(ctx, `${C.formatNumber(e.networth)}g`, bx + 358, lby, { size: 11, color: colors.gold, align: 'right' });
    lby += 22;
  }

  // ─── Skills Mini ───
  C.drawPanel(ctx, bx + 382, by + 212, 378, 108, { title: 'SKILLS' });
  let sky = by + 240;
  if (skills.length === 0) {
    C.drawText(ctx, 'No skills yet — level up to unlock!', bx + 394, sky, { size: 11, color: colors.textMuted });
  } else {
    for (const sk of skills.slice(0, 4)) {
      C.drawText(ctx, `${sk.icon} ${sk.name}`, bx + 394, sky, { size: 11, color: colors.text });
      C.drawText(ctx, `Lv.${sk.level}`, bx + 748, sky, { size: 11, bold: true, color: colors.secondary, align: 'right' });
      sky += 22;
    }
  }

  // ─── Skill Pick Alert ───
  if (player.pending_skill_picks > 0) {
    C.drawPanel(ctx, 260, by + 330, 280, 26, { glow: true, glowColor: colors.accent });
    C.drawText(ctx, `🎯 ${player.pending_skill_picks} SKILL PICK${player.pending_skill_picks > 1 ? 'S' : ''} AVAILABLE!`, 400, by + 336, {
      size: 12, bold: true, color: colors.accent, align: 'center',
    });
  }

  return C.canvasToBuffer(canvas);
}
