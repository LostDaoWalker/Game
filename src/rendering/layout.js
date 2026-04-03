import { THEME } from '../core/config.js';
import * as C from './canvas.js';

const { colors } = THEME;

/**
 * Shared layout wrapper. Every view calls this once.
 *
 * Usage:
 *   const { canvas, ctx, body } = createLayout(player, 'fight', {
 *     subtitle: '// COMBAT ZONE',
 *     rightStats: [{ label: '⚡', value: `${player.stamina}/${player.max_stamina}`, color: colors.staminaBar }],
 *   });
 *   // draw your content in the body region (body.x, body.y, body.w, body.h)
 *   return C.canvasToBuffer(canvas);
 */
export function createLayout(player, activeTab, opts = {}) {
  const { canvas, ctx } = C.createGameCanvas();
  C.drawBackground(ctx);

  // ─── Header ───
  C.drawTitle(ctx, '◆ NEXUS', 20, 14, 22, colors.primary);
  if (opts.subtitle) {
    C.drawText(ctx, opts.subtitle, 132, 19, { size: 12, color: colors.textMuted });
  }

  // Right-side header stats
  let rx = 780;
  const stats = opts.rightStats || [
    { label: '🪙', value: C.formatNumber(player.gold), color: colors.gold },
  ];
  for (let i = stats.length - 1; i >= 0; i--) {
    const s = stats[i];
    C.drawText(ctx, `${s.label} ${s.value}`, rx, 16, {
      size: 13, bold: true, color: s.color, align: 'right',
    });
    rx -= ctx.measureText(`${s.label} ${s.value}`).width + 20;
  }

  C.drawDivider(ctx, 20, 38, 760);

  // ─── Navigation Bar (bottom) ───
  drawNavBar(ctx, activeTab);

  // ─── Footer ───
  C.drawText(ctx, `◆ NEXUS — ${THEME.tagline}`, 20, 458, { size: 9, color: colors.textMuted });

  // ─── Scanlines ───
  C.drawScanlines(ctx);

  // Body region available for view content
  const body = { x: 20, y: 46, w: 760, h: 346 };

  return { canvas, ctx, body };
}

// ─── Shared Nav Bar ─────────────────────────────

const TABS = ['DASHBOARD', 'FIGHT', 'RAIDS', 'INVENTORY', 'SKILLS', 'PROFILE'];

function drawNavBar(ctx, activeTab) {
  C.drawPanel(ctx, 20, 400, 760, 40);

  const tabW = 118;
  const gap = 5;
  const startX = 28;

  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    const isActive = tab === activeTab.toUpperCase();
    C.drawButton(ctx, startX + i * (tabW + gap), 405, tabW, 28, tab, colors.primary, isActive);
  }
}

// ─── Stat Row Helpers (reusable across views) ───

export function drawStatRow(ctx, x, y, label, value, color = colors.text) {
  C.drawText(ctx, label, x, y, { size: 11, color: colors.textMuted });
  C.drawText(ctx, String(value), x + 200, y, { size: 12, bold: true, color, align: 'right' });
}

export function drawLabeledBar(ctx, x, y, w, label, current, max, color) {
  C.drawText(ctx, label, x, y, { size: 10, color: colors.textMuted });
  C.drawText(ctx, `${current}/${max}`, x + w, y, { size: 10, color, align: 'right' });
  C.drawProgressBar(ctx, x, y + 13, w, 7, current / max, color);
}

export function drawItemRow(ctx, x, y, w, config, opts = {}) {
  const rarityColor = C.getRarityColor(config.rarity);
  C.drawText(ctx, `${config.icon}`, x, y, { size: 12 });
  C.drawText(ctx, config.name, x + 20, y, {
    size: 11, bold: true, color: rarityColor, maxWidth: opts.nameWidth || 150,
  });
  if (opts.rightLabel) {
    C.drawText(ctx, opts.rightLabel, x + w, y, {
      size: 11, bold: opts.rightBold, color: opts.rightColor || colors.textDim, align: 'right',
    });
  }
}
