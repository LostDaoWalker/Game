import { createCanvas } from '@napi-rs/canvas';
import * as R from '../canvas.js';
import { drawCard } from './card.js';
const C = R.colors;

// Portrait layout: card on top, results below
const GW = 400, GH = 720;

export function renderGrind(player, result) {
  const canvas = createCanvas(GW, GH);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  // Dark background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, GW, GH);

  // ── Card (top, centered) ──
  const card = drawCard(ctx, GW / 2, 260, player);

  // ── Results (below card) ──
  const ry = 520;
  const pad = 24;

  // Networth before → after
  const delta = result.afterNetworth - result.beforeNetworth;
  R.txt(ctx, `${R.fmt(result.beforeNetworth)}`, pad, ry, { s: 14, c: C.textMuted });
  R.txt(ctx, '→', pad + 80, ry, { s: 14, c: C.textDim });
  R.txt(ctx, `${R.fmt(result.afterNetworth)}`, pad + 100, ry, { s: 14, b: true, c: card.frameColor });
  if (delta > 0) R.txt(ctx, `+${R.fmt(delta)}`, GW - pad, ry, { s: 14, b: true, c: C.success, a: 'right' });

  // Combat + earnings on one line
  let cy = ry + 26;
  R.txt(ctx, `${result.wins}W/${result.losses}L`, pad, cy, { s: 12, c: result.losses === 0 ? C.success : C.text });
  R.txt(ctx, `+${R.fmt(result.goldEarned)}g`, pad + 80, cy, { s: 12, c: C.gold });
  R.txt(ctx, `+${R.fmt(result.xpEarned)}xp`, pad + 160, cy, { s: 12, c: C.xpBar });
  if (result.streakMult > 1) R.txt(ctx, `${result.streakMult}x`, GW - pad, cy, { s: 12, b: true, c: C.accent, a: 'right' });

  cy += 22;

  // Level up
  if (result.leveled) { R.txt(ctx, `LEVEL UP → Lv.${result.newLevel}`, pad, cy, { s: 14, b: true, c: C.accent }); cy += 20; }

  // Loot
  for (const item of result.loot.slice(0, 2)) {
    const pre = item.rarity === 'legendary' ? '🌟 ' : item.rarity === 'epic' ? '✨ ' : '';
    R.txt(ctx, `${pre}${item.icon} ${item.name}`, pad, cy, { s: 11, c: R.rarityColor(item.rarity) });
    cy += 16;
  }

  // Streak
  if (result.streak >= 5) { R.txt(ctx, `${result.streakLabel} ${result.streak} streak`, pad, cy, { s: 12, b: true, c: C.accent }); cy += 18; }
  else if (result.losses > 0 && result.streak === 0) { R.txt(ctx, '💔 Streak broken', pad, cy, { s: 11, c: C.danger }); cy += 18; }

  // Milestones
  for (const m of result.milestones.slice(0, 2)) { R.txt(ctx, m.msg, pad, cy, { s: 10, b: true, c: C.accent }); cy += 16; }

  // XP bar at bottom
  const barY = GH - 40;
  R.bar(ctx, pad, barY, GW - pad * 2, 5, result.xpPercent, C.xpBar);
  R.txt(ctx, `${(result.xpPercent * 100) | 0}% to Lv.${player.level + 1}`, pad, barY + 10, { s: 9, c: C.textDim });
  R.txt(ctx, `❤${player.hp}/${player.max_hp}  ⚡${player.stamina}/${player.max_stamina}`, GW - pad, barY + 10, { s: 9, c: C.textDim, a: 'right' });

  return R.toBuffer(canvas);
}
