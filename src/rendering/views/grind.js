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
  let cy = 530;

  // Gold + XP earned (only if we actually fought)
  if (result.wins || result.losses) {
    R.txt(ctx, `+${R.fmt(result.goldEarned)}g`, pad, cy, { s: 14, b: true, c: C.gold });
    R.txt(ctx, `+${R.fmt(result.xpEarned)}xp`, pad + 120, cy, { s: 14, b: true, c: C.xpBar });
    cy += 26;
  }

  if (result.leveled) { R.txt(ctx, `Lv.${result.newLevel}`, pad, cy, { s: 14, b: true, c: C.accent }); cy += 22; }

  for (const item of result.loot.slice(0, 3)) {
    R.txt(ctx, `${item.icon} ${item.name}`, pad, cy, { s: 11, c: R.rarityColor(item.rarity) });
    cy += 16;
  }

  // XP + stamina bars
  const barW = GW - pad * 2;
  const xpY = GH - 56;
  R.bar(ctx, pad, xpY, barW, 6, result.xpPercent, C.xpBar);
  const stY = GH - 28;
  R.bar(ctx, pad, stY, barW, 6, player.stamina / player.max_stamina, C.staminaBar);
  R.txt(ctx, `${player.stamina}/${player.max_stamina}`, pad + barW, stY + 10, { s: 9, c: C.textMuted, a: 'right' });

  return R.toBuffer(canvas);
}
