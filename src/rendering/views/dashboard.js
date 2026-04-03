import { THEME } from '../../core/config.js';
import * as C from '../canvas.js';

const { colors } = THEME;

export function renderDashboard(player, businesses, activeMissions, cryptoPrice, leaderboard) {
  const { canvas, ctx } = C.createGameCanvas();
  C.drawBackground(ctx);

  // ─── Header ───
  C.drawTitle(ctx, '◆ NEXUS', 20, 16, 24, colors.primary);
  C.drawText(ctx, `// ${player.username}`, 140, 22, { size: 13, color: colors.textDim });

  // Level badge
  C.drawText(ctx, `LVL ${player.level}`, 700, 16, { size: 14, bold: true, color: colors.secondary, align: 'right' });
  C.drawText(ctx, `NET: ₡${C.formatNumber(player.networth)}`, 780, 16, { size: 14, bold: true, color: colors.creditsGold, align: 'right' });

  C.drawDivider(ctx, 20, 42, 760);

  // ─── Stats Panel ───
  C.drawPanel(ctx, 20, 52, 240, 190, { title: 'OPERATIVE STATUS' });

  let sy = 82;
  // XP Bar
  C.drawText(ctx, 'XP', 32, sy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `${C.formatNumber(player.xp)} / ${C.formatNumber(player.xp_needed)}`, 248, sy, { size: 11, color: colors.xpBar, align: 'right' });
  C.drawProgressBar(ctx, 32, sy + 14, 216, 8, player.xp / player.xp_needed, colors.xpBar);
  sy += 30;

  // HP Bar
  C.drawText(ctx, 'HP', 32, sy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `${player.hp} / ${player.max_hp}`, 248, sy, { size: 11, color: colors.hpBar, align: 'right' });
  C.drawProgressBar(ctx, 32, sy + 14, 216, 8, player.hp / player.max_hp, colors.hpBar);
  sy += 30;

  // Energy Bar
  C.drawText(ctx, 'ENERGY', 32, sy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `${player.energy} / ${player.max_energy}`, 248, sy, { size: 11, color: colors.energyBar, align: 'right' });
  C.drawProgressBar(ctx, 32, sy + 14, 216, 8, player.energy / player.max_energy, colors.energyBar);
  sy += 30;

  // Combat stats
  C.drawText(ctx, `⚔ ATK: ${player.attack}`, 32, sy, { size: 12, color: colors.danger });
  C.drawText(ctx, `🛡 DEF: ${player.defense}`, 130, sy, { size: 12, color: colors.primary });
  sy += 18;
  C.drawText(ctx, `★ REP: ${C.formatNumber(player.reputation)}`, 32, sy, { size: 12, color: colors.accent });

  // ─── Finances Panel ───
  C.drawPanel(ctx, 280, 52, 240, 190, { title: 'FINANCES', glow: true, glowColor: colors.creditsGold });

  let fy = 82;
  C.drawText(ctx, '₡ CREDITS', 292, fy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, C.formatNumber(player.credits), 508, fy, { size: 16, bold: true, color: colors.creditsGold, align: 'right' });
  fy += 28;

  C.drawText(ctx, '◈ CRYPTO', 292, fy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `${C.formatNumber(player.crypto)} units`, 508, fy, { size: 16, bold: true, color: colors.cryptoCyan, align: 'right' });
  fy += 28;

  C.drawText(ctx, '◈ PRICE', 292, fy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `₡${C.formatNumber(cryptoPrice)}/unit`, 508, fy, { size: 13, color: colors.cryptoCyan, align: 'right' });
  fy += 28;

  C.drawDivider(ctx, 292, fy, 204);
  fy += 10;

  // Income per minute
  let totalIncome = 0;
  for (const b of businesses) totalIncome += b.income_rate;
  C.drawText(ctx, 'INCOME/MIN', 292, fy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `+₡${C.formatNumber(totalIncome)}`, 508, fy, { size: 14, bold: true, color: colors.success, align: 'right' });
  fy += 24;

  C.drawText(ctx, 'PEAK NET', 292, fy, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `₡${C.formatNumber(player.peak_networth)}`, 508, fy, { size: 13, color: colors.accent, align: 'right' });

  // ─── Businesses Mini Panel ───
  C.drawPanel(ctx, 540, 52, 240, 190, { title: 'OPERATIONS' });

  let by = 82;
  if (businesses.length === 0) {
    C.drawText(ctx, 'No operations yet.', 552, by, { size: 12, color: colors.textMuted });
    C.drawText(ctx, 'Visit BUSINESS tab', 552, by + 16, { size: 11, color: colors.textDim });
    C.drawText(ctx, 'to get started.', 552, by + 30, { size: 11, color: colors.textDim });
  } else {
    for (const biz of businesses.slice(0, 5)) {
      C.drawText(ctx, `${biz.type.replace(/_/g, ' ').toUpperCase()}`, 552, by, { size: 11, bold: true, color: colors.text });
      C.drawText(ctx, `Lv.${biz.level}`, 720, by, { size: 11, color: colors.secondary, align: 'right' });
      C.drawText(ctx, `+₡${C.formatNumber(biz.income_rate)}/min`, 768, by, { size: 11, color: colors.success, align: 'right' });
      by += 20;
    }
    if (businesses.length > 5) {
      C.drawText(ctx, `+${businesses.length - 5} more...`, 552, by, { size: 11, color: colors.textDim });
    }
  }

  // ─── Active Missions ───
  C.drawPanel(ctx, 20, 254, 370, 120, { title: 'ACTIVE MISSIONS' });

  let my = 284;
  const now = Math.floor(Date.now() / 1000);
  if (activeMissions.length === 0) {
    C.drawText(ctx, 'No active missions.', 32, my, { size: 12, color: colors.textMuted });
    C.drawText(ctx, 'Start missions in the MISSIONS tab.', 32, my + 16, { size: 11, color: colors.textDim });
  } else {
    for (const m of activeMissions.slice(0, 3)) {
      const remaining = Math.max(0, m.completes_at - now);
      const total = m.completes_at - m.started_at;
      const progress = 1 - remaining / total;
      const done = remaining === 0;

      C.drawText(ctx, m.mission_id.replace(/_/g, ' ').toUpperCase(), 32, my, { size: 11, bold: true, color: done ? colors.success : colors.text });
      C.drawText(ctx, done ? '✓ COMPLETE' : C.formatTime(remaining), 378, my, { size: 11, color: done ? colors.success : colors.warning, align: 'right' });
      C.drawProgressBar(ctx, 32, my + 14, 346, 6, progress, done ? colors.success : colors.primary);
      my += 28;
    }
  }

  // ─── Leaderboard Mini ───
  C.drawPanel(ctx, 410, 254, 370, 120, { title: 'TOP OPERATIVES', glow: true, glowColor: colors.accent });

  let ly = 284;
  const medals = ['🥇', '🥈', '🥉'];
  for (let i = 0; i < Math.min(4, leaderboard.length); i++) {
    const entry = leaderboard[i];
    const prefix = medals[i] || `#${i + 1}`;
    const isMe = entry.id === player.id;
    C.drawText(ctx, `${prefix} ${entry.username}`, 422, ly, {
      size: 12, bold: isMe, color: isMe ? colors.primary : colors.text, maxWidth: 200,
    });
    C.drawText(ctx, `₡${C.formatNumber(entry.networth)}`, 768, ly, { size: 12, color: colors.creditsGold, align: 'right' });
    ly += 22;
  }

  // ─── Navigation Bar ───
  C.drawPanel(ctx, 20, 386, 760, 42);
  const tabs = ['DASHBOARD', 'BUSINESS', 'MISSIONS', 'MARKET', 'UPGRADES', 'PROFILE'];
  const tabW = 120;
  const tabStart = 30;
  for (let i = 0; i < tabs.length; i++) {
    C.drawButton(ctx, tabStart + i * tabW + i * 5, 392, tabW, 30, tabs[i],
      colors.primary, tabs[i] === 'DASHBOARD');
  }

  // ─── Footer ───
  C.drawText(ctx, `◆ NEXUS v1.0 — ${THEME.tagline}`, 20, 442, { size: 10, color: colors.textMuted });
  C.drawText(ctx, `Last login: ${new Date(player.last_active * 1000).toLocaleString()}`, 780, 442, { size: 10, color: colors.textMuted, align: 'right' });

  // Scanline effect
  for (let y = 0; y < 500; y += 3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, y, 800, 1);
  }

  return C.canvasToBuffer(canvas);
}
