import { createCanvas } from '@napi-rs/canvas';
import { AVATARS, FRAME_TIERS } from '../../core/config.js';
import * as R from '../canvas.js';

const CARD_W = 350, CARD_H = 490;

function getFrame(networth) {
  let color = FRAME_TIERS[0].color, label = FRAME_TIERS[0].label;
  for (const tier of FRAME_TIERS) if (networth >= tier.min) { color = tier.color; label = tier.label; }
  return { color, label };
}

// ── Full-bleed avatar art cache ──
const _artCache = new Map();
function getAvatarArt(avatarId) {
  let cached = _artCache.get(avatarId);
  if (cached) return cached;
  const config = AVATARS[avatarId] || AVATARS.default;
  const art = createCanvas(CARD_W, CARD_H);
  const ctx = art.getContext('2d');
  ctx.fillStyle = config.bg; ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.globalAlpha = 0.2; ctx.fillStyle = config.accent;
  const W = CARD_W, H = CARD_H;
  const patterns = {
    diamond: () => { for (let y = 0; y < H; y += 30) for (let x = 0; x < W; x += 30) { ctx.save(); ctx.translate(x + 15, y + 15); ctx.rotate(Math.PI / 4); ctx.fillRect(-8, -8, 16, 16); ctx.restore(); } },
    grid: () => { for (let y = 0; y < H; y += 20) ctx.fillRect(0, y, W, 1); for (let x = 0; x < W; x += 20) ctx.fillRect(x, 0, 1, H); },
    bars: () => { for (let y = 0; y < H; y += 12) ctx.fillRect(0, y, W, 6); },
    cross: () => { for (let y = 0; y < H; y += 40) for (let x = 0; x < W; x += 40) { ctx.fillRect(x + 15, y, 10, 40); ctx.fillRect(x, y + 15, 40, 10); } },
    dots: () => { for (let y = 0; y < H; y += 24) for (let x = 0; x < W; x += 24) { ctx.beginPath(); ctx.arc(x + 12, y + 12, 5, 0, Math.PI * 2); ctx.fill(); } },
    flame: () => { for (let y = 0; y < H; y += 20) { const w = Math.sin(y * 0.1) * 20; ctx.fillRect(w + W / 2 - 30, y, 60, 10); } },
    wave: () => { for (let y = 0; y < H; y += 4) { const w = Math.sin(y * 0.05) * 40; ctx.fillRect(W / 2 + w - 20, y, 40, 2); } },
    stripe: () => { ctx.lineWidth = 4; ctx.strokeStyle = config.accent; for (let d = -H; d < W + H; d += 16) { ctx.beginPath(); ctx.moveTo(d, 0); ctx.lineTo(d - H, H); ctx.stroke(); } },
  };
  (patterns[config.pattern] || patterns.diamond)();
  ctx.globalAlpha = 1;
  const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
  glow.addColorStop(0, R.rgba(config.accent, 0.1)); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  _artCache.set(avatarId, art);
  return art;
}

export function drawCard(ctx, centerX, centerY, player) {
  const { color: frameColor } = getFrame(player.networth);
  const x = centerX - CARD_W / 2, y = centerY - CARD_H / 2;

  // Frame glow
  ctx.shadowColor = frameColor; ctx.shadowBlur = 20;
  ctx.strokeStyle = frameColor; ctx.lineWidth = 3;
  R.rr(ctx, x, y, CARD_W, CARD_H, 12); ctx.stroke();
  ctx.shadowBlur = 0;

  // Full-bleed art clipped to card
  ctx.save();
  R.rr(ctx, x, y, CARD_W, CARD_H, 12); ctx.clip();
  ctx.drawImage(getAvatarArt(player.avatar), x, y);

  // Top scrim for username
  const topScrim = ctx.createLinearGradient(x, y, x, y + 60);
  topScrim.addColorStop(0, 'rgba(0,0,0,.6)'); topScrim.addColorStop(1, 'transparent');
  ctx.fillStyle = topScrim; ctx.fillRect(x, y, CARD_W, 60);

  // Bottom scrim for networth
  const botScrim = ctx.createLinearGradient(x, y + CARD_H - 80, x, y + CARD_H);
  botScrim.addColorStop(0, 'transparent'); botScrim.addColorStop(1, 'rgba(0,0,0,.7)');
  ctx.fillStyle = botScrim; ctx.fillRect(x, y + CARD_H - 80, CARD_W, 80);

  ctx.restore();

  // Username — top center
  ctx.fillStyle = '#fafafa';
  ctx.font = "bold 22px 'Courier New',monospace";
  ctx.textAlign = 'center';
  ctx.fillText(player.username, centerX, y + 18);

  // Networth — bottom center
  ctx.fillStyle = frameColor;
  ctx.font = "bold 36px 'Courier New',monospace";
  ctx.fillText(R.fmt(player.networth), centerX, y + CARD_H - 46);
  ctx.textAlign = 'left';

  return { x, y, w: CARD_W, h: CARD_H, frameColor };
}

export function renderCard(player) {
  const canvas = createCanvas(CARD_W + 40, CARD_H + 40);
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.fillStyle = '#09090b'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawCard(ctx, canvas.width / 2, canvas.height / 2, player);
  return canvas.toBuffer('image/jpeg', 90);
}
