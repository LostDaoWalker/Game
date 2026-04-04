import { ASSETS, ASSET_TIERS } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

export function renderAssets(player, ownedAssets) {
  const { canvas, ctx, bx, by } = R.layout(player, 'assets', {
    sub: '// ASSETS',
    stats: [{ l: '🪙', v: R.fmt(player.gold), c: C.gold }, { l: 'NET', v: R.fmt(player.networth), c: C.accent }],
  });

  const ownedSet = new Set(ownedAssets.map(row => row.asset_id));
  const entries = Object.entries(ASSETS);
  const cardWidth = 242, cardHeight = 68, gapX = 8, gapY = 6;
  let index = 0;

  // Income summary at top
  let totalIncome = 0, totalMaintenance = 0;
  for (const row of ownedAssets) {
    const config = ASSETS[row.asset_id];
    if (config) { totalIncome += config.incomePerHr; totalMaintenance += config.maintenancePerHr; }
  }
  const netPerHour = totalIncome - totalMaintenance;

  R.panel(ctx, bx, by, 760, 28);
  R.txt(ctx, `Income: +${R.fmt(totalIncome)}/hr`, bx + 12, by + 8, { s: 11, c: C.success });
  R.txt(ctx, `Maintenance: -${R.fmt(totalMaintenance)}/hr`, bx + 200, by + 8, { s: 11, c: C.danger });
  R.txt(ctx, `Net: ${netPerHour >= 0 ? '+' : ''}${R.fmt(netPerHour)}/hr`, bx + 440, by + 8, { s: 11, b: true, c: netPerHour >= 0 ? C.success : C.danger });
  R.txt(ctx, `${ownedAssets.length}/${entries.length} owned`, bx + 748, by + 8, { s: 11, c: C.textDim, a: 'right' });

  const gridY = by + 38;

  for (const [assetId, config] of entries) {
    const col = index % 3, row = (index / 3) | 0;
    const x = bx + col * (cardWidth + gapX);
    const y = gridY + row * (cardHeight + gapY);
    const owned = ownedSet.has(assetId);
    const locked = player.level < config.minLevel;
    const canBuy = !owned && !locked && player.gold >= config.cost;
    const tierColor = ASSET_TIERS[config.tier]?.color || C.textDim;

    R.panel(ctx, x, y, cardWidth, cardHeight, { glow: canBuy, gc: tierColor });

    // Name + icon
    R.txt(ctx, `${config.icon} ${config.name}`, x + 8, y + 6, {
      s: 12, b: true, c: owned ? C.accent : locked ? C.textMuted : C.text,
    });

    // Status badge
    if (owned) {
      R.txt(ctx, '✓ OWNED', x + cardWidth - 8, y + 6, { s: 10, b: true, c: C.success, a: 'right' });
    } else if (locked) {
      R.txt(ctx, `🔒 Lv.${config.minLevel}`, x + cardWidth - 8, y + 6, { s: 10, c: C.danger, a: 'right' });
    } else {
      R.txt(ctx, `${R.fmt(config.cost)}g`, x + cardWidth - 8, y + 6, { s: 10, c: canBuy ? C.gold : C.danger, a: 'right' });
    }

    // Income / Maintenance
    R.txt(ctx, `+${config.incomePerHr}/hr`, x + 8, y + 24, { s: 10, c: C.success });
    R.txt(ctx, `-${config.maintenancePerHr}/hr`, x + 90, y + 24, { s: 10, c: C.danger });
    const roi = config.incomePerHr - config.maintenancePerHr;
    R.txt(ctx, `net ${roi >= 0 ? '+' : ''}${roi}/hr`, x + 170, y + 24, { s: 10, c: roi > 0 ? C.success : C.textMuted });

    // Networth value + tier
    R.txt(ctx, config.tier.toUpperCase(), x + 8, y + 42, { s: 9, c: tierColor });
    R.txt(ctx, `+${R.fmt(config.networthValue)} net`, x + 80, y + 42, { s: 9, c: C.accent });

    // Progress bar — gold toward purchase, or full if owned
    const progress = owned ? 1 : Math.min(1, player.gold / config.cost);
    R.bar(ctx, x + 8, y + 57, cardWidth - 16, 4, progress, owned ? C.success : tierColor);
    if (!owned && !locked) R.txt(ctx, `${R.fmt(Math.min(player.gold, config.cost))}/${R.fmt(config.cost)}`, x + cardWidth - 8, y + 42, { s: 8, c: C.textMuted, a: 'right' });

    index++;
  }

  return R.toBuffer(canvas);
}
