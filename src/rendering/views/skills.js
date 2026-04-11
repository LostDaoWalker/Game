import { SKILLS } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;
const TC = { offensive: C.danger, defensive: C.primary, utility: C.accent };

export function renderSkills(player, skills, offers) {
  const { canvas, ctx, bx, by } = R.layout(player, 'skills', {
    sub: '// CULTIVATION ARTS',
    stats: [{ l: 'LVL', v: `${player.level}`, c: C.secondary }, { l: '🎯', v: `${player.pending_skill_picks} picks`, c: C.accent }],
  });

  // Offers
  let offH = 0;
  if (player.pending_skill_picks > 0 && offers) {
    offH = 108;
    R.panel(ctx, bx, by, 760, 100, { t: `🎯 CHOOSE A SKILL (${player.pending_skill_picks} left)`, glow: true, gc: C.accent });
    for (let i = 0; i < 3; i++) {
      const sk = SKILLS[[offers.skill1, offers.skill2, offers.skill3][i]]; if (!sk) continue;
      const x = bx + 8 + i * 248, y = by + 28;
      ctx.fillStyle = 'rgba(245,158,11,.06)'; R.rr(ctx, x, y, 240, 62, 6); ctx.fill();
      ctx.strokeStyle = R.rgba(C.accent, .3); ctx.lineWidth = 1; R.rr(ctx, x, y, 240, 62, 6); ctx.stroke();
      R.txt(ctx, `${sk.icon} ${sk.name}`, x + 8, y + 6, { s: 13, b: true, c: C.text });
      R.txt(ctx, sk.type.toUpperCase(), x + 232, y + 8, { s: 9, c: TC[sk.type], a: 'right' });
      R.txt(ctx, sk.description, x + 8, y + 26, { s: 10, c: C.textDim, mw: 224 });
      const owned = skills.find(s => s.id === [offers.skill1, offers.skill2, offers.skill3][i]);
      R.txt(ctx, owned ? `Lv.${owned.level}→${owned.level + 1}` : 'NEW', x + 232, y + 46, { s: 10, b: true, c: owned ? C.success : C.accent, a: 'right' });
    }
  }

  // Learned
  R.panel(ctx, bx, by + offH, 760, 346 - offH, { t: 'LEARNED SKILLS' });
  if (!skills.length) { R.txt(ctx, 'No skills — level up to unlock!', bx + 12, by + offH + 36, { s: 13, c: C.textMuted }); return R.toBuffer(canvas); }

  const groups = { offensive: [], defensive: [], utility: [] };
  for (const sk of skills) groups[sk.type]?.push(sk);
  let ci = 0;
  for (const [type, items] of Object.entries(groups)) {
    const cx = bx + 8 + ci * 253; let cy = by + offH + 28;
    R.txt(ctx, `${type === 'offensive' ? '⚔️' : type === 'defensive' ? '🛡️' : '🔧'} ${type.toUpperCase()}`, cx, cy, { s: 11, b: true, c: TC[type] }); cy += 18;
    if (!items.length) R.txt(ctx, 'None', cx + 4, cy, { s: 10, c: C.textMuted });
    for (const sk of items) {
      R.txt(ctx, `${sk.icon} ${sk.name}`, cx + 4, cy, { s: 11, c: C.text });
      const ml = SKILLS[sk.id]?.maxLevel || 3;
      for (let d = 0; d < ml; d++) { ctx.beginPath(); ctx.arc(cx + 245 - (ml - 1 - d) * 12, cy + 6, 4, 0, Math.PI * 2); ctx.fillStyle = d < sk.level ? TC[type] : R.rgba(C.border, .5); ctx.fill(); }
      cy += 12; R.txt(ctx, sk.description, cx + 4, cy, { s: 9, c: C.textDim, mw: 230 }); cy += 18;
    }
    ci++;
  }
  return R.toBuffer(canvas);
}
