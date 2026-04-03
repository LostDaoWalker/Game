import { THEME, MISSIONS } from '../../core/config.js';
import * as C from '../canvas.js';

const { colors } = THEME;

export function renderMissions(player, activeMissions) {
  const { canvas, ctx } = C.createGameCanvas();
  C.drawBackground(ctx);

  // Header
  C.drawTitle(ctx, '◆ NEXUS', 20, 16, 24, colors.primary);
  C.drawText(ctx, '// MISSION BOARD', 140, 22, { size: 13, color: colors.textDim });
  C.drawText(ctx, `⚡ ${player.energy}/${player.max_energy}`, 780, 18, { size: 14, bold: true, color: colors.energyBar, align: 'right' });
  C.drawDivider(ctx, 20, 42, 760);

  const activeMap = {};
  const now = Math.floor(Date.now() / 1000);
  for (const m of activeMissions) activeMap[m.mission_id] = m;

  const entries = Object.entries(MISSIONS);
  const cardW = 370;
  const cardH = 100;
  const gap = 10;
  const startY = 52;

  for (let i = 0; i < entries.length; i++) {
    const [key, config] = entries[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 20 + col * (cardW + 20);
    const y = startY + row * (cardH + gap);

    const active = activeMap[key];
    const locked = player.level < config.minLevel;
    const hasEnergy = player.energy >= config.energyCost;
    const isComplete = active && active.completes_at <= now;
    const isRunning = active && !isComplete;

    let borderColor = colors.border;
    if (isComplete) borderColor = colors.success;
    else if (isRunning) borderColor = colors.warning;
    else if (!locked && hasEnergy) borderColor = colors.primary;

    C.drawPanel(ctx, x, y, cardW, cardH, {
      glow: isComplete || (!locked && hasEnergy && !isRunning),
      glowColor: borderColor,
    });

    // Icon + Name
    const nameColor = locked ? colors.textMuted : (isComplete ? colors.success : colors.text);
    C.drawText(ctx, `${config.icon} ${config.name}`, x + 12, y + 10, { size: 14, bold: true, color: nameColor });

    // Status badge
    if (locked) {
      C.drawText(ctx, `🔒 LVL ${config.minLevel}`, x + cardW - 12, y + 10, { size: 11, color: colors.danger, align: 'right' });
    } else if (isComplete) {
      C.drawText(ctx, '✓ CLAIM', x + cardW - 12, y + 10, { size: 12, bold: true, color: colors.success, align: 'right' });
    } else if (isRunning) {
      const remaining = active.completes_at - now;
      C.drawText(ctx, C.formatTime(remaining), x + cardW - 12, y + 10, { size: 12, color: colors.warning, align: 'right' });
    } else {
      C.drawText(ctx, `⚡${config.energyCost}`, x + cardW - 12, y + 10, { size: 12, color: hasEnergy ? colors.energyBar : colors.danger, align: 'right' });
    }

    // Description
    C.drawText(ctx, config.description, x + 12, y + 30, { size: 11, color: colors.textDim });

    // Rewards
    const [minCr, maxCr] = config.rewards.credits;
    const [minXp, maxXp] = config.rewards.xp;
    C.drawText(ctx, `₡${C.formatNumber(minCr)}-${C.formatNumber(maxCr)}`, x + 12, y + 50, { size: 11, color: colors.creditsGold });
    C.drawText(ctx, `+${minXp}-${maxXp} XP`, x + 140, y + 50, { size: 11, color: colors.xpBar });
    C.drawText(ctx, `Duration: ${C.formatTime(config.duration)}`, x + 240, y + 50, { size: 11, color: colors.textMuted });

    // Progress bar for active missions
    if (isRunning) {
      const total = active.completes_at - active.started_at;
      const progress = 1 - (active.completes_at - now) / total;
      C.drawProgressBar(ctx, x + 12, y + 72, cardW - 24, 8, progress, colors.primary);
    } else if (isComplete) {
      C.drawProgressBar(ctx, x + 12, y + 72, cardW - 24, 8, 1, colors.success);
    } else {
      C.drawProgressBar(ctx, x + 12, y + 72, cardW - 24, 8, 0, colors.textMuted);
    }
  }

  // Nav Bar
  C.drawPanel(ctx, 20, 400, 760, 42);
  const tabs = ['DASHBOARD', 'BUSINESS', 'MISSIONS', 'MARKET', 'UPGRADES', 'PROFILE'];
  const tabW = 120;
  for (let i = 0; i < tabs.length; i++) {
    C.drawButton(ctx, 30 + i * tabW + i * 5, 406, tabW, 30, tabs[i], colors.primary, tabs[i] === 'MISSIONS');
  }

  C.drawText(ctx, 'Select a mission to start or claim rewards', 20, 455, { size: 10, color: colors.textMuted });

  for (let y = 0; y < 500; y += 3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, y, 800, 1);
  }

  return C.canvasToBuffer(canvas);
}
