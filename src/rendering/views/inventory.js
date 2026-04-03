import { EQUIPMENT, EQUIPMENT_SLOTS, SLOT_ICONS } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

export function renderInventory(player, all, equipped) {
  const { canvas, ctx, bx, by } = R.layout(player, 'inventory', { sub: '// INVENTORY' });

  R.panel(ctx, bx, by, 260, 188, { t: 'EQUIPPED', glow: true, gc: C.primary });
  let ey = by + 28, ta = 0, td = 0, th = 0, ts = 0, tst = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    const eq = equipped.find(e => EQUIPMENT[e.item_id]?.slot === slot), cfg = eq ? EQUIPMENT[eq.item_id] : null;
    R.txt(ctx, `${SLOT_ICONS[slot]} ${slot.toUpperCase()}`, bx + 12, ey, { s: 10, c: C.textMuted });
    R.txt(ctx, cfg ? `${cfg.icon} ${cfg.name}` : '— empty —', bx + 248, ey, { s: 11, b: !!cfg, c: cfg ? R.rarityColor(cfg.rarity) : C.textMuted, a: 'right' });
    if (cfg) { ta += cfg.stats.attack || 0; td += cfg.stats.defense || 0; th += cfg.stats.hp || 0; ts += cfg.stats.speed || 0; tst += cfg.stats.strength || 0; }
    ey += 24;
  }
  ey += 6; R.divider(ctx, bx + 12, ey, 236); ey += 8;
  R.txt(ctx, `+${ta}⚔ +${td}🛡 +${th}❤ +${ts}⚡ +${tst}💪`, bx + 12, ey, { s: 9, c: C.success });

  // Bag
  R.panel(ctx, bx + 272, by, 488, 346, { t: `BAG (${all.length})` });
  const ro = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
  const sorted = [...all].sort((a, b) => (ro[EQUIPMENT[a.item_id]?.rarity] ?? 5) - (ro[EQUIPMENT[b.item_id]?.rarity] ?? 5));
  let iy = by + 28;
  for (let i = 0; i < Math.min(14, sorted.length); i++) {
    const it = sorted[i], cfg = EQUIPMENT[it.item_id]; if (!cfg) continue;
    if (it.equipped) { ctx.fillStyle = 'rgba(0,240,255,.04)'; R.rr(ctx, bx + 280, iy - 2, 472, 18, 3); ctx.fill(); }
    R.txt(ctx, `${cfg.icon} ${cfg.name}`, bx + 284, iy, { s: 10, b: true, c: R.rarityColor(cfg.rarity), mw: 140 });
    R.txt(ctx, cfg.rarity.toUpperCase().slice(0, 4), bx + 440, iy, { s: 8, c: R.rarityColor(cfg.rarity) });
    R.txt(ctx, Object.entries(cfg.stats).map(([k, v]) => `+${v}${k.slice(0, 3)}`).join(' '), bx + 510, iy, { s: 8, c: C.textDim });
    R.txt(ctx, it.equipped ? 'EQ' : `${cfg.sellValue * .4 | 0}g`, bx + 748, iy, { s: 9, b: it.equipped, c: it.equipped ? C.primary : C.gold, a: 'right' });
    iy += 20;
  }
  if (sorted.length > 14) R.txt(ctx, `+${sorted.length - 14} more...`, bx + 284, iy, { s: 10, c: C.textDim });
  else if (!sorted.length) R.txt(ctx, 'Fight enemies for loot!', bx + 284, iy, { s: 11, c: C.textMuted });

  // Base stats
  R.panel(ctx, bx, by + 200, 260, 146, { t: 'BASE + GEAR' });
  let bsy = by + 228;
  for (const [l, base, bonus, c] of [['ATK', player.attack, ta, C.danger], ['DEF', player.defense, td, C.primary], ['HP', player.max_hp, th, C.hpBar], ['SPD', player.speed, ts, C.energyBar], ['STR', player.strength, tst, C.accent]]) {
    R.txt(ctx, l, bx + 12, bsy, { s: 11, c: C.textMuted }); R.txt(ctx, `${base}`, bx + 80, bsy, { s: 12, c });
    if (bonus) R.txt(ctx, `+${bonus}`, bx + 140, bsy, { s: 11, c: C.success });
    R.txt(ctx, `= ${base + bonus}`, bx + 200, bsy, { s: 12, b: true, c: C.text }); bsy += 20;
  }
  return R.toBuffer(canvas);
}
