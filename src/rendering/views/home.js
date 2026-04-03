import { SLOT_ICONS } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

export function renderHome(player, equipped, skills, log, lb) {
  const { canvas, ctx, bx, by } = R.layout(player, 'home', {
    sub: `// ${player.username}`,
    stats: [{ l: 'LVL', v: `${player.level}`, c: C.secondary }, { l: 'NET', v: `${R.fmt(player.networth)}g`, c: C.gold }],
  });

  // Status
  R.panel(ctx, bx, by, 240, 200, { t: 'STATUS' });
  let y = by + 28;
  R.labelBar(ctx, bx + 12, y, 216, 'XP', player.xp, player.xp_needed, C.xpBar); y += 28;
  R.labelBar(ctx, bx + 12, y, 216, 'HP', player.hp, player.max_hp, C.hpBar); y += 28;
  R.labelBar(ctx, bx + 12, y, 216, 'STAMINA', player.stamina, player.max_stamina, C.staminaBar); y += 32;
  for (const [lbl, v, c] of [['⚔', player.attack, C.danger], ['🛡', player.defense, C.primary], ['💪', player.strength, C.accent]])
    { R.txt(ctx, `${lbl} ${v}`, bx + 12 + [0, 68, 136][[C.danger, C.primary, C.accent].indexOf(c)], y, { s: 12, b: true, c }); }
  y += 18;
  R.txt(ctx, `⚡ ${player.speed}`, bx + 12, y, { s: 12, b: true, c: C.energyBar });
  R.txt(ctx, `🪙 ${R.fmt(player.gold)}`, bx + 80, y, { s: 13, b: true, c: C.gold });

  // Gear
  R.panel(ctx, bx + 252, by, 248, 200, { t: 'EQUIPPED' });
  let ey = by + 28;
  for (const slot of Object.keys(SLOT_ICONS)) {
    const item = equipped.find(e => e.slot === slot);
    R.txt(ctx, `${SLOT_ICONS[slot]} ${slot.toUpperCase()}`, bx + 264, ey, { s: 10, c: C.textMuted });
    R.txt(ctx, item ? item.name : '— empty —', bx + 488, ey, { s: 11, b: !!item, c: item ? R.rarityColor(item.rarity) : C.textMuted, a: 'right' });
    ey += 24;
  }
  ey += 8; R.divider(ctx, bx + 264, ey, 224); ey += 10;
  R.txt(ctx, `W/L: ${player.wins}/${player.losses}`, bx + 264, ey, { s: 11, c: C.text });
  R.txt(ctx, `PVP: ${player.pvp_wins}/${player.pvp_losses}`, bx + 380, ey, { s: 11, c: C.secondary });
  ey += 16; R.txt(ctx, `👑 Raids: ${player.raids_completed}`, bx + 264, ey, { s: 11, c: C.legendary });

  // Log
  R.panel(ctx, bx + 512, by, 248, 200, { t: 'BATTLE LOG' });
  let ly = by + 28;
  if (!log.length) R.txt(ctx, 'No battles yet.', bx + 524, ly, { s: 11, c: C.textMuted });
  else for (const e of log.slice(0, 6)) {
    const badge = e.opponent_type === 'pvp' ? '⚔️' : e.opponent_type === 'raid' ? '👑' : '🗡️';
    R.txt(ctx, `${e.won ? '✅' : '❌'}${badge} ${e.opponent_name}`, bx + 524, ly, { s: 10, c: e.won ? C.success : C.danger, mw: 200 });
    R.txt(ctx, e.won ? `+${e.gold_earned}g +${e.xp_earned}xp` : `+${e.xp_earned}xp`, bx + 524, ly + 12, { s: 9, c: C.textDim });
    ly += 28;
  }

  // Leaderboard
  R.panel(ctx, bx, by + 212, 370, 108, { t: 'TOP FIGHTERS', glow: true, gc: C.accent });
  let lby = by + 240;
  for (let i = 0; i < Math.min(4, lb.length); i++) {
    const e = lb[i], me = e.id === player.id;
    R.txt(ctx, `${['🥇', '🥈', '🥉'][i] || `#${i + 1}`} ${e.username}`, bx + 12, lby, { s: 11, b: me, c: me ? C.primary : C.text, mw: 200 });
    R.txt(ctx, `Lv.${e.level}`, bx + 260, lby, { s: 11, c: C.secondary });
    R.txt(ctx, `${R.fmt(e.networth)}g`, bx + 358, lby, { s: 11, c: C.gold, a: 'right' }); lby += 22;
  }

  // Skills
  R.panel(ctx, bx + 382, by + 212, 378, 108, { t: 'SKILLS' });
  let sky = by + 240;
  if (!skills.length) R.txt(ctx, 'Level up to unlock skills!', bx + 394, sky, { s: 11, c: C.textMuted });
  else for (const sk of skills.slice(0, 4)) {
    R.txt(ctx, `${sk.icon} ${sk.name}`, bx + 394, sky, { s: 11, c: C.text });
    R.txt(ctx, `Lv.${sk.level}`, bx + 748, sky, { s: 11, b: true, c: C.secondary, a: 'right' }); sky += 22;
  }

  if (player.pending_skill_picks > 0) {
    R.panel(ctx, 260, by + 330, 280, 26, { glow: true, gc: C.accent });
    R.txt(ctx, `🎯 ${player.pending_skill_picks} SKILL PICK${player.pending_skill_picks > 1 ? 'S' : ''} AVAILABLE!`, 400, by + 336, { s: 12, b: true, c: C.accent, a: 'center' });
  }
  return R.toBuffer(canvas);
}
