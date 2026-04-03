import { createCanvas } from '@napi-rs/canvas';
import { THEME, CANVAS } from '../core/config.js';

const { colors } = THEME;
const { width, height, padding, cornerRadius } = CANVAS;

// ─── Canvas Helpers ─────────────────────────────

export function createGameCanvas() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.imageSmoothingEnabled = true;
  return { canvas, ctx };
}

export function drawBackground(ctx) {
  // Main gradient background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, colors.bg);
  grad.addColorStop(1, '#060a12');
  ctx.fillStyle = grad;
  roundRect(ctx, 0, 0, width, height, cornerRadius);
  ctx.fill();

  // Subtle grid pattern
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Glow orbs (decorative)
  drawGlowOrb(ctx, 100, 80, 60, colors.primary, 0.04);
  drawGlowOrb(ctx, width - 120, height - 100, 80, colors.secondary, 0.03);
  drawGlowOrb(ctx, width / 2, height / 2, 100, colors.primary, 0.02);
}

function drawGlowOrb(ctx, x, y, radius, color, alpha) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, hexToRgba(color, alpha));
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

export function drawPanel(ctx, x, y, w, h, { title, glow, glowColor } = {}) {
  // Panel shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  roundRect(ctx, x + 2, y + 2, w, h, 8);
  ctx.fill();

  // Panel background
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, colors.panel);
  grad.addColorStop(1, hexToRgba(colors.panel, 0.85));
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  // Border
  ctx.strokeStyle = glow ? (glowColor || colors.primary) : colors.border;
  ctx.lineWidth = glow ? 1.5 : 1;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();

  // Glow effect on border
  if (glow) {
    ctx.shadowColor = glowColor || colors.primary;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = hexToRgba(glowColor || colors.primary, 0.5);
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Panel title
  if (title) {
    ctx.fillStyle = colors.textDim;
    ctx.font = `bold 11px 'Courier New', monospace`;
    ctx.fillText(title.toUpperCase(), x + 10, y + 8);
    // Underline
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 10, y + 24);
    ctx.lineTo(x + w - 10, y + 24);
    ctx.stroke();
  }
}

export function drawProgressBar(ctx, x, y, w, h, progress, color, bgColor) {
  // Background
  ctx.fillStyle = bgColor || 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();

  // Fill
  const fillWidth = Math.max(0, Math.min(1, progress)) * w;
  if (fillWidth > 2) {
    const grad = ctx.createLinearGradient(x, y, x + fillWidth, y);
    grad.addColorStop(0, color);
    grad.addColorStop(1, hexToRgba(color, 0.7));
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, fillWidth, h, h / 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, x, y, fillWidth, h / 2, h / 2);
    ctx.fill();
  }
}

export function drawStatLine(ctx, x, y, label, value, color) {
  ctx.font = `12px 'Courier New', monospace`;
  ctx.fillStyle = colors.textMuted;
  ctx.fillText(label, x, y);
  ctx.fillStyle = color || colors.text;
  ctx.font = `bold 13px 'Courier New', monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(value, x + 200, y);
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, text, x, y, size, color) {
  ctx.font = `bold ${size || 28}px 'Courier New', monospace`;
  // Glow
  ctx.shadowColor = color || colors.primary;
  ctx.shadowBlur = 12;
  ctx.fillStyle = color || colors.primary;
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

export function drawText(ctx, text, x, y, { size = 14, color = colors.text, bold = false, align = 'left', maxWidth } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px 'Courier New', monospace`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.textAlign = 'left';
}

export function drawIcon(ctx, emoji, x, y, size = 16) {
  ctx.font = `${size}px serif`;
  ctx.fillText(emoji, x, y);
}

export function drawButton(ctx, x, y, w, h, label, color, active = false) {
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  if (active) {
    grad.addColorStop(0, hexToRgba(color, 0.3));
    grad.addColorStop(1, hexToRgba(color, 0.15));
  } else {
    grad.addColorStop(0, colors.panelLight);
    grad.addColorStop(1, colors.panel);
  }
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();

  ctx.strokeStyle = active ? color : colors.border;
  ctx.lineWidth = active ? 1.5 : 1;
  roundRect(ctx, x, y, w, h, 6);
  ctx.stroke();

  ctx.fillStyle = active ? color : colors.textDim;
  ctx.font = `bold 11px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 - 5);
  ctx.textAlign = 'left';
}

export function drawDivider(ctx, x, y, w) {
  const grad = ctx.createLinearGradient(x, y, x + w, y);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(0.5, colors.border);
  grad.addColorStop(1, 'transparent');
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

// ─── Utilities ──────────────────────────────────

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

export function canvasToBuffer(canvas) {
  return canvas.toBuffer('image/png');
}
