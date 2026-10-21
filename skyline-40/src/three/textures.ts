import { CanvasTexture, DataTexture, LinearFilter, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace, UnsignedByteType } from 'three';

let waterNormal: DataTexture | null = null;

/** Mapa normal de ondulações, contínuo nas bordas (gerado uma vez, sem download). */
export function getWaterNormal(): DataTexture {
  if (waterNormal) return waterNormal;
  const S = 256;
  const h = new Float32Array(S * S);
  const waves = [
    [3, 2, 0.6, 0.3], [5, -4, 0.35, 1.7], [-7, 6, 0.22, 2.9], [11, 3, 0.12, 0.8], [-4, -9, 0.18, 4.1], [13, -12, 0.07, 5.3],
  ];
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = (x / S) * Math.PI * 2;
      const v = (y / S) * Math.PI * 2;
      let sum = 0;
      for (const [fx, fy, a, p] of waves) sum += a * Math.sin(fx * u + fy * v + p);
      h[y * S + x] = sum;
    }
  }
  const data = new Uint8Array(S * S * 4);
  const k = 2.2;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const l = h[y * S + ((x - 1 + S) % S)];
      const r = h[y * S + ((x + 1) % S)];
      const d = h[((y - 1 + S) % S) * S + x];
      const u = h[((y + 1) % S) * S + x];
      let nx = (l - r) * k;
      let ny = (d - u) * k;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * S + x) * 4;
      data[i] = (nx * 0.5 + 0.5) * 255;
      data[i + 1] = (ny * 0.5 + 0.5) * 255;
      data[i + 2] = (nz * 0.5 + 0.5) * 255;
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, S, S, RGBAFormat, UnsignedByteType);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  waterNormal = tex;
  return tex;
}

const cache = new Map<string, CanvasTexture>();

function canvasTexture(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** Réguas de madeira do deck. */
export function getDeckTexture() {
  return canvasTexture('deck', 512, (ctx, s) => {
    const rows = 8;
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const shade = 150 + Math.round(Math.sin(r * 12.9898) * 18);
      ctx.fillStyle = `rgb(${shade}, ${Math.round(shade * 0.76)}, ${Math.round(shade * 0.56)})`;
      ctx.fillRect(0, r * rh, s, rh);
      // veios
      ctx.globalAlpha = 0.12;
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 ? '#3d2a1a' : '#f3dcc0';
        ctx.fillRect(0, r * rh + Math.random() * rh, s, 1);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(30,20,12,0.65)';
      ctx.fillRect(0, r * rh, s, 2);
      const cut = ((r * 197) % 7) / 7;
      ctx.fillRect(cut * s, r * rh, 2, rh);
    }
  });
}

/** Pastilhas da piscina. */
export function getTileTexture() {
  return canvasTexture('tile', 256, (ctx, s) => {
    ctx.fillStyle = '#8fd0e2';
    ctx.fillRect(0, 0, s, s);
    const n = 16;
    const t = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 200 + Math.round(Math.random() * 40);
        ctx.fillStyle = `rgb(${Math.round(v * 0.55)}, ${Math.round(v * 0.86)}, ${v})`;
        ctx.fillRect(x * t + 1, y * t + 1, t - 2, t - 2);
      }
    }
  });
}

/** Piso em placas de concreto/pedra. */
export function getPavingTexture() {
  return canvasTexture('paving', 256, (ctx, s) => {
    ctx.fillStyle = '#b9b6ae';
    ctx.fillRect(0, 0, s, s);
    const n = 4;
    const t = s / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const v = 172 + Math.round(Math.random() * 22);
        ctx.fillStyle = `rgb(${v}, ${v - 3}, ${v - 9})`;
        ctx.fillRect(x * t + 1.5, y * t + 1.5, t - 3, t - 3);
      }
    }
  });
}

/** Concreto polido da garagem. */
export function getConcreteFloorTexture() {
  return canvasTexture('garage-floor', 256, (ctx, s) => {
    ctx.fillStyle = '#6f7479';
    ctx.fillRect(0, 0, s, s);
    const img = ctx.getImageData(0, 0, s, s);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 16;
      img.data[i] += n;
      img.data[i + 1] += n;
      img.data[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = 'rgba(60,62,66,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, s, s);
  });
}

export function disposeTextures() {
  cache.forEach((t) => t.dispose());
  cache.clear();
  waterNormal?.dispose();
  waterNormal = null;
}

/* ---------- materiais realistas (texturas procedurais, mapeadas em metros) ---------- */

function valueNoise(seed: number) {
  const perm = new Uint8Array(512);
  let s = seed;
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const rnd = (x: number, y: number) => perm[(perm[x & 255] + (y & 255)) & 511] / 255;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  // ruído periódico (período p) para a textura repetir sem emendas
  return (x: number, y: number, p: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const fx = smooth(x - xi);
    const fy = smooth(y - yi);
    const m = (v: number) => ((v % p) + p) % p;
    const a = rnd(m(xi), m(yi));
    const b = rnd(m(xi + 1), m(yi));
    const c = rnd(m(xi), m(yi + 1));
    const d = rnd(m(xi + 1), m(yi + 1));
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
}

function fbm(n: ReturnType<typeof valueNoise>, x: number, y: number, p: number, oct = 4) {
  let v = 0;
  let amp = 0.5;
  let f = 1;
  for (let o = 0; o < oct; o++) {
    v += amp * n(x * f, y * f, p * f);
    amp *= 0.5;
    f *= 2;
  }
  return v;
}

function pixelTexture(key: string, w: number, h: number, fn: (x: number, y: number) => [number, number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * w + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(c);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** Madeira cumaru/freijó com veios verticais (ripados, brises e forros). Um ladrilho = 1 × 2 m. */
export function getWoodTexture() {
  const n = valueNoise(11);
  return pixelTexture('wood-real', 256, 512, (x, y) => {
    const u = x / 256;
    const v = y / 512;
    const plank = Math.floor(u * 4);
    const tone = 0.85 + n(plank * 3.1, 0.5, 64) * 0.3;
    const grain = fbm(n, u * 40 + plank * 7, v * 3, 40 * 1, 4);
    const ring = Math.sin((u * 60 + grain * 6) * Math.PI) * 0.5 + 0.5;
    const k = tone * (0.78 + grain * 0.35 + ring * 0.08);
    const gap = (u * 4) % 1 < 0.025 ? 0.45 : 1;
    return [150 * k * gap, 96 * k * gap, 58 * k * gap];
  });
}

/** Travertino bege com veios horizontais. Um ladrilho = 2 × 2 m. */
export function getStoneTexture() {
  const n = valueNoise(23);
  return pixelTexture('travertine', 512, 512, (x, y) => {
    const u = x / 512;
    const v = y / 512;
    const base = fbm(n, u * 6, v * 6, 6, 5);
    const vein = Math.abs(Math.sin((v * 18 + fbm(n, u * 3, v * 3, 3, 3) * 2.4) * Math.PI));
    const pores = n(u * 120, v * 120, 120) > 0.86 ? 0.82 : 1;
    const joint = (u * 2) % 1 < 0.006 || (v * 4) % 1 < 0.008 ? 0.8 : 1;
    const k = (0.86 + base * 0.2 - (1 - vein) * 0.05) * pores * joint;
    return [214 * k, 196 * k, 168 * k];
  });
}

/** Concreto/porcelanato claro com leve variação (evita superfícies "chapadas"). */
export function getConcreteTexture() {
  const n = valueNoise(37);
  return pixelTexture('concrete-light', 256, 256, (x, y) => {
    const u = x / 256;
    const v = y / 256;
    const k = 0.93 + fbm(n, u * 8, v * 8, 8, 4) * 0.1;
    return [236 * k, 236 * k, 232 * k];
  });
}

/** Grama com variação de tons. Um ladrilho = 4 × 4 m. */
export function getGrassTexture() {
  const n = valueNoise(51);
  return pixelTexture('grass', 256, 256, (x, y) => {
    const u = x / 256;
    const v = y / 256;
    const big = fbm(n, u * 4, v * 4, 4, 3);
    const blade = n(u * 128, v * 128, 128);
    const k = 0.72 + big * 0.35 + blade * 0.18;
    return [72 * k, 112 * k, 52 * k];
  });
}

/** Asfalto com agregado. Um ladrilho = 4 × 4 m. */
export function getAsphaltTexture() {
  const n = valueNoise(67);
  return pixelTexture('asphalt', 256, 256, (x, y) => {
    const u = x / 256;
    const v = y / 256;
    const k = 0.8 + fbm(n, u * 6, v * 6, 6, 3) * 0.25 + (n(u * 200, v * 200, 200) - 0.5) * 0.25;
    return [52 * k, 54 * k, 58 * k];
  });
}
