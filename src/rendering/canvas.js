import { createCanvas } from '@napi-rs/canvas';
import { THEME, CANVAS, RARITIES } from '../core/config.js';

const { colors } = THEME;
const { width, height } = CANVAS;

// ═══════════════════════════════════════════════
// Canvas Factory
// ═══════════════════════════════════════════════

export function createGameCanvas() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.imageSmoothingEnabled = true;
  return { canvas, ctx };
}

export function canvasToBuffer(canvas) {
  return canvas.toBuffer('image/png');
}

// ═══════════════════════════════════════════════
// Background & Atmosphere
// ═══════════════════════════════════════════════

export function drawBackground(ctx) {
  // Deep warm gradient — cozy but modern
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#0c1018');
  grad.addColorStop(0.5, '#0a0e17');
  grad.addColorStop(1, '#080b12');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, width, height, 12);
  ctx.fill();

  // Soft grid — subtle warmth
  ctx.strokeStyle = 'rgba(168, 140, 255, 0.018)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 48) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = 0; y < height; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  // Ambient glow orbs for cozy warmth
  drawGlow(ctx, 80, 60, 90, colors.secondary, 0.025);
  drawGlow(ctx, width - 100, height - 80, 110, colors.primary, 0.018);
  drawGlow(ctx, width / 2, 250, 150, '#f59e0b', 0.012);
}

function drawGlow(ctx, x, y, radius, color, alpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, hexToRgba(color, alpha));
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function drawScanlines(ctx) {
  for (let y = 0; y < height; y += 4) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.015)';
    ctx.fillRect(0, y, width, 1);
  }
}

// ═══════════════════════════════════════════════
// Panel — the core building block
// ═══════════════════════════════════════════════

export function drawPanel(ctx, x, y, w, h, opts = {}) {
  const { title, glow, glowColor, filled } = opts;

  // Shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  roundRect(ctx, x + 1, y + 1, w, h, 8);
  ctx.fill();

  // Background
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, filled || colors.panel);
  grad.addColorStop(1, filled ? hexToRgba(filled, 0.85) : hexToRgba(colors.panel, 0.88));
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = glow ? (glowColor || colors.primary) : colors.border;
  ctx.lineWidth = glow ? 1.5 : 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();

  // Glow bloom
  if (glow) {
    ctx.shadowColor = glowColor || colors.primary;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = hexToRgba(glowColor || colors.primary, 0.35);
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Title bar
  if (title) {
    ctx.fillStyle = colors.textMuted;
    ctx.font = `bold 10px 'Courier New', monospace`;
    ctx.fillText(title.toUpperCase(), x + 10, y + 8);
    // Accent dot
    ctx.fillStyle = glowColor || colors.primary;
    ctx.beginPath();
    ctx.arc(x + 6, y + 13, 2, 0, Math.PI * 2);
    ctx.fill();
    // Subtle separator
    ctx.strokeStyle = hexToRgba(colors.border, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 22);
    ctx.lineTo(x + w - 10, y + 22);
    ctx.stroke();
  }
}

// ═══════════════════════════════════════════════
// Progress Bars
// ═══════════════════════════════════════════════

export function drawProgressBar(ctx, x, y, w, h, progress, color, bgColor) {
  const p = Math.max(0, Math.min(1, progress));

  // Track
  ctx.fillStyle = bgColor || 'rgba(0, 0, 0, 0.35)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();

  // Fill
  const fillW = Math.max(0, p * w);
  if (fillW > 2) {
    const grad = ctx.createLinearGradient(x, y, x + fillW, y);
    grad.addColorStop(0, hexToRgba(color, 0.9));
    grad.addColorStop(1, hexToRgba(color, 0.6));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, fillW, h, h / 2);
    ctx.fill();

    // Top shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, x + 1, y, fillW - 2, h * 0.45, h / 2);
    ctx.fill();
  }
}

// ═══════════════════════════════════════════════
// Text Primitives
// ═══════════════════════════════════════════════

export function drawTitle(ctx, text, x, y, size, color) {
  ctx.font = `bold ${size || 28}px 'Courier New', monospace`;
  ctx.shadowColor = color || colors.primary;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color || colors.primary;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

export function drawText(ctx, text, x, y, opts = {}) {
  const { size = 14, color = colors.text, bold = false, align = 'left', maxWidth } = opts;
  ctx.font = `${bold ? 'bold ' : ''}${size}px 'Courier New', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if (maxWidth) ctx.fillText(text, x, y, maxWidth);
  else ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function drawDivider(ctx, x, y, w) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.3, hexToRgba(colors.border, 0.6));
  grad.addColorStop(0.7, hexToRgba(colors.border, 0.6));
  grad.addColorStop(1, 'transparent');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

export function drawButton(ctx, x, y, w, h, label, color, active = false) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (active) {
    grad.addColorStop(0, hexToRgba(color, 0.25));
    grad.addColorStop(1, hexToRgba(color, 0.12));
  } else {
    grad.addColorStop(0, hexToRgba(colors.panelLight, 0.8));
    grad.addColorStop(1, hexToRgba(colors.panel, 0.6));
  }
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 5);
  ctx.fill();

  ctx.strokeStyle = active ? hexToRgba(color, 0.7) : hexToRgba(colors.border, 0.5);
  ctx.lineWidth = active ? 1.5 : 1;
  roundRect(ctx, x, y, w, h, 5);
  ctx.stroke();

  ctx.fillStyle = active ? color : colors.textDim;
  ctx.font = `bold 10px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 - 4);
  ctx.textAlign = 'left';
}

// ═══════════════════════════════════════════════
// Rarity & Formatting Utils
// ═══════════════════════════════════════════════

export function getRarityColor(rarity) {
  return RARITIES[rarity]?.color || colors.text;
}

export function formatNumber(n) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatTime(seconds) {
  if (seconds <= 0) return 'Ready';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ═══════════════════════════════════════════════
// Geometry
// ═══════════════════════════════════════════════

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function hexToRgba(hex, alpha = 1) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
