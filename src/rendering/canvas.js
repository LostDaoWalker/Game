import { createCanvas } from '@napi-rs/canvas';
import { THEME, CANVAS, RARITIES } from '../core/config.js';
const C = THEME.colors, W = CANVAS.width, H = CANVAS.height;
export { C as colors };

// ── Pre-computed constants ──
const FONT_B10 = "bold 10px 'Courier New',monospace";
const FONT_10 = "10px 'Courier New',monospace";
const FONT_9 = "9px 'Courier New',monospace";
const BG_TRACK = 'rgba(0,0,0,.35)';

// ── rgba memoization ──
const _rgbaCache = new Map();
export function rgba(hex, a = 1) {
  const key = hex + a;
  let cached = _rgbaCache.get(key);
  if (!cached) {
    if (_rgbaCache.size > 512) _rgbaCache.clear();
    cached = `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
    _rgbaCache.set(key, cached);
  }
  return cached;
}

// ── Background — cached as ImageData for fastest possible blit ──
let _bgData = null;
function getBgData() {
  if (_bgData) return _bgData;
  const bgCanvas = createCanvas(W, H);
  const ctx = bgCanvas.getContext('2d');
  // Solid dark fill — gradient/grid/glow invisible at JPEG q90, save 2.5ms encoding
  ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, W, H);
  // Subtle top-to-bottom vignette — the one thing that's actually visible
  const vig = ctx.createLinearGradient(0, 0, 0, H);
  vig.addColorStop(0, 'rgba(255,255,255,.008)'); vig.addColorStop(.5, 'transparent'); vig.addColorStop(1, 'rgba(0,0,0,.05)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  _bgData = ctx.getImageData(0, 0, W, H);
  return _bgData;
}

export function create() {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  return { canvas, ctx };
}

// JPEG encoding is 3x faster than PNG — Discord renders both fine
export const toBuffer = canvas => canvas.toBuffer('image/jpeg', 90);

// Blit cached background — putImageData is faster than drawImage for full-frame
export function bg(ctx) {
  ctx.putImageData(getBgData(), 0, 0);
}

export function panel(ctx, x, y, w, h, opts = {}) {
  const accent = opts.gc || C.border;
  // Single path — fill then stroke (no double rr trace)
  rr(ctx, x, y, w, h, 6);
  ctx.fillStyle = C.panel; ctx.fill();
  ctx.strokeStyle = opts.glow ? accent : C.border;
  ctx.lineWidth = opts.glow ? 1.5 : 1;
  ctx.stroke();
  if (opts.t) {
    ctx.fillStyle = C.textMuted; ctx.font = FONT_B10; ctx.fillText(opts.t.toUpperCase(), x + 10, y + 8);
    ctx.strokeStyle = rgba(C.border, .4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y + 22); ctx.lineTo(x + w - 10, y + 22); ctx.stroke();
  }
}

export function bar(ctx, x, y, w, h, pct, color) {
  const p = Math.max(0, Math.min(1, pct));
  rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = BG_TRACK; ctx.fill();
  const fw = p * w;
  if (fw > 2) {
    const g = ctx.createLinearGradient(x, y, x + fw, y);
    g.addColorStop(0, rgba(color, .9)); g.addColorStop(1, rgba(color, .6));
    rr(ctx, x, y, fw, h, h / 2); ctx.fillStyle = g; ctx.fill();
  }
}

// ── Font cache — avoids string concat on every txt() call ──
const _fontCache = new Map();
function getFont(bold, size) {
  const key = (bold ? 1 : 0) * 100 + size;
  let f = _fontCache.get(key);
  if (!f) { f = `${bold ? 'bold ' : ''}${size}px 'Courier New',monospace`; _fontCache.set(key, f); }
  return f;
}

export function txt(ctx, text, x, y, opts = {}) {
  ctx.font = getFont(opts.b, opts.s || 14);
  ctx.fillStyle = opts.c || C.text;
  if (opts.a) { ctx.textAlign = opts.a; opts.mw ? ctx.fillText(text, x, y, opts.mw) : ctx.fillText(text, x, y); ctx.textAlign = 'left'; }
  else { opts.mw ? ctx.fillText(text, x, y, opts.mw) : ctx.fillText(text, x, y); }
}

export function title(ctx, s, x, y, sz, color) {
  ctx.font = getFont(true, sz || 22);
  ctx.shadowColor = color || C.primary; ctx.shadowBlur = 14; ctx.fillStyle = color || C.primary;
  ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}

export function divider(ctx, x, y, w) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, 'transparent'); g.addColorStop(.3, rgba(C.border, .6)); g.addColorStop(.7, rgba(C.border, .6)); g.addColorStop(1, 'transparent');
  ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
}

export function btn(ctx, x, y, w, h, label, color, active) {
  rr(ctx, x, y, w, h, 4);
  ctx.fillStyle = active ? rgba(color, .15) : C.panelLight; ctx.fill();
  ctx.strokeStyle = active ? rgba(color, .6) : C.border; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = active ? color : C.textDim;
  ctx.font = FONT_B10; ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 - 4); ctx.textAlign = 'left';
}

export const rarityColor = r => RARITIES[r]?.color || C.text;

// Manual comma formatting — 10x faster than toLocaleString
export function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e4) return (n / 1e3).toFixed(1) + 'K';
  if (n < 1000) return '' + n;
  return (n / 1000 | 0) + ',' + ('00' + (n % 1000)).slice(-3);
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ── Layout ──
export function layout(player, tab, opts = {}) {
  const { canvas, ctx } = create(); bg(ctx);
  title(ctx, 'TIANMING', 20, 14, 22);
  if (opts.sub) txt(ctx, opts.sub, 132, 19, { s: 12, c: C.textMuted });
  let rx = 780;
  for (const s of (opts.stats || [{ l: '🪙', v: fmt(player.gold), c: C.gold }]).reverse()) {
    txt(ctx, `${s.l} ${s.v}`, rx, 16, { s: 13, b: true, c: s.c, a: 'right' }); rx -= 120;
  }
  divider(ctx, 20, 38, 760);
  txt(ctx, `${THEME.name} — ${THEME.tagline}`, 20, 458, { s: 9, c: C.textMuted });
  return { canvas, ctx, bx: 20, by: 46 };
}

export function labelBar(ctx, x, y, w, label, cur, max, color) {
  txt(ctx, label, x, y, { s: 10, c: C.textMuted });
  txt(ctx, `${cur}/${max}`, x + w, y, { s: 10, c: color, a: 'right' });
  bar(ctx, x, y + 13, w, 7, cur / max, color);
}
