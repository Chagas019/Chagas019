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
