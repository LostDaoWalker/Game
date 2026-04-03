import { THEME, UPGRADES } from '../../core/config.js';
import * as C from '../canvas.js';

const { colors } = THEME;

export function renderUpgrades(player, inventory) {
  const { canvas, ctx } = C.createGameCanvas();
  C.drawBackground(ctx);

  // Header
  C.drawTitle(ctx, '◆ NEXUS', 20, 16, 24, colors.primary);
  C.drawText(ctx, '// AUGMENTATION LAB', 140, 22, { size: 13, color: colors.textDim });
  C.drawText(ctx, `₡${C.formatNumber(player.credits)}`, 780, 18, { size: 16, bold: true, color: colors.creditsGold, align: 'right' });
  C.drawDivider(ctx, 20, 42, 760);

  // Current stats summary
  C.drawPanel(ctx, 20, 52, 760, 50, { glow: true, glowColor: colors.secondary });
  C.drawText(ctx, `⚔ ATK: ${player.attack}`, 40, 68, { size: 14, bold: true, color: colors.danger });
  C.drawText(ctx, `🛡 DEF: ${player.defense}`, 180, 68, { size: 14, bold: true, color: colors.primary });
  C.drawText(ctx, `❤ HP: ${player.hp}/${player.max_hp}`, 320, 68, { size: 14, bold: true, color: colors.hpBar });
  C.drawText(ctx, `⚡ ENERGY: ${player.energy}/${player.max_energy}`, 500, 68, { size: 14, bold: true, color: colors.energyBar });

  const ownedMap = {};
  for (const item of inventory) ownedMap[item.item_id] = item.quantity;

  const entries = Object.entries(UPGRADES);
  const cardW = 240;
  const cardH = 105;
  const gap = 10;
  const startY = 115;
  const cols = 3;

  for (let i = 0; i < entries.length; i++) {
    const [key, config] = entries[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 20 + col * (cardW + gap);
    const y = startY + row * (cardH + gap);

    const owned = ownedMap[key] || 0;
    const maxed = owned >= config.maxOwned;
    const canBuy = player.credits >= config.cost && !maxed;

    C.drawPanel(ctx, x, y, cardW, cardH, {
      glow: canBuy,
      glowColor: colors.secondary,
    });

    // Icon + Name
    C.drawText(ctx, `${config.icon} ${config.name}`, x + 12, y + 10, {
      size: 14, bold: true, color: maxed ? colors.accent : colors.text,
    });

    // Owned count
    C.drawText(ctx, `${owned}/${config.maxOwned}`, x + cardW - 12, y + 10, {
      size: 12, color: maxed ? colors.accent : colors.secondary, align: 'right', bold: true,
    });

    // Description
    C.drawText(ctx, config.description, x + 12, y + 32, { size: 12, color: colors.textDim });

    // Cost
    if (!maxed) {
      C.drawText(ctx, `Cost: ₡${C.formatNumber(config.cost)}`, x + 12, y + 52, {
        size: 12, color: canBuy ? colors.creditsGold : colors.danger,
      });
    } else {
      C.drawText(ctx, 'FULLY AUGMENTED', x + 12, y + 52, { size: 12, bold: true, color: colors.accent });
    }

    // Progress bar
    C.drawProgressBar(ctx, x + 12, y + 76, cardW - 24, 8, owned / config.maxOwned,
      maxed ? colors.accent : colors.secondary);
  }

  // Nav Bar
  C.drawPanel(ctx, 20, 400, 760, 42);
  const tabs = ['DASHBOARD', 'BUSINESS', 'MISSIONS', 'MARKET', 'UPGRADES', 'PROFILE'];
  const tabW = 120;
  for (let i = 0; i < tabs.length; i++) {
    C.drawButton(ctx, 30 + i * tabW + i * 5, 406, tabW, 30, tabs[i], colors.primary, tabs[i] === 'UPGRADES');
  }

  C.drawText(ctx, 'Augmentations permanently enhance your operative', 20, 455, { size: 10, color: colors.textMuted });

  for (let y = 0; y < 500; y += 3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, y, 800, 1);
  }

  return C.canvasToBuffer(canvas);
}
