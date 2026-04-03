import { THEME, SKILLS } from '../../core/config.js';
import * as C from '../canvas.js';
import { createLayout } from '../layout.js';

const { colors } = THEME;

export function renderSkills(player, playerSkills, offers) {
  const { canvas, ctx, body } = createLayout(player, 'skills', {
    subtitle: '// SKILL TREE',
    rightStats: [
      { label: 'LVL', value: `${player.level}`, color: colors.secondary },
      { label: '🎯', value: `${player.pending_skill_picks} picks`, color: colors.accent },
    ],
  });

  const bx = body.x;
  const by = body.y;

  // ─── Skill Pick Offer (if available) ───
  if (player.pending_skill_picks > 0 && offers) {
    C.drawPanel(ctx, bx, by, body.w, 100, {
      title: `🎯 CHOOSE A SKILL (${player.pending_skill_picks} pick${player.pending_skill_picks > 1 ? 's' : ''} remaining)`,
      glow: true, glowColor: colors.accent,
    });

    const offerIds = [offers.skill1, offers.skill2, offers.skill3];
    const cardW = 240;
    for (let i = 0; i < 3; i++) {
      const sk = SKILLS[offerIds[i]];
      if (!sk) continue;
      const x = bx + 8 + i * (cardW + 8);
      const y = by + 28;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
      C.roundRect(ctx, x, y, cardW, 62, 6);
      ctx.fill();
      ctx.strokeStyle = C.hexToRgba(colors.accent, 0.3);
      ctx.lineWidth = 1;
      C.roundRect(ctx, x, y, cardW, 62, 6);
      ctx.stroke();

      C.drawText(ctx, `${sk.icon} ${sk.name}`, x + 8, y + 6, { size: 13, bold: true, color: colors.text });
      const typeColor = sk.type === 'offensive' ? colors.danger : sk.type === 'defensive' ? colors.primary : colors.accent;
      C.drawText(ctx, sk.type.toUpperCase(), x + cardW - 8, y + 8, { size: 9, color: typeColor, align: 'right' });
      C.drawText(ctx, sk.description, x + 8, y + 26, { size: 10, color: colors.textDim, maxWidth: cardW - 16 });

      // Check if already owned
      const owned = playerSkills.find(s => s.skill_id === offerIds[i]);
      if (owned) {
        C.drawText(ctx, `Lv.${owned.level} → ${owned.level + 1}`, x + cardW - 8, y + 46, {
          size: 10, bold: true, color: colors.success, align: 'right',
        });
      } else {
        C.drawText(ctx, 'NEW', x + cardW - 8, y + 46, { size: 10, bold: true, color: colors.accent, align: 'right' });
      }
    }
  }

  // ─── Learned Skills ───
  const skillsY = player.pending_skill_picks > 0 && offers ? by + 112 : by;
  const skillsH = player.pending_skill_picks > 0 && offers ? 234 : 346;
  C.drawPanel(ctx, bx, skillsY, body.w, skillsH, { title: 'LEARNED SKILLS' });

  if (playerSkills.length === 0) {
    C.drawText(ctx, 'No skills learned yet.', bx + 12, skillsY + 36, { size: 13, color: colors.textMuted });
    C.drawText(ctx, 'Level up to receive skill picks — choose 1 of 3 random skills each level.', bx + 12, skillsY + 56, {
      size: 11, color: colors.textDim,
    });
    return C.canvasToBuffer(canvas);
  }

  // Group by type
  const groups = { offensive: [], defensive: [], utility: [] };
  for (const ps of playerSkills) {
    const cfg = SKILLS[ps.skill_id];
    if (cfg) groups[cfg.type]?.push({ ...cfg, level: ps.level, id: ps.skill_id });
  }

  const colW = 245;
  const typeColors = { offensive: colors.danger, defensive: colors.primary, utility: colors.accent };
  const typeIcons = { offensive: '⚔️', defensive: '🛡️', utility: '🔧' };
  let colIdx = 0;

  for (const [type, items] of Object.entries(groups)) {
    if (items.length === 0 && playerSkills.length > 3) continue; // skip empty columns if we have skills
    const cx = bx + 8 + colIdx * (colW + 8);
    let cy = skillsY + 28;

    C.drawText(ctx, `${typeIcons[type]} ${type.toUpperCase()}`, cx, cy, {
      size: 11, bold: true, color: typeColors[type],
    });
    cy += 18;

    if (items.length === 0) {
      C.drawText(ctx, 'None yet', cx + 4, cy, { size: 10, color: colors.textMuted });
    }

    for (const sk of items) {
      C.drawText(ctx, `${sk.icon} ${sk.name}`, cx + 4, cy, { size: 11, color: colors.text });

      // Level dots
      const maxLvl = SKILLS[sk.id]?.maxLevel || 3;
      const dotX = cx + colW - 8;
      for (let d = maxLvl - 1; d >= 0; d--) {
        ctx.beginPath();
        ctx.arc(dotX - d * 12, cy + 6, 4, 0, Math.PI * 2);
        ctx.fillStyle = d < sk.level ? typeColors[type] : C.hexToRgba(colors.border, 0.5);
        ctx.fill();
      }
      cy += 12;
      C.drawText(ctx, sk.description, cx + 4, cy, { size: 9, color: colors.textDim, maxWidth: colW - 16 });
      cy += 18;
    }

    colIdx++;
  }

  return C.canvasToBuffer(canvas);
}
