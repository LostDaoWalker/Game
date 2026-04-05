import { createCanvas } from '@napi-rs/canvas';
import { AVATARS, FRAME_TIERS } from '../../core/config.js';
import * as R from '../canvas.js';
const C = R.colors;

// Trading card dimensions: 5:7 ratio
const CARD_W = 350, CARD_H = 490;

function getFrame(networth) {
  let color = FRAME_TIERS[0].color, label = FRAME_TIERS[0].label;
  for (const tier of FRAME_TIERS) if (networth >= tier.min) { color = tier.color; label = tier.label; }
  return { color, label };
}

// ── Pre-rendered avatar art cache — patterns are static, render once ──
const ART_W = 310, ART_H = 260;
const _artCache = new Map();

function getAvatarArt(avatarId) {
  let cached = _artCache.get(avatarId);
  if (cached) return cached;
  const config = AVATARS[avatarId] || AVATARS.default;
  const art = createCanvas(ART_W, ART_H);
  const ctx = art.getContext('2d');
  ctx.fillStyle = config.bg;
  ctx.fillRect(0, 0, ART_W, ART_H);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = config.accent;
  const patterns = {
    diamond: () => { for (let y = 0; y < ART_H; y += 30) for (let x = 0; x < ART_W; x += 30) { ctx.save(); ctx.translate(x + 15, y + 15); ctx.rotate(Math.PI / 4); ctx.fillRect(-8, -8, 16, 16); ctx.restore(); } },
    grid: () => { for (let y = 0; y < ART_H; y += 20) ctx.fillRect(0, y, ART_W, 1); for (let x = 0; x < ART_W; x += 20) ctx.fillRect(x, 0, 1, ART_H); },
    bars: () => { for (let y = 0; y < ART_H; y += 12) ctx.fillRect(0, y, ART_W, 6); },
    cross: () => { for (let y = 0; y < ART_H; y += 40) for (let x = 0; x < ART_W; x += 40) { ctx.fillRect(x + 15, y, 10, 40); ctx.fillRect(x, y + 15, 40, 10); } },
    dots: () => { for (let y = 0; y < ART_H; y += 24) for (let x = 0; x < ART_W; x += 24) { ctx.beginPath(); ctx.arc(x + 12, y + 12, 5, 0, Math.PI * 2); ctx.fill(); } },
    flame: () => { for (let y = 0; y < ART_H; y += 20) { const w = Math.sin(y * 0.1) * 20; ctx.fillRect(w + ART_W / 2 - 30, y, 60, 10); } },
    wave: () => { for (let y = 0; y < ART_H; y += 4) { const w = Math.sin(y * 0.05) * 40; ctx.fillRect(ART_W / 2 + w - 20, y, 40, 2); } },
    stripe: () => { ctx.lineWidth = 4; ctx.strokeStyle = config.accent; for (let d = -ART_H; d < ART_W + ART_H; d += 16) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - ART_H, ART_H); ctx.stroke(); } },
  };
  (patterns[config.pattern] || patterns.diamond)();
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(ART_W / 2, ART_H / 2, 0, ART_W / 2, ART_H / 2, ART_W * 0.6);
  glow.addColorStop(0, R.rgba(config.accent, 0.08)); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, ART_W, ART_H);
  _artCache.set(avatarId, art);
  return art;
}

// Render just the card (reusable)
export function drawCard(ctx, centerX, centerY, player) {
  const { color: frameColor, label: frameLabel } = getFrame(player.networth);
  const x = centerX - CARD_W / 2, y = centerY - CARD_H / 2;

  // Outer frame glow
  ctx.shadowColor = frameColor;
  ctx.shadowBlur = 20;
  ctx.strokeStyle = frameColor;
  ctx.lineWidth = 3;
  R.rr(ctx, x, y, CARD_W, CARD_H, 12);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Card background
  ctx.fillStyle = '#0e0e11';
  R.rr(ctx, x, y, CARD_W, CARD_H, 12);
  ctx.fill();

  // Inner border
  ctx.strokeStyle = R.rgba(frameColor, 0.4);
  ctx.lineWidth = 1;
  R.rr(ctx, x + 6, y + 6, CARD_W - 12, CARD_H - 12, 8);
  ctx.stroke();

  // ── Username (top center) ──
  ctx.fillStyle = '#fafafa';
  ctx.font = "bold 20px 'Courier New',monospace";
  ctx.textAlign = 'center';
  ctx.fillText(player.username, centerX, y + 28);

  // Level + frame label
  ctx.font = "12px 'Courier New',monospace";
  ctx.fillStyle = frameColor;
  ctx.fillText(`Lv.${player.level} — ${frameLabel}`, centerX, y + 48);
  ctx.textAlign = 'left';

  // ── Avatar art area — blitted from cache ──
  const artX = x + 20, artY = y + 62, artW = CARD_W - 40, artH = 260;
  ctx.drawImage(getAvatarArt(player.avatar), artX, artY);
  // Art border
  ctx.strokeStyle = R.rgba(frameColor, 0.3);
  ctx.lineWidth = 1;
  ctx.strokeRect(artX, artY, artW, artH);

  // ── Stats bar (below art) ──
  const statsY = artY + artH + 14;
  ctx.fillStyle = C.textDim;
  ctx.font = "11px 'Courier New',monospace";
  ctx.textAlign = 'center';
  ctx.fillText(`⚔${player.attack}  🛡${player.defense}  💪${player.strength}  ⚡${player.speed}`, centerX, statsY);

  // Win record
  ctx.fillStyle = C.textMuted;
  ctx.font = "10px 'Courier New',monospace";
  ctx.fillText(`${player.wins}W / ${player.losses}L  |  ${player.win_streak} streak`, centerX, statsY + 16);
  ctx.textAlign = 'left';

  // ── Networth (bottom, prominent) ──
  const nwY = y + CARD_H - 70;

  // Networth background bar
  ctx.fillStyle = R.rgba(frameColor, 0.08);
  R.rr(ctx, x + 14, nwY - 4, CARD_W - 28, 46, 6);
  ctx.fill();

  // Networth number
  ctx.fillStyle = frameColor;
  ctx.font = "bold 32px 'Courier New',monospace";
  ctx.textAlign = 'center';
  ctx.fillText(R.fmt(player.networth), centerX, nwY + 4);

  // Label
  ctx.fillStyle = C.textMuted;
  ctx.font = "10px 'Courier New',monospace";
  ctx.fillText('NETWORTH', centerX, nwY + 32);
  ctx.textAlign = 'left';

  return { x, y, w: CARD_W, h: CARD_H, frameColor };
}

// Full card as standalone image (for profile, etc)
export function renderCard(player) {
  const canvas = createCanvas(CARD_W + 40, CARD_H + 40);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';

  // Dark background
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCard(ctx, canvas.width / 2, canvas.height / 2, player);
  return canvas.toBuffer('image/jpeg', 90);
}
