import { RAIDS } from '../../core/config.js';
import * as R from '../canvas.js';
import { drawResult } from './fight.js';
const C = R.colors;

export function renderRaids(player, result) {
  const { canvas, ctx, bx, by } = R.layout(player, 'raids', {
    sub: '// RAID BOSSES',
    stats: [{ l: '⚡', v: `${player.stamina}/${player.max_stamina}`, c: C.staminaBar }, { l: '🪙', v: R.fmt(player.gold), c: C.gold }],
  });

  if (result) { drawResult(ctx, bx, by, 760, player, result); return R.toBuffer(canvas); }

  let index = 0;
  for (const [, raid] of Object.entries(RAIDS)) {
    const col = index % 2, row = index >> 1, x = bx + col * 392, y = by + row * 148;
    const locked = player.level < raid.minLevel, affordable = !locked && player.stamina >= raid.staminaCost;
    R.panel(ctx, x, y, 368, 140, { glow: affordable, gc: C.legendary });
    R.txt(ctx, `${raid.icon} ${raid.name}`, x + 12, y + 8, { s: 15, b: true, c: locked ? C.textMuted : C.legendary });
    R.txt(ctx, locked ? `🔒 LVL ${raid.minLevel}` : `⚡${raid.staminaCost}`, x + 356, y + 10, { s: 11, c: locked ? C.danger : (affordable ? C.staminaBar : C.danger), a: 'right' });
    R.txt(ctx, raid.description, x + 12, y + 30, { s: 10, c: C.textDim, mw: 344 });
    R.txt(ctx, `❤${R.fmt(raid.hp)} ⚔${raid.atk} 🛡${raid.def} ⚡${raid.spd}`, x + 12, y + 48, { s: 11, c: C.text });
    R.divider(ctx, x + 12, y + 66, 344);
    const [minGold, maxGold] = raid.gold, [minXp, maxXp] = raid.xp;
    R.txt(ctx, `🪙${R.fmt(minGold)}-${R.fmt(maxGold)}  ✨${R.fmt(minXp)}-${R.fmt(maxXp)}xp`, x + 12, y + 74, { s: 10, c: C.gold });
    R.txt(ctx, `${(raid.lootChance * 100) | 0}% loot`, x + 356, y + 74, { s: 10, c: C.accent, a: 'right' });
    let lootX = x + 12;
    R.txt(ctx, 'DROPS:', lootX, y + 92, { s: 9, c: C.textMuted }); lootX += 42;
    for (const itemId of raid.lootTable.slice(0, 3)) { R.txt(ctx, itemId.replace(/_/g, ' '), lootX, y + 92, { s: 9, c: C.text }); lootX += 80; }
    R.bar(ctx, x + 12, y + 110, 344, 5, 1, C.danger);
    index++;
  }
  return R.toBuffer(canvas);
}
