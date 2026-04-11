import { EQUIPMENT, SLOT_ICONS, EQUIPMENT_SLOTS, BLOODLINES, PHYSIQUES, TALENTS, ANCESTORS, getRealm } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

export function renderProfile(player, equipment, skills, rank) {
  const { canvas, ctx, bx, by } = R.layout(player, 'profile', {
    sub: '// CULTIVATION SCROLL', stats: [{ l: 'RANK', v: `#${rank}`, c: C.accent }],
  });

  const realm = getRealm(player.level);

  // Identity
  R.panel(ctx, bx, by, 260, 180, { glow: true, gc: C.primary });
  R.txt(ctx, player.username, bx + 130, by + 14, { s: 18, b: true, c: C.primary, a: 'center', mw: 240 });
  R.txt(ctx, `${['🥇', '🥈', '🥉'][rank - 1] || ''} #${rank}`, bx + 130, by + 36, { s: 14, b: true, c: C.accent, a: 'center' });
  R.txt(ctx, `${realm.icon} ${realm.name}`, bx + 130, by + 56, { s: 12, b: true, c: C.secondary, a: 'center' });
  R.divider(ctx, bx + 20, by + 72, 220);
  // Traits
  const bl = BLOODLINES[player.bloodline], ph = PHYSIQUES[player.physique], tl = TALENTS[player.talent];
  let ty = by + 80;
  if (bl) { R.txt(ctx, `${bl.icon} ${bl.name}`, bx + 20, ty, { s: 9, c: C.text }); ty += 14; }
  if (ph) { R.txt(ctx, `${ph.icon} ${ph.name}`, bx + 20, ty, { s: 9, c: C.text }); ty += 14; }
  if (tl) { R.txt(ctx, `${tl.icon} ${tl.name}`, bx + 20, ty, { s: 9, c: C.text }); ty += 14; }
  R.labelBar(ctx, bx + 20, ty, 220, 'XP', player.xp, player.xp_needed, C.xpBar);

  // Combat
  R.panel(ctx, bx + 272, by, 234, 180, { t: 'COMBAT' });
  let sy = by + 28;
  for (const [l, v, c] of [['LEVEL', player.level, C.secondary], ['ATTACK', player.attack, C.danger], ['DEFENSE', player.defense, C.primary], ['SPEED', player.speed, C.energyBar], ['STRENGTH', player.strength, C.accent], ['MAX HP', player.max_hp, C.hpBar], ['NETWORTH', R.fmt(player.networth) + 'g', C.gold]]) {
    R.txt(ctx, l, bx + 284, sy, { s: 10, c: C.textMuted }); R.txt(ctx, `${v}`, bx + 494, sy, { s: 11, b: true, c, a: 'right' }); sy += 20;
  }

  // Ancestor
  R.panel(ctx, bx + 518, by, 242, 180, { t: 'ANCESTOR' });
  const anc = ANCESTORS[player.ancestor];
  let ay = by + 28;
  if (anc) {
    R.txt(ctx, `${anc.icon} ${anc.name}`, bx + 530, ay, { s: 13, b: true, c: C.legendary }); ay += 18;
    R.txt(ctx, anc.desc, bx + 530, ay, { s: 9, c: C.textDim, mw: 220 }); ay += 16;
    R.txt(ctx, `Favor: ${player.ancestor_favor}`, bx + 530, ay, { s: 11, b: true, c: C.accent }); ay += 18;
    for (const boon of anc.boons) {
      const unlocked = player.ancestor_favor >= boon.favor;
      R.txt(ctx, `${unlocked ? '✅' : '🔒'} ${boon.name}`, bx + 530, ay, { s: 10, c: unlocked ? C.success : C.textMuted });
      R.txt(ctx, `${boon.favor}`, bx + 748, ay, { s: 9, c: unlocked ? C.accent : C.textMuted, a: 'right' }); ay += 16;
    }
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
  R.panel(ctx, bx + 382, by + 192, 378, 154, { t: 'CULTIVATION ARTS' });
  let sky = by + 220;
  if (!skills.length) R.txt(ctx, 'No skills yet.', bx + 394, sky, { s: 11, c: C.textMuted });
  else for (const sk of skills.slice(0, 6)) {
    R.txt(ctx, `${sk.icon} ${sk.name}`, bx + 394, sky, { s: 11, c: C.text });
    R.txt(ctx, `Lv.${sk.level}`, bx + 748, sky, { s: 11, b: true, c: C.secondary, a: 'right' }); sky += 20;
  }
  return R.toBuffer(canvas);
}
