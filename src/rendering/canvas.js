import { createCanvas } from '@napi-rs/canvas';
import { THEME, CANVAS, RARITIES, TABS } from '../core/config.js';
const C = THEME.colors, W = CANVAS.width, H = CANVAS.height;
export { C as colors };

// ── rgba memoization — eliminates thousands of repeated string builds per frame ──
const _rgba = new Map();
export function rgba(hex, a = 1) {
  const k = hex + a;
  let v = _rgba.get(k);
  if (!v) { v = `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`; _rgba.set(k, v); }
  return v;
}

export function create() {
  const canvas = createCanvas(W, H), ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top'; ctx.imageSmoothingEnabled = true;
  return { canvas, ctx };
}
export const toBuffer = canvas => canvas.toBuffer('image/png');

export function bg(ctx) {
  // Deep true black gradient — modern, sharp
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0c0c0e'); grad.addColorStop(.5, '#09090b'); grad.addColorStop(1, '#060608');
  ctx.fillStyle = grad; rr(ctx, 0, 0, W, H, 12); ctx.fill();
  // Crisp hairline grid — barely visible structure
  ctx.strokeStyle = 'rgba(255,255,255,.02)'; ctx.lineWidth = 1; ctx.beginPath();
  for (let x = 0; x < W; x += 48) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0; y < H; y += 48) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  // Subtle gold accent glow — wealth undertone
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 300);
  glow.addColorStop(0, rgba(C.accent, .012)); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
}

export function panel(ctx, x, y, w, h, opts = {}) {
  // Sharp panel — no drop shadow, just clean fill + border
  ctx.fillStyle = C.panel; rr(ctx, x, y, w, h, 6); ctx.fill();
  const accent = opts.gc || C.border;
  ctx.strokeStyle = opts.glow ? accent : C.border;
  ctx.lineWidth = opts.glow ? 1.5 : 1;
  rr(ctx, x, y, w, h, 6); ctx.stroke();
  if (opts.t) {
    ctx.fillStyle = C.textMuted; ctx.font = "bold 10px 'Courier New',monospace"; ctx.fillText(opts.t.toUpperCase(), x + 10, y + 8);
    ctx.strokeStyle = rgba(C.border, .4); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + 10, y + 22); ctx.lineTo(x + w - 10, y + 22); ctx.stroke();
  }
}

export function bar(ctx, x, y, w, h, pct, color) {
  const p = Math.max(0, Math.min(1, pct));
  ctx.fillStyle = 'rgba(0,0,0,.35)'; rr(ctx, x, y, w, h, h / 2); ctx.fill();
  const fw = p * w;
  if (fw > 2) {
    const g = ctx.createLinearGradient(x, y, x + fw, y); g.addColorStop(0, rgba(color, .9)); g.addColorStop(1, rgba(color, .6));
    ctx.fillStyle = g; rr(ctx, x, y, fw, h, h / 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.08)'; rr(ctx, x + 1, y, fw - 2, h * .45, h / 2); ctx.fill();
  }
}

export function txt(ctx, text, x, y, opts = {}) {
  ctx.font = `${opts.b ? 'bold ' : ''}${opts.s || 14}px 'Courier New',monospace`;
  ctx.fillStyle = opts.c || C.text;
  ctx.textAlign = opts.a || 'left';
  opts.mw ? ctx.fillText(text, x, y, opts.mw) : ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function title(ctx, s, x, y, sz, color) {
  ctx.font = `bold ${sz || 22}px 'Courier New',monospace`;
  ctx.shadowColor = color || C.primary; ctx.shadowBlur = 14; ctx.fillStyle = color || C.primary;
  ctx.fillText(s, x, y); ctx.shadowBlur = 0;
}

export function divider(ctx, x, y, w) {
  const g = ctx.createLinearGradient(x, y, x + w, y);
  g.addColorStop(0, 'transparent'); g.addColorStop(.3, rgba(C.border, .6)); g.addColorStop(.7, rgba(C.border, .6)); g.addColorStop(1, 'transparent');
  ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
}

export function btn(ctx, x, y, w, h, label, color, active) {
  ctx.fillStyle = active ? rgba(color, .15) : C.panelLight;
  rr(ctx, x, y, w, h, 4); ctx.fill();
  ctx.strokeStyle = active ? rgba(color, .6) : C.border;
  ctx.lineWidth = 1; rr(ctx, x, y, w, h, 4); ctx.stroke();
  ctx.fillStyle = active ? color : C.textDim;
  ctx.font = "bold 10px 'Courier New',monospace"; ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 - 4); ctx.textAlign = 'left';
}

export const rarityColor = r => RARITIES[r]?.color || C.text;
export const fmt = n => n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : n.toLocaleString();

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

// ── Layout ──
export function layout(player, tab, opts = {}) {
  const { canvas, ctx } = create(); bg(ctx);
  title(ctx, 'HALCYON', 20, 14, 22);
  if (opts.sub) txt(ctx, opts.sub, 132, 19, { s: 12, c: C.textMuted });
  let rx = 780;
  for (const s of (opts.stats || [{ l: '🪙', v: fmt(player.gold), c: C.gold }]).reverse()) {
    txt(ctx, `${s.l} ${s.v}`, rx, 16, { s: 13, b: true, c: s.c, a: 'right' }); rx -= 120;
  }
  divider(ctx, 20, 38, 760);
  panel(ctx, 20, 400, 760, 40);
  for (let i = 0; i < TABS.length; i++) btn(ctx, 28 + i * 123, 405, 118, 28, TABS[i], C.primary, TABS[i] === tab.toUpperCase());
  txt(ctx, `${THEME.name} — ${THEME.tagline}`, 20, 458, { s: 9, c: C.textMuted });
  return { canvas, ctx, bx: 20, by: 46 };
}

export function labelBar(ctx, x, y, w, label, cur, max, color) {
  txt(ctx, label, x, y, { s: 10, c: C.textMuted });
  txt(ctx, `${cur}/${max}`, x + w, y, { s: 10, c: color, a: 'right' });
  bar(ctx, x, y + 13, w, 7, cur / max, color);
}
