// Motor de arte procedural. Cada wallpaper é pintado a partir da sua semente,
// em coordenadas relativas, então a miniatura e o arquivo em 4K têm a mesma composição.
import { mulberry32, pick } from './prng.js';

export const PHONE_ASPECT = 9 / 19.5;

const ORANGES = ['#ff4d12', '#ff6a1f', '#ff8a3d', '#ff9f5a', '#f2581c', '#ffb07a', '#ff7a2e'];
const WARM = ['#ff6a1f', '#ff8a3d', '#e8451a', '#ffc49a', '#ff9f5a'];

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function vgrad(ctx, y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

function fill(ctx, w, h, style) {
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, w, h);
}

let grainTile = null;
function grain(ctx, w, h, alpha) {
  if (!grainTile) {
    grainTile = document.createElement('canvas');
    grainTile.width = grainTile.height = 160;
    const g = grainTile.getContext('2d');
    const img = g.createImageData(160, 160);
    const r = mulberry32(42);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = r() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function vignette(ctx, w, h, strength) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  fill(ctx, w, h, g);
}

function glow(ctx, cx, cy, rx, ry, color, alpha) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.55, rgba(color, alpha * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Faixa de pinceladas com desfoque de movimento (a assinatura visual do app).
function streakBand(ctx, rng, cx, cy, bw, bh, colors, count, angle = 0, maxAlpha = 0.85) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.lineCap = 'butt';
  for (let i = 0; i < count; i++) {
    const t = (rng() + rng() + rng()) / 3 - 0.5;
    const y = t * bh * 1.6;
    const len = bw * (0.3 + rng() * 0.7);
    const x0 = -bw / 2 + rng() * (bw - len);
    const a = (0.2 + rng() * 0.8) * maxAlpha * (1 - Math.abs(t) * 1.2);
    if (a <= 0.01) continue;
    const c = colors[Math.floor(rng() * colors.length)];
    const g = ctx.createLinearGradient(x0, 0, x0 + len, 0);
    g.addColorStop(0, rgba(c, 0));
    g.addColorStop(0.1 + rng() * 0.25, rgba(c, a));
    g.addColorStop(0.6 + rng() * 0.25, rgba(c, a));
    g.addColorStop(1, rgba(c, 0));
    ctx.strokeStyle = g;
    ctx.lineWidth = Math.max(0.6, bh * (0.006 + rng() * 0.05));
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + len, y);
    ctx.stroke();
  }
  ctx.restore();
}

function paintedBand(ctx, rng, cx, cy, bw, bh, angle, colors = ORANGES) {
  glow(ctx, cx, cy, bw * 0.55, bh * 0.75, colors[0], 0.55);
  streakBand(ctx, rng, cx, cy, bw, bh, colors, 220, angle, 0.95);
  streakBand(ctx, rng, cx, cy, bw * 1.15, bh * 1.3, ['#ffffff', '#ffd2b0'], 40, angle, 0.35);
}

/* ---------- Retratos: rosto oculto por uma pincelada ---------- */
function portrait(ctx, w, h, rng) {
  const bg = pick(rng, [['#efeeec', '#d6d4d1'], ['#e4e2df', '#c9c6c2'], ['#ecebea', '#bdb9b5'], ['#e9e1d9', '#cdbfb2']]);
  fill(ctx, w, h, vgrad(ctx, 0, h, [[0, bg[0]], [1, bg[1]]]));
  const skin = pick(rng, ['#e8c4ad', '#d9a98c', '#c08a6a', '#8d5a3f', '#f1d0bc', '#a8724f']);
  const hair = pick(rng, ['#111111', '#1c1410', '#2a1d17', '#0b0b0b']);
  const cloth = pick(rng, ['#0d0d0d', '#141414', '#1d1a18', '#24201d']);
  const cx = w / 2 + (rng() - 0.5) * w * 0.06;
  const headY = h * (0.4 + rng() * 0.04);
  const R = w * (0.24 + rng() * 0.03);

  // Corpo / gola alta
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, h);
  ctx.bezierCurveTo(cx - w * 0.55, headY + R * 3.0, cx - w * 0.32, headY + R * 2.2, cx - R * 0.55, headY + R * 1.75);
  ctx.lineTo(cx + R * 0.55, headY + R * 1.75);
  ctx.bezierCurveTo(cx + w * 0.32, headY + R * 2.2, cx + w * 0.55, headY + R * 3.0, w * 1.1, h);
  ctx.closePath();
  ctx.fill();

  // Cabelo (parte de trás do corte chanel)
  const hairBottom = headY + R * (1.05 + rng() * 0.25);
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.ellipse(cx, headY - R * 0.12, R * 1.12, R * 1.08, 0, Math.PI, 0);
  ctx.lineTo(cx + R * 1.14, hairBottom);
  ctx.quadraticCurveTo(cx, hairBottom + R * 0.08, cx - R * 1.14, hairBottom);
  ctx.closePath();
  ctx.fill();

  // Pescoço e gola
  ctx.fillStyle = vgrad(ctx, headY + R * 0.6, headY + R * 1.7, [[0, skin], [1, rgba('#000000', 0.35)]]);
  ctx.fillRect(cx - R * 0.33, headY + R * 0.6, R * 0.66, R * 1.1);
  ctx.fillStyle = skin;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(cx - R * 0.33, headY + R * 0.6, R * 0.66, R * 0.7);
  ctx.globalAlpha = 1;
  ctx.fillStyle = cloth;
  ctx.beginPath();
  ctx.roundRect(cx - R * 0.48, headY + R * 1.35, R * 0.96, R * 0.55, R * 0.12);
  ctx.fill();

  // Rosto
  const fg = ctx.createRadialGradient(cx - R * 0.2, headY - R * 0.2, R * 0.1, cx, headY, R * 1.1);
  fg.addColorStop(0, skin);
  fg.addColorStop(1, rgba('#3a2418', 0.0));
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(cx, headY + R * 0.05, R * 0.8, R * 1.02, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba('#3a2418', 0.12);
  ctx.beginPath();
  ctx.ellipse(cx + R * 0.35, headY + R * 0.15, R * 0.45, R * 0.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Franja reta
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, headY - R * 0.12, R * 1.12, R * 1.08, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = hair;
  ctx.fillRect(cx - R * 1.2, headY - R * 1.4, R * 2.4, R * (1.4 - 0.28));
  ctx.restore();
  // Laterais do cabelo por cima do rosto
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.moveTo(cx - R * 1.14, headY - R * 0.3);
  ctx.lineTo(cx - R * 0.72, headY - R * 0.3);
  ctx.quadraticCurveTo(cx - R * 0.78, headY + R * 0.6, cx - R * 0.6, hairBottom);
  ctx.lineTo(cx - R * 1.14, hairBottom);
  ctx.closePath();
  ctx.moveTo(cx + R * 1.14, headY - R * 0.3);
  ctx.lineTo(cx + R * 0.72, headY - R * 0.3);
  ctx.quadraticCurveTo(cx + R * 0.78, headY + R * 0.6, cx + R * 0.6, hairBottom);
  ctx.lineTo(cx + R * 1.14, hairBottom);
  ctx.closePath();
  ctx.fill();

  // Lábios
  const lipY = headY + R * 0.62;
  ctx.fillStyle = pick(rng, ['#b8322b', '#a3241f', '#c0473a', '#8f2a25']);
  ctx.beginPath();
  ctx.ellipse(cx, lipY, R * 0.2, R * 0.075, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = rgba('#000000', 0.25);
  ctx.fillRect(cx - R * 0.19, lipY - R * 0.005, R * 0.38, R * 0.012);

  // A pincelada que esconde o olhar
  const angle = (rng() - 0.5) * 0.12;
  paintedBand(ctx, rng, cx, headY - R * 0.05, w * 1.05, R * 1.05, angle);
  grain(ctx, w, h, 0.18);
}

/* ---------- Natureza: praias ao pôr do sol ---------- */
function palm(ctx, rng, x, y, height, lean, color, s) {
  const topX = x + lean * height;
  const topY = y - height;
  const cx = x + lean * height * 0.2;
  const cy = y - height * 0.55;
  const steps = 24;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = 0; i < steps; i++) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const p = (t) => [(1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * topX, (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * topY];
    const [ax, ay] = p(t0);
    const [bx, by] = p(t1);
    ctx.lineWidth = s * (16 - t0 * 9);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  const fronds = 7 + Math.floor(rng() * 3);
  for (let f = 0; f < fronds; f++) {
    const ang = -Math.PI + (f / (fronds - 1)) * Math.PI + (rng() - 0.5) * 0.4;
    const L = height * (0.3 + rng() * 0.16);
    const ex = topX + Math.cos(ang) * L;
    const ey = topY + Math.sin(ang) * L * 0.5 + L * 0.45;
    const mx = topX + Math.cos(ang) * L * 0.5;
    const my = topY + Math.sin(ang) * L * 0.55 - L * 0.08;
    ctx.lineWidth = s * 6;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.stroke();
    for (let k = 1; k < 16; k++) {
      const t = k / 16;
      const px = (1 - t) ** 2 * topX + 2 * (1 - t) * t * mx + t * t * ex;
      const py = (1 - t) ** 2 * topY + 2 * (1 - t) * t * my + t * t * ey;
      const leaf = L * 0.3 * (1 - t * 0.6);
      ctx.lineWidth = s * 4.5 * (1 - t * 0.5);
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(ang + side * 1.2) * leaf * 0.5, py + leaf * 0.85);
        ctx.stroke();
      }
    }
  }
}

function boat(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - size * 0.5, y - size * 0.1);
  ctx.quadraticCurveTo(x, y + size * 0.12, x + size * 0.55, y - size * 0.16);
  ctx.lineTo(x + size * 0.42, y + size * 0.03);
  ctx.quadraticCurveTo(x, y + size * 0.14, x - size * 0.38, y + size * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(x - size * 0.22, y - size * 0.24, size * 0.36, size * 0.13);
  ctx.fillRect(x - size * 0.25, y - size * 0.27, size * 0.44, size * 0.03);
  ctx.fillRect(x + size * 0.02, y - size * 0.5, size * 0.012, size * 0.26);
  ctx.globalAlpha = 0.25;
  ctx.fillRect(x - size * 0.4, y + size * 0.08, size * 0.85, size * 0.04);
  ctx.globalAlpha = 1;
}

function nature(ctx, w, h, rng) {
  const v = Math.floor(rng() * 3);
  const s = w / 1000;
  const horizon = h * (0.58 + rng() * 0.1);
  const skies = [
    [[0, '#d5d3d0'], [0.7, '#e9e6e3'], [1, '#efe6df']],
    [[0, '#2a130b'], [0.45, '#a8381a'], [1, '#ff7a2e']],
    [[0, '#171925'], [0.5, '#5d3236'], [1, '#ff8a3d']],
  ];
  const seas = [
    [[0, '#c9c4bf'], [1, '#86817c']],
    [[0, '#e2581f'], [1, '#22100a']],
    [[0, '#a2502e'], [1, '#0f0a0d']],
  ];
  fill(ctx, w, h, vgrad(ctx, 0, horizon, skies[v]));
  ctx.fillStyle = vgrad(ctx, horizon, h, seas[v]);
  ctx.fillRect(0, horizon, w, h - horizon);

  const sunY = horizon - h * (0.06 + rng() * 0.12);
  paintedBand(ctx, rng, w * (0.4 + rng() * 0.2), sunY, w * 1.25, h * 0.1, (rng() - 0.5) * 0.05, v === 0 ? ORANGES : WARM);
  streakBand(ctx, rng, w / 2, horizon + (h - horizon) * 0.25, w * 1.3, (h - horizon) * 0.35, v === 0 ? ['#ff8a3d', '#ffffff', '#9a948f'] : WARM, 120, 0, 0.45);

  const ink = v === 0 ? '#1a1a1a' : '#120a07';
  if (rng() < 0.5) {
    const left = rng() < 0.5;
    ctx.fillStyle = ink;
    ctx.beginPath();
    const x0 = left ? -w * 0.05 : w * 0.55;
    const x1 = left ? w * 0.45 : w * 1.05;
    ctx.moveTo(x0, horizon + h * 0.01);
    ctx.bezierCurveTo(x0 + (x1 - x0) * 0.2, horizon - h * 0.05, x0 + (x1 - x0) * 0.7, horizon - h * 0.035, x1, horizon + h * 0.01);
    ctx.closePath();
    ctx.fill();
  }
  const palms = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < palms; i++) {
    const fromLeft = rng() < 0.6;
    const x = fromLeft ? w * (0.02 + rng() * 0.25) : w * (0.75 + rng() * 0.2);
    palm(ctx, rng, x, h * (0.98 + rng() * 0.05), h * (0.32 + rng() * 0.2), (fromLeft ? 1 : -1) * (0.15 + rng() * 0.35), ink, s);
  }
  boat(ctx, w * (0.35 + rng() * 0.35), horizon + (h - horizon) * (0.22 + rng() * 0.25), w * (0.14 + rng() * 0.08), ink);
  grain(ctx, w, h, 0.14);
}

/* ---------- Arquitetura 3D ---------- */
function isoCity(ctx, w, h, rng) {
  fill(ctx, w, h, vgrad(ctx, 0, h, [[0, '#f1ebe5'], [0.6, '#e5d8cc'], [1, '#d6c4b4']]));
  glow(ctx, w * (0.3 + rng() * 0.4), h * 0.16, w * 0.5, w * 0.5, '#ff7a2e', 0.55);
  const n = 6;
  const t = w / 8.6;
  const ox = w / 2;
  const oy = h * 0.34;
  const P = (i, j, z) => [ox + (i - j) * t * 0.866, oy + (i + j) * t * 0.5 - z * t];
  const heights = [];
  for (let i = 0; i < n; i++) {
    heights[i] = [];
    for (let j = 0; j < n; j++) {
      const d = Math.hypot(i - n / 2 + 0.5, j - n / 2 + 0.5);
      heights[i][j] = Math.max(0.2, (3.6 - d) * (0.5 + rng())) ;
    }
  }
  for (let sum = 0; sum <= 2 * (n - 1); sum++) {
    for (let i = 0; i < n; i++) {
      const j = sum - i;
      if (j < 0 || j >= n) continue;
      const z = heights[i][j];
      const accent = rng() < 0.18;
      const top = accent ? '#ffa262' : '#f8f3ee';
      const left = accent ? '#ff6a1f' : '#dacdc1';
      const right = accent ? '#d4470f' : '#b9a796';
      const a = P(i, j, z), b = P(i + 1, j, z), c = P(i + 1, j + 1, z), d = P(i, j + 1, z);
      const c0 = P(i + 1, j + 1, 0), b0 = P(i + 1, j, 0), d0 = P(i, j + 1, 0);
      const poly = (pts, color) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        ctx.fill();
      };
      poly([d, c, c0, d0], left);
      poly([b, c, c0, b0], right);
      poly([a, b, c, d], top);
    }
  }
  streakBand(ctx, rng, w / 2, h * 0.86, w * 1.2, h * 0.06, ['#ff8a3d', '#ffb07a'], 80, 0, 0.5);
}

function archCorridor(ctx, w, h, rng) {
  const vx = w / 2 + (rng() - 0.5) * w * 0.1;
  const vy = h * (0.42 + rng() * 0.08);
  fill(ctx, w, h, '#1a120e');
  const k = 12;
  const front = pick(rng, ['#2a1c15', '#3a2a22', '#e9e1d9']);
  const back = '#ff7a2e';
  const mix = (a, b, t) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (sh) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  };
  for (let i = 0; i < k; i++) {
    const f = Math.pow(0.8, i);
    const aw = w * 0.92 * f;
    const ah = h * 0.8 * f;
    const x = vx - aw / 2 + (w / 2 - vx) * f;
    const yb = vy + (h * 1.02 - vy) * f;
    const top = yb - ah;
    ctx.fillStyle = i % 2 ? mix(front, back, i / k) : mix(front, '#000000', 0.25 * (1 - i / k));
    ctx.beginPath();
    ctx.moveTo(x, yb);
    ctx.lineTo(x, top + aw / 2);
    ctx.arc(x + aw / 2, top + aw / 2, aw / 2, Math.PI, 0);
    ctx.lineTo(x + aw, yb);
    ctx.closePath();
    ctx.fill();
  }
  glow(ctx, vx, vy + h * 0.05, w * 0.25, h * 0.12, '#ffb07a', 0.8);
  ctx.strokeStyle = 'rgba(255,140,70,0.18)';
  ctx.lineWidth = Math.max(1, w * 0.002);
  for (let i = 0; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo((i / 8) * w * 1.6 - w * 0.3, h);
    ctx.lineTo(vx, vy + h * 0.1);
    ctx.stroke();
  }
}

function monolith(ctx, w, h, rng) {
  const horizon = h * (0.62 + rng() * 0.08);
  fill(ctx, w, h, vgrad(ctx, 0, horizon, [[0, '#f0ece8'], [0.6, '#f3d6c0'], [1, '#ff9a5a']]));
  ctx.fillStyle = vgrad(ctx, horizon, h, [[0, '#d9c8ba'], [1, '#a8917e']]);
  ctx.fillRect(0, horizon, w, h - horizon);
  paintedBand(ctx, rng, w * 0.5, horizon - h * 0.05, w * 1.3, h * 0.05, 0);
  const cx = w * (0.4 + rng() * 0.2);
  const bw = w * (0.18 + rng() * 0.1);
  const bh = h * (0.35 + rng() * 0.15);
  const depth = bw * 0.45;
  const base = horizon + h * 0.08;
  ctx.fillStyle = 'rgba(60,35,20,0.35)';
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2, base);
  ctx.lineTo(cx + bw / 2 + depth, base - depth * 0.4);
  ctx.lineTo(w * 1.2, h * 1.05);
  ctx.lineTo(cx - bw / 2 + w * 0.2, h * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b201b';
  ctx.fillRect(cx - bw / 2, base - bh, bw, bh);
  ctx.fillStyle = '#ff6a1f';
  ctx.beginPath();
  ctx.moveTo(cx + bw / 2, base - bh);
  ctx.lineTo(cx + bw / 2 + depth, base - bh - depth * 0.4);
  ctx.lineTo(cx + bw / 2 + depth, base - depth * 0.4);
  ctx.lineTo(cx + bw / 2, base);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#4a3529';
  ctx.beginPath();
  ctx.moveTo(cx - bw / 2, base - bh);
  ctx.lineTo(cx - bw / 2 + depth, base - bh - depth * 0.4);
  ctx.lineTo(cx + bw / 2 + depth, base - bh - depth * 0.4);
  ctx.lineTo(cx + bw / 2, base - bh);
  ctx.closePath();
  ctx.fill();
}

function architecture(ctx, w, h, rng) {
  const v = Math.floor(rng() * 3);
  [isoCity, archCorridor, monolith][v](ctx, w, h, rng);
  grain(ctx, w, h, 0.12);
}

/* ---------- Cinema ---------- */
function figure(ctx, x, y, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.9, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.14, y - size * 0.78);
  ctx.lineTo(x + size * 0.14, y - size * 0.78);
  ctx.lineTo(x + size * 0.18, y - size * 0.32);
  ctx.lineTo(x + size * 0.08, y);
  ctx.lineTo(x - size * 0.08, y);
  ctx.lineTo(x - size * 0.18, y - size * 0.32);
  ctx.closePath();
  ctx.fill();
}

function cinematic(ctx, w, h, rng) {
  const v = Math.floor(rng() * 3);
  const horizon = h * (0.55 + rng() * 0.1);
  if (v === 0) {
    fill(ctx, w, h, vgrad(ctx, 0, h, [[0, '#120d0c'], [0.45, '#5b2414'], [0.62, '#ff7a2e'], [0.66, '#2b1610'], [1, '#0b0807']]));
    paintedBand(ctx, rng, w / 2, horizon - h * 0.02, w * 1.4, h * 0.06, 0, WARM);
    figure(ctx, w * (0.3 + rng() * 0.4), horizon + h * 0.12, h * 0.12, '#070505');
  } else if (v === 1) {
    fill(ctx, w, h, vgrad(ctx, 0, h, [[0, '#0e1018'], [0.5, '#3c2230'], [0.7, '#ff8a3d'], [1, '#120c0a']]));
    paintedBand(ctx, rng, w / 2, horizon - h * 0.08, w * 1.3, h * 0.08, (rng() - 0.5) * 0.04, WARM);
    let x = -w * 0.05;
    while (x < w * 1.05) {
      const bw = w * (0.05 + rng() * 0.09);
      const bh = h * (0.06 + rng() * 0.22);
      ctx.fillStyle = '#0a0809';
      ctx.fillRect(x, horizon - bh, bw + 1, bh + h);
      for (let r = 0; r < 14; r++) {
        if (rng() < 0.3) {
          ctx.fillStyle = rgba(pick(rng, ['#ffb07a', '#ff8a3d', '#ffe1c4']), 0.75);
          ctx.fillRect(x + rng() * bw * 0.8, horizon - bh + rng() * bh * 0.9, w * 0.006, h * 0.003);
        }
      }
      x += bw;
    }
    ctx.fillStyle = '#0a0809';
    ctx.fillRect(0, horizon, w, h);
    streakBand(ctx, rng, w / 2, horizon + h * 0.08, w * 1.2, h * 0.08, WARM, 90, 0, 0.35);
  } else {
    fill(ctx, w, h, vgrad(ctx, 0, horizon, [[0, '#d9d2cc'], [1, '#ffb487']]));
    ctx.fillStyle = vgrad(ctx, horizon, h, [[0, '#4a3a33'], [1, '#141010']]);
    ctx.fillRect(0, horizon, w, h - horizon);
    paintedBand(ctx, rng, w / 2, horizon - h * 0.03, w * 1.3, h * 0.05, 0);
    ctx.fillStyle = '#1e1715';
    ctx.beginPath();
    ctx.moveTo(w / 2 - w * 0.01, horizon);
    ctx.lineTo(w / 2 + w * 0.01, horizon);
    ctx.lineTo(w * 0.95, h);
    ctx.lineTo(w * 0.05, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,160,0.7)';
    ctx.lineWidth = Math.max(1, w * 0.006);
    ctx.setLineDash([h * 0.02, h * 0.025]);
    ctx.beginPath();
    ctx.moveTo(w / 2, horizon);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  vignette(ctx, w, h, 0.55);
  const bar = h * 0.085;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, bar);
  ctx.fillRect(0, h - bar, w, bar);
  grain(ctx, w, h, 0.2);
}

/* ---------- Abstrato ---------- */
function abstract(ctx, w, h, rng) {
  const v = Math.floor(rng() * 3);
  if (v === 0) {
    fill(ctx, w, h, vgrad(ctx, 0, h, [[0, '#f0efed'], [1, '#d3d0cc']]));
  } else if (v === 1) {
    fill(ctx, w, h, vgrad(ctx, 0, h, [[0, '#111'], [1, '#050505']]));
  } else {
    fill(ctx, w, h, '#e9ddd2');
    for (let i = 0; i < 5; i++) {
      glow(ctx, rng() * w, rng() * h, w * (0.4 + rng() * 0.5), w * (0.4 + rng() * 0.5), pick(rng, ['#ff6a1f', '#ffb07a', '#c9c3bd', '#ff8a3d', '#f2581c']), 0.7);
    }
  }
  const bands = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < bands; i++) {
    const y = h * (0.2 + rng() * 0.6);
    paintedBand(ctx, rng, w * (0.35 + rng() * 0.3), y, w * (1 + rng() * 0.5), h * (0.06 + rng() * 0.1), (rng() - 0.5) * 0.5, v === 1 ? WARM : ORANGES);
  }
  grain(ctx, w, h, v === 1 ? 0.22 : 0.15);
}

const PAINTERS = { portraits: portrait, nature, architecture, cinematic, abstract };

export function paintWallpaper(ctx, w, h, item) {
  const rng = mulberry32(item.seed);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  (PAINTERS[item.category] || abstract)(ctx, w, h, rng);
  ctx.restore();
}

export function renderToCanvas(item, w, h, canvas = document.createElement('canvas')) {
  canvas.width = Math.round(w);
  canvas.height = Math.round(h);
  paintWallpaper(canvas.getContext('2d'), canvas.width, canvas.height, item);
  return canvas;
}
