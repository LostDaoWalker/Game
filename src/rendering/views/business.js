import { THEME, BUSINESSES } from '../../core/config.js';
import * as C from '../canvas.js';

const { colors } = THEME;

export function renderBusiness(player, ownedBusinesses) {
  const { canvas, ctx } = C.createGameCanvas();
  C.drawBackground(ctx);

  // Header
  C.drawTitle(ctx, '◆ NEXUS', 20, 16, 24, colors.primary);
  C.drawText(ctx, '// OPERATIONS HQ', 140, 22, { size: 13, color: colors.textDim });
  C.drawText(ctx, `₡${C.formatNumber(player.credits)}`, 780, 18, { size: 16, bold: true, color: colors.creditsGold, align: 'right' });
  C.drawDivider(ctx, 20, 42, 760);

  const ownedMap = {};
  for (const b of ownedBusinesses) ownedMap[b.type] = b;

  const entries = Object.entries(BUSINESSES);
  const cols = 2;
  const cardW = 370;
  const cardH = 108;
  const gap = 12;
  const startY = 52;

  for (let i = 0; i < entries.length; i++) {
    const [key, config] = entries[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 20 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    const owned = ownedMap[key];
    const level = owned ? owned.level : 0;
    const maxed = level >= config.maxLevel;
    const cost = maxed ? 0 : Math.floor(config.baseCost * Math.pow(config.costMultiplier, level));
    const income = level > 0 ? owned.income_rate : config.baseIncome;
    const canBuy = player.credits >= cost && !maxed;

    C.drawPanel(ctx, x, y, cardW, cardH, {
      glow: canBuy && !maxed,
      glowColor: colors.success,
    });

    // Icon + Name
    C.drawText(ctx, `${config.icon} ${config.name}`, x + 12, y + 10, { size: 14, bold: true, color: level > 0 ? colors.primary : colors.text });

    // Level
    C.drawText(ctx, maxed ? 'MAXED' : `Lv.${level}/${config.maxLevel}`, x + cardW - 12, y + 10, {
      size: 12, color: maxed ? colors.accent : colors.secondary, align: 'right', bold: true,
    });

    // Description
    C.drawText(ctx, config.description, x + 12, y + 30, { size: 11, color: colors.textDim });

    // Stats row
    if (level > 0) {
      C.drawText(ctx, `Income: +₡${C.formatNumber(income)}/min`, x + 12, y + 50, { size: 12, color: colors.success });
    }

    if (!maxed) {
      C.drawText(ctx, `${level > 0 ? 'Upgrade' : 'Buy'}: ₡${C.formatNumber(cost)}`, x + 12, y + 68, {
        size: 12, color: canBuy ? colors.creditsGold : colors.danger,
      });
      const nextIncome = Math.floor(config.baseIncome * Math.pow(config.incomeMultiplier, level));
      C.drawText(ctx, `→ +₡${C.formatNumber(nextIncome)}/min`, x + 200, y + 68, { size: 11, color: colors.textDim });
    }

    // Progress bar showing level
    C.drawProgressBar(ctx, x + 12, y + 88, cardW - 24, 6, level / config.maxLevel,
      maxed ? colors.accent : colors.primary);
  }

  // Nav Bar
  C.drawPanel(ctx, 20, 400, 760, 42);
  const tabs = ['DASHBOARD', 'BUSINESS', 'MISSIONS', 'MARKET', 'UPGRADES', 'PROFILE'];
  const tabW = 120;
  for (let i = 0; i < tabs.length; i++) {
    C.drawButton(ctx, 30 + i * tabW + i * 5, 406, tabW, 30, tabs[i], colors.primary, tabs[i] === 'BUSINESS');
  }

  // Footer
  C.drawText(ctx, 'Use buttons below to buy/upgrade operations', 20, 455, { size: 10, color: colors.textMuted });

  // Scanlines
  for (let y = 0; y < 500; y += 3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, y, 800, 1);
  }

  return C.canvasToBuffer(canvas);
}
