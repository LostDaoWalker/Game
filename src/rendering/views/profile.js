import { THEME } from '../../core/config.js';
import * as C from '../canvas.js';

const { colors } = THEME;

export function renderProfile(player, businesses, inventory, rank) {
  const { canvas, ctx } = C.createGameCanvas();
  C.drawBackground(ctx);

  // Header
  C.drawTitle(ctx, '◆ NEXUS', 20, 16, 24, colors.primary);
  C.drawText(ctx, '// OPERATIVE DOSSIER', 140, 22, { size: 13, color: colors.textDim });
  C.drawDivider(ctx, 20, 42, 760);

  // ─── Avatar Area ───
  C.drawPanel(ctx, 20, 52, 250, 200, { glow: true, glowColor: colors.primary });

  // Large username
  C.drawText(ctx, player.username, 145, 72, { size: 20, bold: true, color: colors.primary, align: 'center', maxWidth: 220 });

  // Rank badge
  const rankText = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] + ` #${rank}` : `#${rank}`;
  C.drawText(ctx, rankText, 145, 100, { size: 16, bold: true, color: colors.accent, align: 'center' });

  C.drawText(ctx, `Level ${player.level} Operative`, 145, 124, { size: 13, color: colors.secondary, align: 'center' });

  C.drawDivider(ctx, 40, 146, 210);

  // Joined date
  C.drawText(ctx, 'JOINED', 40, 156, { size: 10, color: colors.textMuted });
  C.drawText(ctx, new Date(player.created_at * 1000).toLocaleDateString(), 250, 156, { size: 11, color: colors.textDim, align: 'right' });

  C.drawText(ctx, 'LAST ACTIVE', 40, 174, { size: 10, color: colors.textMuted });
  C.drawText(ctx, new Date(player.last_active * 1000).toLocaleDateString(), 250, 174, { size: 11, color: colors.textDim, align: 'right' });

  C.drawText(ctx, 'REPUTATION', 40, 192, { size: 10, color: colors.textMuted });
  C.drawText(ctx, C.formatNumber(player.reputation), 250, 192, { size: 11, color: colors.accent, align: 'right' });

  // XP bar
  C.drawText(ctx, `XP: ${C.formatNumber(player.xp)}/${C.formatNumber(player.xp_needed)}`, 40, 216, { size: 10, color: colors.textMuted });
  C.drawProgressBar(ctx, 40, 230, 210, 8, player.xp / player.xp_needed, colors.xpBar);

  // ─── Stats Panel ───
  C.drawPanel(ctx, 290, 52, 230, 200, { title: 'COMBAT STATS' });

  let sy = 82;
  const stats = [
    ['LEVEL', player.level, colors.secondary],
    ['ATTACK', player.attack, colors.danger],
    ['DEFENSE', player.defense, colors.primary],
    ['MAX HP', player.max_hp, colors.hpBar],
    ['MAX ENERGY', player.max_energy, colors.energyBar],
    ['NETWORTH', `₡${C.formatNumber(player.networth)}`, colors.creditsGold],
    ['PEAK NET', `₡${C.formatNumber(player.peak_networth)}`, colors.accent],
  ];

  for (const [label, value, color] of stats) {
    C.drawText(ctx, label, 302, sy, { size: 11, color: colors.textMuted });
    C.drawText(ctx, String(value), 508, sy, { size: 12, bold: true, color, align: 'right' });
    sy += 22;
  }

  // ─── Assets Panel ───
  C.drawPanel(ctx, 540, 52, 240, 200, { title: 'ASSETS' });

  let ay = 82;
  C.drawText(ctx, 'CREDITS', 552, ay, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `₡${C.formatNumber(player.credits)}`, 768, ay, { size: 13, bold: true, color: colors.creditsGold, align: 'right' });
  ay += 22;

  C.drawText(ctx, 'CRYPTO', 552, ay, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `◈${C.formatNumber(player.crypto)}`, 768, ay, { size: 13, bold: true, color: colors.cryptoCyan, align: 'right' });
  ay += 22;

  C.drawText(ctx, 'BUSINESSES', 552, ay, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `${businesses.length}`, 768, ay, { size: 13, bold: true, color: colors.text, align: 'right' });
  ay += 22;

  C.drawText(ctx, 'AUGMENTS', 552, ay, { size: 11, color: colors.textMuted });
  let totalAugs = 0;
  for (const item of inventory) totalAugs += item.quantity;
  C.drawText(ctx, `${totalAugs}`, 768, ay, { size: 13, bold: true, color: colors.secondary, align: 'right' });
  ay += 28;

  C.drawDivider(ctx, 552, ay, 216);
  ay += 12;

  // Income summary
  let totalIncome = 0;
  for (const b of businesses) totalIncome += b.income_rate;
  C.drawText(ctx, 'INCOME/MIN', 552, ay, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `+₡${C.formatNumber(totalIncome)}`, 768, ay, { size: 13, bold: true, color: colors.success, align: 'right' });
  ay += 22;
  C.drawText(ctx, 'INCOME/HR', 552, ay, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `+₡${C.formatNumber(totalIncome * 60)}`, 768, ay, { size: 13, bold: true, color: colors.success, align: 'right' });

  // ─── Business Details ───
  C.drawPanel(ctx, 20, 266, 760, 120, { title: 'OPERATION DETAILS' });

  if (businesses.length === 0) {
    C.drawText(ctx, 'No operations established yet.', 32, 296, { size: 12, color: colors.textMuted });
  } else {
    let bx = 32;
    let by = 296;
    for (let i = 0; i < Math.min(6, businesses.length); i++) {
      const b = businesses[i];
      const name = b.type.replace(/_/g, ' ').toUpperCase();
      C.drawText(ctx, name, bx, by, { size: 11, bold: true, color: colors.text });
      C.drawText(ctx, `Lv.${b.level}`, bx + 120, by, { size: 11, color: colors.secondary });
      C.drawText(ctx, `+₡${C.formatNumber(b.income_rate)}/min`, bx + 170, by, { size: 11, color: colors.success });

      if (i % 2 === 0) {
        bx = 420;
      } else {
        bx = 32;
        by += 20;
      }
    }
  }

  // Nav Bar
  C.drawPanel(ctx, 20, 400, 760, 42);
  const tabs = ['DASHBOARD', 'BUSINESS', 'MISSIONS', 'MARKET', 'UPGRADES', 'PROFILE'];
  const tabW = 120;
  for (let i = 0; i < tabs.length; i++) {
    C.drawButton(ctx, 30 + i * tabW + i * 5, 406, tabW, 30, tabs[i], colors.primary, tabs[i] === 'PROFILE');
  }

  C.drawText(ctx, `◆ ${player.username} — NEXUS Operative since ${new Date(player.created_at * 1000).toLocaleDateString()}`, 20, 455, { size: 10, color: colors.textMuted });

  for (let y = 0; y < 500; y += 3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, y, 800, 1);
  }

  return C.canvasToBuffer(canvas);
}
