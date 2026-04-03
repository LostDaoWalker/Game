import { THEME, EQUIPMENT, EQUIPMENT_SLOTS } from '../../core/config.js';
import * as C from '../canvas.js';
import { createLayout } from '../layout.js';

const { colors } = THEME;
const SLOT_ICONS = { weapon: '⚔️', armor: '🛡️', helmet: '⛑️', boots: '👟', accessory: '💍' };

export function renderInventory(player, allEquipment, equippedItems) {
  const { canvas, ctx, body } = createLayout(player, 'inventory', {
    subtitle: '// INVENTORY',
    rightStats: [{ label: '🪙', value: C.formatNumber(player.gold), color: colors.gold }],
  });

  const bx = body.x;
  const by = body.y;

  // ─── Equipped Panel ───
  C.drawPanel(ctx, bx, by, 260, 188, { title: 'EQUIPPED', glow: true, glowColor: colors.primary });
  let ey = by + 28;
  let totalAtk = 0, totalDef = 0, totalHp = 0, totalSpd = 0, totalStr = 0;
  for (const slot of EQUIPMENT_SLOTS) {
    const eq = equippedItems.find(e => EQUIPMENT[e.item_id]?.slot === slot);
    const cfg = eq ? EQUIPMENT[eq.item_id] : null;
    C.drawText(ctx, `${SLOT_ICONS[slot]} ${slot.toUpperCase()}`, bx + 12, ey, { size: 10, color: colors.textMuted });
    if (cfg) {
      C.drawText(ctx, `${cfg.icon} ${cfg.name}`, bx + 248, ey, { size: 11, bold: true, color: C.getRarityColor(cfg.rarity), align: 'right' });
      totalAtk += cfg.stats.attack || 0; totalDef += cfg.stats.defense || 0;
      totalHp += cfg.stats.hp || 0; totalSpd += cfg.stats.speed || 0; totalStr += cfg.stats.strength || 0;
    } else {
      C.drawText(ctx, '— empty —', bx + 248, ey, { size: 10, color: colors.textMuted, align: 'right' });
    }
    ey += 24;
  }
  ey += 6;
  C.drawDivider(ctx, bx + 12, ey, 236);
  ey += 8;
  C.drawText(ctx, `+${totalAtk}⚔  +${totalDef}🛡  +${totalHp}❤  +${totalSpd}⚡  +${totalStr}💪`, bx + 12, ey, { size: 9, color: colors.success });

  // ─── Bag ───
  C.drawPanel(ctx, bx + 272, by, 488, body.h, { title: `BAG (${allEquipment.length} items)` });
  const sorted = [...allEquipment].sort((a, b) => {
    const ra = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 };
    return (ra[EQUIPMENT[a.item_id]?.rarity] ?? 5) - (ra[EQUIPMENT[b.item_id]?.rarity] ?? 5);
  });

  let iy = by + 28;
  const maxShow = 14;
  for (let i = 0; i < Math.min(maxShow, sorted.length); i++) {
    const item = sorted[i];
    const cfg = EQUIPMENT[item.item_id];
    if (!cfg) continue;

    if (item.equipped) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.04)';
      C.roundRect(ctx, bx + 280, iy - 2, 472, 18, 3);
      ctx.fill();
    }

    C.drawText(ctx, `${cfg.icon} ${cfg.name}`, bx + 284, iy, {
      size: 10, bold: true, color: C.getRarityColor(cfg.rarity), maxWidth: 140,
    });
    C.drawText(ctx, cfg.rarity.toUpperCase().slice(0, 4), bx + 440, iy, { size: 8, color: C.getRarityColor(cfg.rarity) });

    const stats = Object.entries(cfg.stats).map(([k, v]) => `+${v}${k.slice(0, 3)}`).join(' ');
    C.drawText(ctx, stats, bx + 510, iy, { size: 8, color: colors.textDim });

    C.drawText(ctx, item.equipped ? 'EQ' : `${Math.floor(cfg.sellValue * 0.4)}g`, bx + 748, iy, {
      size: 9, bold: item.equipped, color: item.equipped ? colors.primary : colors.gold, align: 'right',
    });
    iy += 20;
  }

  if (sorted.length > maxShow) {
    C.drawText(ctx, `+${sorted.length - maxShow} more...`, bx + 284, iy, { size: 10, color: colors.textDim });
  } else if (sorted.length === 0) {
    C.drawText(ctx, 'No items. Fight enemies for loot!', bx + 284, iy, { size: 11, color: colors.textMuted });
  }

  // ─── Base Stats ───
  C.drawPanel(ctx, bx, by + 200, 260, 146, { title: 'BASE + GEAR' });
  let bsy = by + 228;
  for (const [label, base, bonus, col] of [
    ['ATK', player.attack, totalAtk, colors.danger],
    ['DEF', player.defense, totalDef, colors.primary],
    ['HP', player.max_hp, totalHp, colors.hpBar],
    ['SPD', player.speed, totalSpd, colors.energyBar],
    ['STR', player.strength, totalStr, colors.accent],
  ]) {
    C.drawText(ctx, label, bx + 12, bsy, { size: 11, color: colors.textMuted });
    C.drawText(ctx, `${base}`, bx + 80, bsy, { size: 12, color: col });
    C.drawText(ctx, bonus > 0 ? `+${bonus}` : '', bx + 140, bsy, { size: 11, color: colors.success });
    C.drawText(ctx, `= ${base + bonus}`, bx + 200, bsy, { size: 12, bold: true, color: colors.text });
    bsy += 20;
  }

  return C.canvasToBuffer(canvas);
}
