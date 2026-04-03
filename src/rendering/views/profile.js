import { THEME, EQUIPMENT } from '../../core/config.js';
import * as C from '../canvas.js';
import { createLayout, drawLabeledBar } from '../layout.js';

const { colors } = THEME;

export function renderProfile(player, equipment, skills, rank) {
  const { canvas, ctx, body } = createLayout(player, 'profile', {
    subtitle: '// DOSSIER',
    rightStats: [{ label: 'RANK', value: `#${rank}`, color: colors.accent }],
  });

  const bx = body.x;
  const by = body.y;

  // ─── Identity Card ───
  C.drawPanel(ctx, bx, by, 260, 180, { glow: true, glowColor: colors.primary });
  C.drawText(ctx, player.username, bx + 130, by + 16, {
    size: 18, bold: true, color: colors.primary, align: 'center', maxWidth: 240,
  });
  const medals = ['🥇', '🥈', '🥉'];
  const rankLabel = rank <= 3 ? `${medals[rank - 1]} #${rank}` : `#${rank}`;
  C.drawText(ctx, rankLabel, bx + 130, by + 40, { size: 15, bold: true, color: colors.accent, align: 'center' });
  C.drawText(ctx, `Level ${player.level} Operative`, bx + 130, by + 62, { size: 12, color: colors.secondary, align: 'center' });

  C.drawDivider(ctx, bx + 20, by + 82, 220);

  let iy = by + 92;
  for (const [label, value] of [
    ['JOINED', new Date(player.created_at * 1000).toLocaleDateString()],
    ['LAST ACTIVE', new Date(player.last_active * 1000).toLocaleDateString()],
    ['PUPILS', `${player.pupil_count}`],
  ]) {
    C.drawText(ctx, label, bx + 20, iy, { size: 9, color: colors.textMuted });
    C.drawText(ctx, value, bx + 240, iy, { size: 10, color: colors.textDim, align: 'right' });
    iy += 16;
  }

  drawLabeledBar(ctx, bx + 20, iy + 4, 220, 'XP', player.xp, player.xp_needed, colors.xpBar);

  // ─── Combat Stats ───
  C.drawPanel(ctx, bx + 272, by, 234, 180, { title: 'COMBAT' });
  let sy = by + 28;
  for (const [label, val, col] of [
    ['LEVEL', player.level, colors.secondary],
    ['ATTACK', player.attack, colors.danger],
    ['DEFENSE', player.defense, colors.primary],
    ['SPEED', player.speed, colors.energyBar],
    ['STRENGTH', player.strength, colors.accent],
    ['MAX HP', player.max_hp, colors.hpBar],
    ['NETWORTH', `${C.formatNumber(player.networth)}g`, colors.gold],
  ]) {
    C.drawText(ctx, label, bx + 284, sy, { size: 10, color: colors.textMuted });
    C.drawText(ctx, String(val), bx + 494, sy, { size: 11, bold: true, color: col, align: 'right' });
    sy += 20;
  }

  // ─── Record ───
  C.drawPanel(ctx, bx + 518, by, 242, 180, { title: 'RECORD' });
  let ry = by + 28;
  for (const [label, val, col] of [
    ['PvE Wins', player.wins, colors.success],
    ['PvE Losses', player.losses, colors.danger],
    ['PvP Wins', player.pvp_wins, colors.success],
    ['PvP Losses', player.pvp_losses, colors.danger],
    ['Raids Done', player.raids_completed, colors.legendary],
    ['Bosses Killed', player.bosses_killed, colors.accent],
    ['Peak Net', `${C.formatNumber(player.peak_networth)}g`, colors.gold],
  ]) {
    C.drawText(ctx, label, bx + 530, ry, { size: 10, color: colors.textMuted });
    C.drawText(ctx, String(val), bx + 748, ry, { size: 11, bold: true, color: col, align: 'right' });
    ry += 20;
  }

  // ─── Gear Summary ───
  C.drawPanel(ctx, bx, by + 192, 370, 154, { title: 'GEAR LOADOUT' });
  let gy = by + 220;
  const slotIcons = { weapon: '⚔️', armor: '🛡️', helmet: '⛑️', boots: '👟', accessory: '💍' };
  const equipped = equipment.filter(e => e.equipped);
  for (const slot of ['weapon', 'armor', 'helmet', 'boots', 'accessory']) {
    const eq = equipped.find(e => EQUIPMENT[e.item_id]?.slot === slot);
    const cfg = eq ? EQUIPMENT[eq.item_id] : null;
    C.drawText(ctx, `${slotIcons[slot]} ${slot.toUpperCase()}`, bx + 12, gy, { size: 10, color: colors.textMuted });
    C.drawText(ctx, cfg ? `${cfg.icon} ${cfg.name}` : '—', bx + 358, gy, {
      size: 11, color: cfg ? C.getRarityColor(cfg.rarity) : colors.textMuted, align: 'right',
    });
    gy += 20;
  }

  // Total gear value
  let gearValue = 0;
  for (const e of equipment) { gearValue += EQUIPMENT[e.item_id]?.sellValue || 0; }
  gy += 4;
  C.drawText(ctx, `Total Gear Value: ${C.formatNumber(gearValue)}g`, bx + 12, gy, { size: 11, color: colors.gold });

  // ─── Skills Summary ───
  C.drawPanel(ctx, bx + 382, by + 192, 378, 154, { title: 'SKILLS' });
  let sky = by + 220;
  if (skills.length === 0) {
    C.drawText(ctx, 'No skills learned yet.', bx + 394, sky, { size: 11, color: colors.textMuted });
  } else {
    for (const sk of skills.slice(0, 6)) {
      C.drawText(ctx, `${sk.icon} ${sk.name}`, bx + 394, sky, { size: 11, color: colors.text });
      C.drawText(ctx, `Lv.${sk.level}`, bx + 748, sky, { size: 11, bold: true, color: colors.secondary, align: 'right' });
      sky += 20;
    }
    if (skills.length > 6) {
      C.drawText(ctx, `+${skills.length - 6} more`, bx + 394, sky, { size: 10, color: colors.textDim });
    }
  }

  return C.canvasToBuffer(canvas);
}
