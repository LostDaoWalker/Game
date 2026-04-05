import { RARITIES } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

export function renderGrind(player, result) {
  const { canvas, ctx, bx, by } = R.layout(player, 'home', {
    sub: result.streakLabel ? `${result.streakLabel} ${result.streak} streak` : `// ${player.username}`,
    stats: [{ l: 'LVL', v: `${player.level}`, c: C.secondary }, { l: 'NET', v: R.fmt(player.networth), c: C.gold }],
  });

  // ── Networth before → after (the headline) ──
  R.panel(ctx, bx, by, 760, 52, { glow: result.afterNetworth > result.beforeNetworth, gc: C.accent });
  R.txt(ctx, `${R.fmt(result.beforeNetworth)}`, bx + 120, by + 10, { s: 22, b: true, c: C.textMuted, a: 'right' });
  R.txt(ctx, '→', bx + 140, by + 12, { s: 18, c: C.textDim, a: 'center' });
  R.txt(ctx, `${R.fmt(result.afterNetworth)}`, bx + 170, by + 10, { s: 22, b: true, c: C.accent });
  const delta = result.afterNetworth - result.beforeNetworth;
  if (delta > 0) R.txt(ctx, `+${R.fmt(delta)}`, bx + 340, by + 14, { s: 16, b: true, c: C.success });
  R.txt(ctx, 'NETWORTH', bx + 20, by + 34, { s: 9, c: C.textMuted });
  // Gold change
  R.txt(ctx, `🪙 ${R.fmt(result.beforeGold)} → ${R.fmt(result.afterGold)}`, bx + 500, by + 14, { s: 13, c: C.gold });
  if (result.afterGold > result.beforeGold) R.txt(ctx, `+${R.fmt(result.afterGold - result.beforeGold)}`, bx + 748, by + 14, { s: 13, b: true, c: C.success, a: 'right' });

  // ── Combat summary ──
  R.panel(ctx, bx, by + 62, 370, 100, { t: 'COMBAT' });
  let cy = by + 90;
  R.txt(ctx, `${result.wins}W / ${result.losses}L`, bx + 12, cy, { s: 18, b: true, c: result.losses === 0 ? C.success : C.text });
  if (result.streakMult > 1) R.txt(ctx, `${result.streakMult}x bonus`, bx + 180, cy + 2, { s: 14, b: true, c: C.accent });
  cy += 28;
  R.txt(ctx, `+${R.fmt(result.goldEarned)}g`, bx + 12, cy, { s: 14, c: C.gold });
  R.txt(ctx, `+${R.fmt(result.xpEarned)}xp`, bx + 120, cy, { s: 14, c: C.xpBar });
  if (result.junkGold) R.txt(ctx, `+${result.junkGold}g junk`, bx + 230, cy, { s: 12, c: C.textDim });
  cy += 22;
  // XP bar toward next level
  R.bar(ctx, bx + 12, cy, 346, 8, result.xpPercent, C.xpBar);
  R.txt(ctx, `${(result.xpPercent * 100) | 0}% to Lv.${player.level + 1}`, bx + 12, cy + 12, { s: 9, c: C.textDim });

  // ── Rewards panel ──
  R.panel(ctx, bx + 382, by + 62, 378, 100, { t: 'REWARDS' });
  let ry = by + 90;

  if (result.leveled) {
    R.txt(ctx, `🎉 LEVEL UP → Lv.${result.newLevel}`, bx + 394, ry, { s: 16, b: true, c: C.accent });
    ry += 24;
  }

  if (result.loot.length) {
    for (const item of result.loot.slice(0, 3)) {
      const rarityColor = R.rarityColor(item.rarity);
      const prefix = item.rarity === 'legendary' ? '🌟 ' : item.rarity === 'epic' ? '✨ ' : '';
      R.txt(ctx, `${prefix}${item.icon} ${item.name}`, bx + 394, ry, { s: 12, b: true, c: rarityColor });
      ry += 18;
    }
    if (result.loot.length > 3) R.txt(ctx, `+${result.loot.length - 3} more`, bx + 394, ry, { s: 10, c: C.textDim });
  } else {
    R.txt(ctx, 'No drops this time', bx + 394, ry, { s: 12, c: C.textMuted });
  }

  if (result.healed) R.txt(ctx, '❤️ Auto-healed', bx + 748, by + 90, { s: 10, c: C.success, a: 'right' });

  // ── Streak bar ──
  const streakY = by + 172;
  R.panel(ctx, bx, streakY, 760, 40);
  // Streak progress toward next tier
  const tiers = [5, 10, 20, 50];
  const nextTier = tiers.find(t => result.streak < t) || 100;
  const prevTier = tiers.filter(t => result.streak >= t).pop() || 0;
  const streakProgress = (result.streak - prevTier) / (nextTier - prevTier);
  R.txt(ctx, result.streak > 0 ? `${result.streakLabel} ${result.streak} STREAK` : 'NO STREAK', bx + 12, streakY + 8, { s: 13, b: true, c: result.streak >= 5 ? C.accent : C.textMuted });
  R.txt(ctx, `Next: ${nextTier}`, bx + 748, streakY + 8, { s: 10, c: C.textDim, a: 'right' });
  R.bar(ctx, bx + 12, streakY + 28, 736, 6, streakProgress, result.streak >= 20 ? C.accent : result.streak >= 5 ? C.success : C.textMuted);
  if (result.losses > 0 && result.streak === 0) R.txt(ctx, '💔 STREAK BROKEN', bx + 380, streakY + 8, { s: 12, b: true, c: C.danger, a: 'center' });

  // ── Milestones ──
  if (result.milestones.length) {
    const milestoneY = streakY + 48;
    R.panel(ctx, bx, milestoneY, 760, 16 + result.milestones.length * 18, { glow: true, gc: C.accent });
    let my = milestoneY + 8;
    for (const m of result.milestones) {
      R.txt(ctx, m.msg, bx + 380, my, { s: 12, b: true, c: C.accent, a: 'center' });
      my += 18;
    }
  }

  // ── Status bar at bottom ──
  const statusY = by + 296;
  R.panel(ctx, bx, statusY, 760, 40);
  R.labelBar(ctx, bx + 12, statusY + 8, 160, 'HP', player.hp, player.max_hp, C.hpBar);
  R.labelBar(ctx, bx + 190, statusY + 8, 160, 'STAMINA', player.stamina, player.max_stamina, C.staminaBar);
  R.labelBar(ctx, bx + 380, statusY + 8, 160, 'XP', player.xp, player.xp_needed, C.xpBar);
  R.txt(ctx, `⚔${player.attack} 🛡${player.defense} 💪${player.strength} ⚡${player.speed}`, bx + 560, statusY + 8, { s: 10, c: C.textDim });

  return R.toBuffer(canvas);
}
