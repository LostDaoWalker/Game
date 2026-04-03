import { THEME, RAIDS } from '../../core/config.js';
import * as C from '../canvas.js';
import { createLayout } from '../layout.js';

const { colors } = THEME;

export function renderRaids(player, combatResult = null) {
  const { canvas, ctx, body } = createLayout(player, 'raids', {
    subtitle: '// RAID BOSSES',
    rightStats: [
      { label: '⚡', value: `${player.stamina}/${player.max_stamina}`, color: colors.staminaBar },
      { label: '🪙', value: C.formatNumber(player.gold), color: colors.gold },
    ],
  });

  if (combatResult) {
    drawRaidResult(ctx, body, player, combatResult);
  } else {
    drawRaidSelect(ctx, body, player);
  }

  return C.canvasToBuffer(canvas);
}

function drawRaidSelect(ctx, body, player) {
  const entries = Object.entries(RAIDS);
  const cardW = 368;
  const cardH = 140;

  for (let i = 0; i < entries.length; i++) {
    const [, raid] = entries[i];
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = body.x + col * (cardW + 24);
    const y = body.y + row * (cardH + 8);
    const locked = player.level < raid.minLevel;
    const canFight = !locked && player.stamina >= raid.staminaCost;

    C.drawPanel(ctx, x, y, cardW, cardH, { glow: canFight, glowColor: colors.legendary });

    C.drawText(ctx, `${raid.icon} ${raid.name}`, x + 12, y + 8, {
      size: 15, bold: true, color: locked ? colors.textMuted : colors.legendary,
    });
    if (locked) {
      C.drawText(ctx, `🔒 LVL ${raid.minLevel}`, x + cardW - 12, y + 10, { size: 11, color: colors.danger, align: 'right' });
    } else {
      C.drawText(ctx, `⚡${raid.staminaCost}`, x + cardW - 12, y + 10, { size: 11, color: canFight ? colors.staminaBar : colors.danger, align: 'right' });
    }

    C.drawText(ctx, raid.description, x + 12, y + 30, { size: 10, color: colors.textDim, maxWidth: cardW - 24 });

    // Boss stats
    C.drawText(ctx, `❤${C.formatNumber(raid.hp)}`, x + 12, y + 48, { size: 11, color: colors.hpBar });
    C.drawText(ctx, `⚔${raid.atk}`, x + 90, y + 48, { size: 11, color: colors.danger });
    C.drawText(ctx, `🛡${raid.def}`, x + 140, y + 48, { size: 11, color: colors.primary });
    C.drawText(ctx, `⚡${raid.spd}`, x + 190, y + 48, { size: 11, color: colors.energyBar });

    C.drawDivider(ctx, x + 12, y + 66, cardW - 24);

    // Rewards
    const [minG, maxG] = raid.rewards.gold;
    const [minX, maxX] = raid.rewards.xp;
    C.drawText(ctx, `🪙 ${C.formatNumber(minG)}-${C.formatNumber(maxG)}`, x + 12, y + 74, { size: 10, color: colors.gold });
    C.drawText(ctx, `✨ ${C.formatNumber(minX)}-${C.formatNumber(maxX)}xp`, x + 130, y + 74, { size: 10, color: colors.xpBar });
    C.drawText(ctx, `${Math.floor(raid.lootChance * 100)}% loot`, x + cardW - 12, y + 74, { size: 10, color: colors.accent, align: 'right' });

    // Loot preview
    let lx = x + 12;
    C.drawText(ctx, 'DROPS:', lx, y + 92, { size: 9, color: colors.textMuted });
    lx += 42;
    for (const itemId of raid.lootTable.slice(0, 3)) {
      const name = itemId.replace(/_/g, ' ');
      C.drawText(ctx, name, lx, y + 92, { size: 9, color: colors.text });
      lx += ctx.measureText(name).width + 12;
    }

    C.drawProgressBar(ctx, x + 12, y + 110, cardW - 24, 5, 1, colors.danger);
    C.drawText(ctx, 'BOSS HP', x + 12, y + 120, { size: 8, color: colors.textMuted });
  }
}

function drawRaidResult(ctx, body, player, result) {
  const won = result.won;
  const boss = result.boss;

  C.drawPanel(ctx, body.x, body.y, body.w, 46, { glow: true, glowColor: won ? colors.success : colors.danger });
  C.drawText(ctx, won ? '👑 BOSS SLAIN!' : '💀 DEFEATED', 400, body.y + 6, {
    size: 22, bold: true, color: won ? colors.legendary : colors.danger, align: 'center',
  });
  C.drawText(ctx, `${boss.icon} ${boss.name}`, 400, body.y + 30, { size: 12, color: colors.textDim, align: 'center' });

  // Stats + Rewards (compact two-column)
  const panelY = body.y + 56;
  C.drawPanel(ctx, body.x, panelY, 368, 100, { title: 'BATTLE STATS' });
  let sy = panelY + 28;
  for (const [label, val, col] of [
    ['Dealt', result.combat.damageDealt, colors.danger],
    ['Taken', result.combat.damageTaken, colors.hpBar],
    ['Rounds', result.combat.rounds, colors.text],
  ]) {
    C.drawText(ctx, label, body.x + 12, sy, { size: 11, color: colors.textMuted });
    C.drawText(ctx, `${val}`, body.x + 356, sy, { size: 12, bold: true, color: col, align: 'right' });
    sy += 20;
  }

  C.drawPanel(ctx, body.x + 392, panelY, 368, 100, { title: 'REWARDS', glow: won, glowColor: colors.gold });
  let ry = panelY + 28;
  C.drawText(ctx, `🪙 +${C.formatNumber(result.gold)}`, body.x + 404, ry, { size: 14, bold: true, color: colors.gold });
  C.drawText(ctx, `✨ +${C.formatNumber(result.xp)}xp`, body.x + 540, ry, { size: 14, bold: true, color: colors.xpBar });
  ry += 24;
  if (result.lootItem) {
    C.drawText(ctx, `🎁 ${result.lootItem.icon} ${result.lootItem.name}`, body.x + 404, ry, {
      size: 13, bold: true, color: C.getRarityColor(result.lootItem.rarity),
    });
    ry += 20;
  }
  if (result.leveled) {
    C.drawText(ctx, `🎉 LEVEL UP → Lv.${result.newLevel}`, body.x + 404, ry, { size: 13, bold: true, color: colors.accent });
  }

  // Combat log
  C.drawPanel(ctx, body.x, panelY + 112, body.w, 170, { title: 'COMBAT LOG' });
  let logY = panelY + 138;
  for (const entry of result.combat.log.slice(-10)) {
    const isYou = entry.side === 'attacker';
    C.drawText(ctx, `[${isYou ? 'YOU' : 'BOSS'}] ${entry.text}`, body.x + 12, logY, {
      size: 10, color: isYou ? colors.primary : colors.danger,
    });
    logY += 14;
  }
}
