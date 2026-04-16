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

  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, GW, GH);

  drawCard(ctx, GW / 2, 260, player);

  const pad = 24;
  let cy = 524;

  // Combat + earnings
  R.txt(ctx, `${result.wins}W/${result.losses}L`, pad, cy, { s: 13, c: result.losses === 0 ? C.success : C.text });
  R.txt(ctx, `+${R.fmt(result.goldEarned)}g`, pad + 90, cy, { s: 13, c: C.gold });
  R.txt(ctx, `+${R.fmt(result.xpEarned)}xp`, pad + 180, cy, { s: 13, c: C.xpBar });
  cy += 24;

  if (result.leveled) { R.txt(ctx, `LEVEL UP → Lv.${result.newLevel}`, pad, cy, { s: 14, b: true, c: C.accent }); cy += 22; }

  for (const item of result.loot.slice(0, 3)) {
    const pre = item.rarity === 'legendary' ? '🌟 ' : item.rarity === 'epic' ? '✨ ' : '';
    R.txt(ctx, `${pre}${item.icon} ${item.name}`, pad, cy, { s: 11, c: R.rarityColor(item.rarity) });
    cy += 16;
  }

  // XP + stamina bars at bottom
  const barW = GW - pad * 2;
  const xpY = GH - 68;
  R.txt(ctx, 'XP', pad, xpY, { s: 10, c: C.textMuted });
  R.txt(ctx, `${(result.xpPercent * 100) | 0}% → Lv.${player.level + 1}`, pad + barW, xpY, { s: 10, c: C.xpBar, a: 'right' });
  R.bar(ctx, pad, xpY + 13, barW, 7, result.xpPercent, C.xpBar);

  const stY = GH - 34;
  R.txt(ctx, 'STAMINA', pad, stY, { s: 10, c: C.textMuted });
  R.txt(ctx, `${player.stamina}/${player.max_stamina}`, pad + barW, stY, { s: 10, c: C.staminaBar, a: 'right' });
  R.bar(ctx, pad, stY + 13, barW, 7, player.stamina / player.max_stamina, C.staminaBar);

  return R.toBuffer(canvas);
}
