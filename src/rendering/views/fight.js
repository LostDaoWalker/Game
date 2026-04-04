import { ZONES, ENEMIES, ECO } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

export function renderFight(player, result) {
  const { canvas, ctx, bx, by } = R.layout(player, 'fight', {
    sub: '// COMBAT ZONE',
    stats: [{ l: '⚡', v: `${player.stamina}/${player.max_stamina}`, c: C.staminaBar }, { l: '🪙', v: R.fmt(player.gold), c: C.gold }],
  });
  result ? drawResult(ctx, bx, by, 760, player, result) : drawZones(ctx, bx, by, player);
  return R.toBuffer(canvas);
}

function drawZones(ctx, bx, by, p) {
  let i = 0;
  for (const [zid, z] of Object.entries(ZONES)) {
    const col = i % 2, row = i >> 1, x = bx + col * 392, y = by + row * 84, locked = p.level < z.minLevel;
    R.panel(ctx, x, y, 368, 76, { glow: !locked, gc: locked ? C.danger : C.primary });
    R.txt(ctx, `${z.icon} ${z.name}`, x + 12, y + 8, { s: 14, b: true, c: locked ? C.textMuted : C.text });
    R.txt(ctx, locked ? `🔒 Lv.${z.minLevel}` : `⚡${z.staminaCost}`, x + 356, y + 10, { s: 11, c: locked ? C.danger : C.staminaBar, a: 'right' });
    let ey = y + 30;
    for (const [, e] of Object.entries(ENEMIES).filter(([, e]) => e.zone === zid)) {
      const el = p.level < e.minLevel;
      R.txt(ctx, `${e.icon} ${e.name}`, x + 20, ey, { s: 10, c: el ? C.textMuted : C.textDim });
      R.txt(ctx, `Lv.${e.minLevel}+`, x + 356, ey, { s: 9, c: el ? C.danger : C.textMuted, a: 'right' }); ey += 13;
    }
    i++;
  }
  // PvP
  const pvpY = by + 168;
  R.panel(ctx, bx, pvpY, 760, 58, { t: 'PVP ARENA', glow: true, gc: C.secondary });
  R.txt(ctx, '⚔️ Challenge a random opponent near your level', bx + 12, pvpY + 28, { s: 13, c: C.text });
  R.txt(ctx, `⚡${ECO.pvpCost} stamina | Win gold, XP, glory`, bx + 12, pvpY + 44, { s: 11, c: C.staminaBar });
  // HP
  const hpY = pvpY + 68;
  R.panel(ctx, bx, hpY, 760, 34);
  R.txt(ctx, `HP: ${p.hp}/${p.max_hp}`, bx + 12, hpY + 10, { s: 12, b: true, c: C.hpBar });
  R.bar(ctx, bx + 160, hpY + 10, 400, 11, p.hp / p.max_hp, C.hpBar);
  R.txt(ctx, p.hp < p.max_hp ? `Heal: ${(p.max_hp - p.hp) * ECO.healPerHp | 0}g` : '✓ Full', bx + 748, hpY + 10, { s: 11, c: p.hp < p.max_hp ? C.gold : C.success, a: 'right' });
}

export function drawResult(ctx, bx, by, bw, player, r) {
  const won = r.won, name = r.foe?.name || '?';
  R.panel(ctx, bx, by, bw, 48, { glow: true, gc: won ? C.success : C.danger });
  R.txt(ctx, won ? '⚔️  VICTORY' : '💀  DEFEATED', bx + bw / 2, by + 6, { s: 24, b: true, c: won ? C.success : C.danger, a: 'center' });
  R.txt(ctx, `vs ${name}`, bx + bw / 2, by + 32, { s: 12, c: C.textDim, a: 'center' });

  R.panel(ctx, bx, by + 58, 368, 120, { t: 'BATTLE STATS' });
  let sy = by + 86;
  for (const [l, v, c] of [['Damage Dealt', r.combat.damageDealt, C.danger], ['Damage Taken', r.combat.damageTaken, C.hpBar], ['Rounds', r.combat.rounds, C.text], ['HP Left', r.combat.attackerHp, C.success]]) {
    R.txt(ctx, l, bx + 12, sy, { s: 11, c: C.textMuted }); R.txt(ctx, `${v}`, bx + 356, sy, { s: 12, b: true, c, a: 'right' }); sy += 20;
  }
  R.bar(ctx, bx + 12, sy, 344, 7, r.combat.attackerHp / (player.max_hp || 100), C.hpBar);

  R.panel(ctx, bx + 392, by + 58, 368, 120, { t: 'REWARDS', glow: won, gc: C.gold });
  let ry = by + 86;
  R.txt(ctx, '🪙 Gold', bx + 404, ry, { s: 12, c: C.textMuted }); R.txt(ctx, `+${R.fmt(r.gold)}`, bx + 748, ry, { s: 15, b: true, c: C.gold, a: 'right' }); ry += 22;
  R.txt(ctx, '✨ XP', bx + 404, ry, { s: 12, c: C.textMuted }); R.txt(ctx, `+${R.fmt(r.xp)}`, bx + 748, ry, { s: 15, b: true, c: C.xpBar, a: 'right' }); ry += 22;
  if (r.lootItem) { R.txt(ctx, `🎁 ${r.lootItem.icon} ${r.lootItem.name}`, bx + 404, ry, { s: 12, b: true, c: R.rarityColor(r.lootItem.rarity) }); ry += 22; }
  if (r.leveled) R.txt(ctx, `🎉 LEVEL UP → Lv.${r.newLevel}`, bx + 404, ry, { s: 13, b: true, c: C.accent });

  R.panel(ctx, bx, by + 188, bw, 148, { t: 'COMBAT LOG' });
  let ly = by + 214;
  const logColors = { '🧪': '#4ade80', '💨': '#38bdf8', '💥': '#f5c542', '🛡': '#a78bfa', '⚔': '#fb923c', '🔄': '#38bdf8' };
  for (const e of r.combat.log.slice(-9)) {
    const emoji = e.text.match(/^([\p{Emoji}])/u)?.[1];
    const color = emoji && logColors[emoji] ? logColors[emoji] : (e.side === 'attacker' ? C.primary : C.danger);
    R.txt(ctx, `[${e.side === 'attacker' ? 'YOU' : 'FOE'}] ${e.text}`, bx + 12, ly, { s: 10, c: color }); ly += 14;
  }
}
