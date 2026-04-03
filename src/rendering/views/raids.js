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

  let i = 0;
  for (const [, rd] of Object.entries(RAIDS)) {
    const col = i % 2, row = i >> 1, x = bx + col * 392, y = by + row * 148;
    const locked = player.level < rd.minLevel, can = !locked && player.stamina >= rd.staminaCost;
    R.panel(ctx, x, y, 368, 140, { glow: can, gc: C.legendary });
    R.txt(ctx, `${rd.icon} ${rd.name}`, x + 12, y + 8, { s: 15, b: true, c: locked ? C.textMuted : C.legendary });
    R.txt(ctx, locked ? `🔒 LVL ${rd.minLevel}` : `⚡${rd.staminaCost}`, x + 356, y + 10, { s: 11, c: locked ? C.danger : (can ? C.staminaBar : C.danger), a: 'right' });
    R.txt(ctx, rd.description, x + 12, y + 30, { s: 10, c: C.textDim, mw: 344 });
    R.txt(ctx, `❤${R.fmt(rd.hp)} ⚔${rd.atk} 🛡${rd.def} ⚡${rd.spd}`, x + 12, y + 48, { s: 11, c: C.text });
    R.divider(ctx, x + 12, y + 66, 344);
    const [mg, xg] = rd.gold, [mx, xx] = rd.xp;
    R.txt(ctx, `🪙${R.fmt(mg)}-${R.fmt(xg)}  ✨${R.fmt(mx)}-${R.fmt(xx)}xp`, x + 12, y + 74, { s: 10, c: C.gold });
    R.txt(ctx, `${(rd.lootChance * 100) | 0}% loot`, x + 356, y + 74, { s: 10, c: C.accent, a: 'right' });
    let lx = x + 12;
    R.txt(ctx, 'DROPS:', lx, y + 92, { s: 9, c: C.textMuted }); lx += 42;
    for (const id of rd.lootTable.slice(0, 3)) { R.txt(ctx, id.replace(/_/g, ' '), lx, y + 92, { s: 9, c: C.text }); lx += 80; }
    R.bar(ctx, x + 12, y + 110, 344, 5, 1, C.danger);
    i++;
  }
  return R.toBuffer(canvas);
}
