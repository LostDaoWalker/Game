import { THEME, ZONES, ENEMIES, ECONOMY } from '../../core/config.js';
import * as C from '../canvas.js';
import { createLayout, drawLabeledBar } from '../layout.js';

const { colors } = THEME;

export function renderFight(player, combatResult = null) {
  const { canvas, ctx, body } = createLayout(player, 'fight', {
    subtitle: '// COMBAT ZONE',
    rightStats: [
      { label: '⚡', value: `${player.stamina}/${player.max_stamina}`, color: colors.staminaBar },
      { label: '🪙', value: C.formatNumber(player.gold), color: colors.gold },
    ],
  });

  if (combatResult) {
    drawCombatResult(ctx, body, player, combatResult);
  } else {
    drawZoneSelect(ctx, body, player);
  }

  return C.canvasToBuffer(canvas);
}

function drawZoneSelect(ctx, body, player) {
  const bx = body.x;
  const by = body.y;
  const entries = Object.entries(ZONES);
  const cardW = 368;
  const cardH = 76;
  const gap = 8;

  for (let i = 0; i < entries.length; i++) {
    const [zoneId, zone] = entries[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = bx + col * (cardW + 24);
    const y = by + row * (cardH + gap);
    const locked = player.level < zone.minLevel;

    C.drawPanel(ctx, x, y, cardW, cardH, {
      glow: !locked, glowColor: locked ? colors.danger : colors.primary,
    });

    C.drawText(ctx, `${zone.icon} ${zone.name}`, x + 12, y + 8, {
      size: 14, bold: true, color: locked ? colors.textMuted : colors.text,
    });

    if (locked) {
      C.drawText(ctx, `🔒 Level ${zone.minLevel}`, x + cardW - 12, y + 10, { size: 11, color: colors.danger, align: 'right' });
    } else {
      C.drawText(ctx, `⚡${zone.staminaCost}`, x + cardW - 12, y + 10, { size: 11, color: colors.staminaBar, align: 'right' });
    }

    // Enemies in zone
    const zoneEnemies = Object.entries(ENEMIES).filter(([_, e]) => e.zone === zoneId);
    let ey = y + 30;
    for (const [_, enemy] of zoneEnemies) {
      const eLocked = player.level < enemy.minLevel;
      C.drawText(ctx, `${enemy.icon} ${enemy.name}`, x + 20, ey, {
        size: 10, color: eLocked ? colors.textMuted : colors.textDim,
      });
      C.drawText(ctx, `Lv.${enemy.minLevel}+`, x + cardW - 16, ey, {
        size: 9, color: eLocked ? colors.danger : colors.textMuted, align: 'right',
      });
      ey += 13;
    }
  }

  // PvP Arena
  const pvpY = by + 2 * (cardH + gap);
  C.drawPanel(ctx, bx, pvpY, body.w, 62, { title: 'PVP ARENA', glow: true, glowColor: colors.secondary });
  C.drawText(ctx, '⚔️ Challenge a random opponent near your level', bx + 12, pvpY + 28, { size: 13, color: colors.text });
  C.drawText(ctx, `⚡${ECONOMY.pvpStaminaCost} stamina`, bx + 12, pvpY + 44, { size: 11, color: colors.staminaBar });
  C.drawText(ctx, 'Win gold, XP, and glory', bx + 180, pvpY + 44, { size: 11, color: colors.textDim });

  // HP Bar
  const hpY = pvpY + 72;
  C.drawPanel(ctx, bx, hpY, body.w, 34);
  C.drawText(ctx, `HP: ${player.hp}/${player.max_hp}`, bx + 12, hpY + 10, { size: 12, bold: true, color: colors.hpBar });
  C.drawProgressBar(ctx, bx + 160, hpY + 10, 400, 11, player.hp / player.max_hp, colors.hpBar);
  if (player.hp < player.max_hp) {
    const cost = Math.floor((player.max_hp - player.hp) * ECONOMY.healCostPerHp);
    C.drawText(ctx, `Heal: ${cost}g`, bx + body.w - 12, hpY + 10, { size: 11, color: colors.gold, align: 'right' });
  } else {
    C.drawText(ctx, '✓ Full', bx + body.w - 12, hpY + 10, { size: 11, color: colors.success, align: 'right' });
  }
}

function drawCombatResult(ctx, body, player, result) {
  const bx = body.x;
  const by = body.y;
  const won = result.won;
  const enemyName = result.enemy?.name || result.boss?.name || result.opponent?.name || 'Unknown';

  // Victory / Defeat Banner
  C.drawPanel(ctx, bx, by, body.w, 48, { glow: true, glowColor: won ? colors.success : colors.danger });
  C.drawText(ctx, won ? '⚔️  VICTORY' : '💀  DEFEATED', 400, by + 6, {
    size: 24, bold: true, color: won ? colors.success : colors.danger, align: 'center',
  });
  C.drawText(ctx, `vs ${enemyName}`, 400, by + 32, { size: 12, color: colors.textDim, align: 'center' });

  // Battle Stats
  C.drawPanel(ctx, bx, by + 58, 368, 120, { title: 'BATTLE STATS' });
  let sy = by + 86;
  const statRows = [
    ['Damage Dealt', result.combat.damageDealt, colors.danger],
    ['Damage Taken', result.combat.damageTaken, colors.hpBar],
    ['Rounds', result.combat.rounds, colors.text],
    ['HP Remaining', result.combat.attackerHp, colors.success],
  ];
  for (const [label, val, col] of statRows) {
    C.drawText(ctx, label, bx + 12, sy, { size: 11, color: colors.textMuted });
    C.drawText(ctx, `${val}`, bx + 356, sy, { size: 12, bold: true, color: col, align: 'right' });
    sy += 20;
  }
  C.drawProgressBar(ctx, bx + 12, sy, 344, 7, result.combat.attackerHp / (player.max_hp || 100), colors.hpBar);

  // Rewards
  C.drawPanel(ctx, bx + 392, by + 58, 368, 120, { title: 'REWARDS', glow: won, glowColor: colors.gold });
  let ry = by + 86;
  C.drawText(ctx, '🪙 Gold', bx + 404, ry, { size: 12, color: colors.textMuted });
  C.drawText(ctx, `+${C.formatNumber(result.gold)}`, bx + 748, ry, { size: 15, bold: true, color: colors.gold, align: 'right' });
  ry += 22;
  C.drawText(ctx, '✨ XP', bx + 404, ry, { size: 12, color: colors.textMuted });
  C.drawText(ctx, `+${C.formatNumber(result.xp)}`, bx + 748, ry, { size: 15, bold: true, color: colors.xpBar, align: 'right' });
  ry += 22;

  if (result.lootItem) {
    C.drawText(ctx, '🎁 LOOT', bx + 404, ry, { size: 12, bold: true, color: colors.legendary });
    C.drawText(ctx, `${result.lootItem.icon} ${result.lootItem.name}`, bx + 748, ry, {
      size: 12, bold: true, color: C.getRarityColor(result.lootItem.rarity), align: 'right',
    });
    ry += 22;
  }

  if (result.leveled) {
    C.drawText(ctx, `🎉 LEVEL UP → Lv.${result.newLevel}`, bx + 404, ry, { size: 13, bold: true, color: colors.accent });
  }

  // Combat Log
  C.drawPanel(ctx, bx, by + 188, body.w, 148, { title: 'COMBAT LOG' });
  let logY = by + 214;
  for (const entry of result.combat.log.slice(-9)) {
    const isYou = entry.side === 'attacker';
    C.drawText(ctx, `[${isYou ? 'YOU' : 'FOE'}]`, bx + 12, logY, { size: 10, bold: true, color: isYou ? colors.primary : colors.danger });
    C.drawText(ctx, entry.text, bx + 60, logY, { size: 10, color: isYou ? colors.text : colors.textDim });
    logY += 14;
  }
}
