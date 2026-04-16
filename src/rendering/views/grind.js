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

  // XP bar at bottom
  const barY = GH - 40;
  R.bar(ctx, pad, barY, GW - pad * 2, 5, result.xpPercent, C.xpBar);
  R.txt(ctx, `${(result.xpPercent * 100) | 0}% to Lv.${player.level + 1}`, pad, barY + 10, { s: 9, c: C.textDim });
  R.txt(ctx, `❤${player.hp}/${player.max_hp}  ⚡${player.stamina}/${player.max_stamina}`, GW - pad, barY + 10, { s: 9, c: C.textDim, a: 'right' });

  return R.toBuffer(canvas);
}
