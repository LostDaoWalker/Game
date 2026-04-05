import * as R from '../canvas.js';
import { drawCard } from './card.js';
const C = R.colors;

export function renderGrind(player, result) {
  const { canvas, ctx } = R.create();
  R.bg(ctx);

  // Card on the left
  const card = drawCard(ctx, 210, 250, player);

  // ── Results panel (right side, minimal) ──
  const rx = 400, ry = 40;

  // Networth change — the headline
  R.txt(ctx, `${R.fmt(result.beforeNetworth)} → ${R.fmt(result.afterNetworth)}`, rx, ry, { s: 18, b: true, c: card.frameColor });
  const delta = result.afterNetworth - result.beforeNetworth;
  if (delta > 0) R.txt(ctx, `+${R.fmt(delta)}`, rx + 280, ry + 2, { s: 14, b: true, c: C.success });

  // Combat result
  R.txt(ctx, `${result.wins}W / ${result.losses}L`, rx, ry + 36, { s: 14, c: result.losses === 0 ? C.success : C.text });
  if (result.streakMult > 1) R.txt(ctx, `${result.streakMult}x`, rx + 120, ry + 36, { s: 14, b: true, c: C.accent });

  // Earnings
  R.txt(ctx, `+${R.fmt(result.goldEarned)}g`, rx, ry + 60, { s: 13, c: C.gold });
  R.txt(ctx, `+${R.fmt(result.xpEarned)}xp`, rx + 100, ry + 60, { s: 13, c: C.xpBar });
  if (result.junkGold) R.txt(ctx, `+${result.junkGold}g junk`, rx + 200, ry + 60, { s: 11, c: C.textDim });

  // Level up
  if (result.leveled) R.txt(ctx, `LEVEL UP → Lv.${result.newLevel}`, rx, ry + 90, { s: 16, b: true, c: C.accent });

  // Loot (max 3)
  let ly = ry + (result.leveled ? 116 : 90);
  for (const item of result.loot.slice(0, 3)) {
    const rarityColor = R.rarityColor(item.rarity);
    const prefix = item.rarity === 'legendary' ? '🌟 ' : item.rarity === 'epic' ? '✨ ' : '';
    R.txt(ctx, `${prefix}${item.icon} ${item.name}`, rx, ly, { s: 12, c: rarityColor });
    ly += 18;
  }

  // Streak
  if (result.streak >= 5) {
    R.txt(ctx, `${result.streakLabel} ${result.streak} streak`, rx, ly + 8, { s: 13, b: true, c: C.accent });
    ly += 24;
  } else if (result.losses > 0 && result.streak === 0) {
    R.txt(ctx, '💔 Streak broken', rx, ly + 8, { s: 12, c: C.danger });
    ly += 24;
  }

  // Milestones
  for (const m of result.milestones) {
    R.txt(ctx, m.msg, rx, ly + 8, { s: 11, b: true, c: C.accent });
    ly += 18;
  }

  // XP progress at bottom right
  const barY = 440;
  R.txt(ctx, `${(result.xpPercent * 100) | 0}% to Lv.${player.level + 1}`, rx, barY, { s: 9, c: C.textDim });
  R.bar(ctx, rx, barY + 12, 380, 6, result.xpPercent, C.xpBar);

  // Stamina + HP
  R.txt(ctx, `❤ ${player.hp}/${player.max_hp}`, rx, barY + 26, { s: 10, c: C.hpBar });
  R.txt(ctx, `⚡ ${player.stamina}/${player.max_stamina}`, rx + 120, barY + 26, { s: 10, c: C.staminaBar });

  // Nav hint
  R.txt(ctx, 'HALCYON', 20, 470, { s: 9, c: C.textMuted });

  return R.toBuffer(canvas);
}
