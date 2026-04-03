import { THEME } from '../../core/config.js';
import * as C from '../canvas.js';

const { colors } = THEME;

export function renderMarket(player, cryptoPrice, priceHistory) {
  const { canvas, ctx } = C.createGameCanvas();
  C.drawBackground(ctx);

  // Header
  C.drawTitle(ctx, '◆ NEXUS', 20, 16, 24, colors.primary);
  C.drawText(ctx, '// CRYPTO EXCHANGE', 140, 22, { size: 13, color: colors.textDim });
  C.drawText(ctx, `₡${C.formatNumber(player.credits)}`, 780, 18, { size: 16, bold: true, color: colors.creditsGold, align: 'right' });
  C.drawDivider(ctx, 20, 42, 760);

  // ─── Price Chart ───
  C.drawPanel(ctx, 20, 52, 480, 200, { title: 'NEXCOIN PRICE CHART', glow: true, glowColor: colors.cryptoCyan });

  // Draw chart
  const chartX = 40;
  const chartY = 82;
  const chartW = 440;
  const chartH = 150;

  // Chart grid
  ctx.strokeStyle = hexAlpha(colors.border, 0.3);
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = chartY + (chartH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(chartX, y);
    ctx.lineTo(chartX + chartW, y);
    ctx.stroke();
  }

  if (priceHistory.length > 1) {
    const maxP = Math.max(...priceHistory) * 1.1;
    const minP = Math.min(...priceHistory) * 0.9;
    const range = maxP - minP || 1;

    // Area fill
    ctx.beginPath();
    ctx.moveTo(chartX, chartY + chartH);
    for (let i = 0; i < priceHistory.length; i++) {
      const px = chartX + (i / (priceHistory.length - 1)) * chartW;
      const py = chartY + chartH - ((priceHistory[i] - minP) / range) * chartH;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, chartY, 0, chartY + chartH);
    areaGrad.addColorStop(0, hexAlpha(colors.cryptoCyan, 0.15));
    areaGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Price line
    ctx.beginPath();
    for (let i = 0; i < priceHistory.length; i++) {
      const px = chartX + (i / (priceHistory.length - 1)) * chartW;
      const py = chartY + chartH - ((priceHistory[i] - minP) / range) * chartH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = colors.cryptoCyan;
    ctx.lineWidth = 2;
    ctx.shadowColor = colors.cryptoCyan;
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Current price dot
    const lastX = chartX + chartW;
    const lastY = chartY + chartH - ((priceHistory[priceHistory.length - 1] - minP) / range) * chartH;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = colors.cryptoCyan;
    ctx.fill();

    // Price labels
    C.drawText(ctx, `₡${C.formatNumber(Math.floor(maxP))}`, chartX - 2, chartY - 2, { size: 9, color: colors.textMuted, align: 'right' });
    C.drawText(ctx, `₡${C.formatNumber(Math.floor(minP))}`, chartX - 2, chartY + chartH - 8, { size: 9, color: colors.textMuted, align: 'right' });
  } else {
    C.drawText(ctx, 'Collecting price data...', chartX + chartW / 2, chartY + chartH / 2, { size: 14, color: colors.textDim, align: 'center' });
  }

  // ─── Trading Panel ───
  C.drawPanel(ctx, 520, 52, 260, 200, { title: 'TRADING DESK' });

  let ty = 84;
  C.drawText(ctx, 'NEXCOIN PRICE', 532, ty, { size: 11, color: colors.textMuted });
  ty += 4;
  C.drawText(ctx, `₡${C.formatNumber(cryptoPrice)}`, 532, ty + 12, { size: 28, bold: true, color: colors.cryptoCyan });
  ty += 48;

  C.drawDivider(ctx, 532, ty, 236);
  ty += 12;

  C.drawText(ctx, 'YOUR HOLDINGS', 532, ty, { size: 11, color: colors.textMuted });
  ty += 16;
  C.drawText(ctx, `◈ ${C.formatNumber(player.crypto)} units`, 532, ty, { size: 16, bold: true, color: colors.text });
  ty += 20;
  const holdingValue = player.crypto * cryptoPrice;
  C.drawText(ctx, `Value: ₡${C.formatNumber(holdingValue)}`, 532, ty, { size: 13, color: colors.creditsGold });
  ty += 24;

  C.drawDivider(ctx, 532, ty, 236);
  ty += 12;

  C.drawText(ctx, 'AVAILABLE', 532, ty, { size: 11, color: colors.textMuted });
  C.drawText(ctx, `₡${C.formatNumber(player.credits)}`, 768, ty, { size: 13, bold: true, color: colors.creditsGold, align: 'right' });

  // ─── Trade Actions Panel ───
  C.drawPanel(ctx, 20, 266, 760, 120, { title: 'QUICK TRADE' });

  const amounts = [1, 5, 10, 50];
  const btnW = 80;
  const btnGap = 8;

  // Buy buttons
  C.drawText(ctx, 'BUY', 32, 296, { size: 12, bold: true, color: colors.success });
  for (let i = 0; i < amounts.length; i++) {
    const bx = 80 + i * (btnW + btnGap);
    const cost = amounts[i] * cryptoPrice;
    const canBuy = player.credits >= cost;
    C.drawButton(ctx, bx, 290, btnW, 28, `${amounts[i]}x (₡${C.formatNumber(cost)})`,
      canBuy ? colors.success : colors.danger, canBuy);
  }

  // Sell buttons
  C.drawText(ctx, 'SELL', 32, 332, { size: 12, bold: true, color: colors.danger });
  for (let i = 0; i < amounts.length; i++) {
    const bx = 80 + i * (btnW + btnGap);
    const revenue = amounts[i] * cryptoPrice;
    const canSell = player.crypto >= amounts[i];
    C.drawButton(ctx, bx, 326, btnW, 28, `${amounts[i]}x (+₡${C.formatNumber(revenue)})`,
      canSell ? colors.cryptoCyan : colors.danger, canSell);
  }

  // Max buy/sell
  const maxBuyable = Math.floor(player.credits / cryptoPrice);
  C.drawText(ctx, `Max buy: ${C.formatNumber(maxBuyable)} units`, 500, 300, { size: 11, color: colors.textDim });
  C.drawText(ctx, `Max sell: ${C.formatNumber(player.crypto)} units`, 500, 336, { size: 11, color: colors.textDim });

  // Nav Bar
  C.drawPanel(ctx, 20, 400, 760, 42);
  const tabs = ['DASHBOARD', 'BUSINESS', 'MISSIONS', 'MARKET', 'UPGRADES', 'PROFILE'];
  const tabW = 120;
  for (let i = 0; i < tabs.length; i++) {
    C.drawButton(ctx, 30 + i * tabW + i * 5, 406, tabW, 30, tabs[i], colors.primary, tabs[i] === 'MARKET');
  }

  C.drawText(ctx, 'Prices update every 30 seconds — trade wisely', 20, 455, { size: 10, color: colors.textMuted });

  for (let y = 0; y < 500; y += 3) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
    ctx.fillRect(0, y, 800, 1);
  }

  return C.canvasToBuffer(canvas);
}

function hexAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
