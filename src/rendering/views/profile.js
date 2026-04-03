import { EQUIPMENT, SLOT_ICONS, EQUIPMENT_SLOTS } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

export function renderProfile(player, equipment, skills, rank) {
  const { canvas, ctx, bx, by } = R.layout(player, 'profile', {
    sub: '// DOSSIER', stats: [{ l: 'RANK', v: `#${rank}`, c: C.accent }],
  });

  // Identity
  R.panel(ctx, bx, by, 260, 180, { glow: true, gc: C.primary });
  R.txt(ctx, player.username, bx + 130, by + 16, { s: 18, b: true, c: C.primary, a: 'center', mw: 240 });
  R.txt(ctx, `${['🥇', '🥈', '🥉'][rank - 1] || ''} #${rank}`, bx + 130, by + 40, { s: 15, b: true, c: C.accent, a: 'center' });
  R.txt(ctx, `Level ${player.level} Operative`, bx + 130, by + 62, { s: 12, c: C.secondary, a: 'center' });
  R.divider(ctx, bx + 20, by + 82, 220);
  const iy = by + 92;
  R.txt(ctx, 'JOINED', bx + 20, iy, { s: 9, c: C.textMuted });
  R.txt(ctx, new Date(player.created_at * 1000).toLocaleDateString(), bx + 240, iy, { s: 10, c: C.textDim, a: 'right' });
  R.labelBar(ctx, bx + 20, iy + 4, 220, 'XP', player.xp, player.xp_needed, C.xpBar);

  // Combat
  R.panel(ctx, bx + 272, by, 234, 180, { t: 'COMBAT' });
  let sy = by + 28;
  for (const [l, v, c] of [['LEVEL', player.level, C.secondary], ['ATTACK', player.attack, C.danger], ['DEFENSE', player.defense, C.primary], ['SPEED', player.speed, C.energyBar], ['STRENGTH', player.strength, C.accent], ['MAX HP', player.max_hp, C.hpBar], ['NETWORTH', R.fmt(player.networth) + 'g', C.gold]]) {
    R.txt(ctx, l, bx + 284, sy, { s: 10, c: C.textMuted }); R.txt(ctx, `${v}`, bx + 494, sy, { s: 11, b: true, c, a: 'right' }); sy += 20;
  }

  // Record
  R.panel(ctx, bx + 518, by, 242, 180, { t: 'RECORD' });
  let ry = by + 28;
  for (const [l, v, c] of [['PvE W/L', `${player.wins}/${player.losses}`, C.success], ['PvP W/L', `${player.pvp_wins}/${player.pvp_losses}`, C.secondary], ['Raids', player.raids_completed, C.legendary], ['Bosses', player.bosses_killed, C.accent], ['Peak Net', R.fmt(player.peak_networth) + 'g', C.gold]]) {
    R.txt(ctx, l, bx + 530, ry, { s: 10, c: C.textMuted }); R.txt(ctx, `${v}`, bx + 748, ry, { s: 11, b: true, c, a: 'right' }); ry += 22;
  }

  // Gear
  R.panel(ctx, bx, by + 192, 370, 154, { t: 'GEAR' });
  let gy = by + 220; const eq = equipment.filter(e => e.equipped);
  for (const slot of EQUIPMENT_SLOTS) {
    const e = eq.find(e => EQUIPMENT[e.item_id]?.slot === slot), cfg = e ? EQUIPMENT[e.item_id] : null;
    R.txt(ctx, `${SLOT_ICONS[slot]} ${slot.toUpperCase()}`, bx + 12, gy, { s: 10, c: C.textMuted });
    R.txt(ctx, cfg ? `${cfg.icon} ${cfg.name}` : '—', bx + 358, gy, { s: 11, c: cfg ? R.rarityColor(cfg.rarity) : C.textMuted, a: 'right' }); gy += 20;
  }
  let gv = 0; for (const e of equipment) gv += EQUIPMENT[e.item_id]?.sellValue || 0;
  R.txt(ctx, `Gear Value: ${R.fmt(gv)}g`, bx + 12, gy + 8, { s: 11, c: C.gold });

  // Skills
  R.panel(ctx, bx + 382, by + 192, 378, 154, { t: 'SKILLS' });
  let sky = by + 220;
  if (!skills.length) R.txt(ctx, 'No skills yet.', bx + 394, sky, { s: 11, c: C.textMuted });
  else for (const sk of skills.slice(0, 6)) {
    R.txt(ctx, `${sk.icon} ${sk.name}`, bx + 394, sky, { s: 11, c: C.text });
    R.txt(ctx, `Lv.${sk.level}`, bx + 748, sky, { s: 11, b: true, c: C.secondary, a: 'right' }); sky += 20;
  }
  return R.toBuffer(canvas);
}
