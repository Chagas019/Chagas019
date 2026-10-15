import type { Adjustments } from './adjustments';

/**
 * Motor de pixels do Chagas Color.
 *
 * Tudo que depende só do valor de um canal (exposição, balanço de branco,
 * contraste, realces, sombras, brancos, pretos e esmaecer) é pré-calculado em
 * três tabelas de 256 entradas (uma por canal). Assim o custo por pixel fica
 * em três consultas + saturação, divisão de tons, vinheta e granulação.
 *
 * As funções aqui são puras e não usam DOM: rodam no Web Worker, na thread
 * principal (fallback) e nos testes unitários.
 */

export interface ToneLuts {
  r: Float32Array;
  g: Float32Array;
  b: Float32Array;
}

/** Região processada dentro da imagem inteira (para vinheta e granulação). */
export interface Region {
  /** Deslocamento da faixa dentro da imagem completa. */
  offsetX: number;
  offsetY: number;
  /** Dimensões da imagem completa. */
  fullWidth: number;
  fullHeight: number;
}

export function srgbToLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

export function linearToSrgb(v: number): number {
  if (v <= 0) return 0;
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

const HIGHLIGHT_KNEE = 0.75;

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Ganhos por canal para temperatura e matiz (em luz linear).
 * Aproximação perceptiva, não uma conversão Kelvin calibrada.
 */
export function whiteBalanceGains(temperature: number, tint: number): [number, number, number] {
  const t = temperature / 100;
  const m = tint / 100;
  const r = 1 + 0.28 * t + 0.06 * m;
  const g = 1 + 0.02 * t - 0.16 * m;
  const b = 1 - 0.32 * t + 0.06 * m;
  // Normaliza pela luminância para não mudar o brilho geral.
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / luma, g / luma, b / luma];
}

/** Curva tonal aplicada a um valor sRGB 0–1 (já com exposição e balanço). */
export function toneCurve(x0: number, a: Adjustments): number {
  let x = x0;
  // Realces negativos "recuperam" o que estourou com um joelho suave.
  const recover = Math.max(0, -a.highlights) / 100;
  if (recover > 0 && x > HIGHLIGHT_KNEE) {
    const span = 1 - HIGHLIGHT_KNEE;
    const rolled = HIGHLIGHT_KNEE + span * Math.tanh((x - HIGHLIGHT_KNEE) / span);
    x += (rolled - x) * recover;
  }
  x = clamp01(x);

  const h = a.highlights / 100;
  const s = a.shadows / 100;
  const w = a.whites / 100;
  const k = a.blacks / 100;

  // Máscaras suaves: sombras com pico em ~1/3, realces com pico em ~2/3.
  x += s * 0.45 * (4 * x * (1 - x) * (1 - x));
  x += h * 0.45 * (4 * x * x * (1 - x));
  x += w * 0.18 * x * x * x;
  x += k * 0.18 * (1 - x) * (1 - x) * (1 - x);
  x = clamp01(x);

  const c = a.contrast / 100;
  if (c > 0) {
    const sCurve = x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) * (1 - x);
    x += c * 0.65 * (sCurve - x);
  } else if (c < 0) {
    x = 0.5 + (x - 0.5) * (1 + 0.55 * c);
  }

  const f = (a.fade / 100) * 0.16;
  x = f + x * (1 - f * 0.6);

  return clamp01(x);
}

export function buildLuts(a: Adjustments): ToneLuts {
  const gains = whiteBalanceGains(a.temperature, a.tint);
  const ev = Math.pow(2, a.exposure);
  const luts: ToneLuts = {
    r: new Float32Array(256),
    g: new Float32Array(256),
    b: new Float32Array(256),
  };
  const channels = [luts.r, luts.g, luts.b] as const;
  for (let i = 0; i < 256; i++) {
    const lin = srgbToLinear(i / 255) * ev;
    for (let c = 0; c < 3; c++) {
      channels[c]![i] = toneCurve(linearToSrgb(lin * gains[c]!), a);
    }
  }
  return luts;
}

/** Cor pura de uma matiz, com a luminância removida (só o "desvio" de cor). */
export function hueOffset(hueDeg: number): [number, number, number] {
  const h = (((hueDeg % 360) + 360) % 360) / 60;
  const x = 1 - Math.abs((h % 2) - 1);
  let rgb: [number, number, number];
  if (h < 1) rgb = [1, x, 0];
  else if (h < 2) rgb = [x, 1, 0];
  else if (h < 3) rgb = [0, 1, x];
  else if (h < 4) rgb = [0, x, 1];
  else if (h < 5) rgb = [x, 0, 1];
  else rgb = [1, 0, x];
  const l = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return [rgb[0] - l, rgb[1] - l, rgb[2] - l];
}

/** Ruído determinístico por coordenada (mesma foto = mesma granulação). */
function hashNoise(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  n ^= n >>> 16;
  return (n & 0xffff) / 0xffff - 0.5;
}

/**
 * Processa pixels RGBA no próprio buffer (sem cópias).
 * `data` pode ser a imagem inteira ou uma faixa dela (ver `region`).
 */
export function processPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  a: Adjustments,
  region: Region = { offsetX: 0, offsetY: 0, fullWidth: width, fullHeight: height },
  luts: ToneLuts = buildLuts(a),
): void {
  const { r: lr, g: lg, b: lb } = luts;
  const satF = 1 + a.saturation / 100;
  const vib = a.vibrance / 100;
  const sh = hueOffset(a.splitShadowHue);
  const hi = hueOffset(a.splitHighlightHue);
  const shAmt = (a.splitShadowSat / 100) * 0.35;
  const hiAmt = (a.splitHighlightSat / 100) * 0.35;
  const doSplit = shAmt > 0 || hiAmt > 0;
  const vig = a.vignette / 100;
  const grain = (a.grain / 100) * 0.14;
  const doColor = satF !== 1 || vib !== 0;

  const fw = region.fullWidth;
  const fh = region.fullHeight;
  // Vinheta elíptica que acompanha a proporção da foto.
  const cx = fw / 2;
  const cy = fh / 2;
  const invRx = 1 / Math.max(1, cx);
  const invRy = 1 / Math.max(1, cy);

  for (let y = 0; y < height; y++) {
    const gy = y + region.offsetY;
    const dy = (gy + 0.5 - cy) * invRy;
    const dy2 = dy * dy;
    let i = y * width * 4;
    for (let x = 0; x < width; x++, i += 4) {
      let r = lr[data[i]!]!;
      let g = lg[data[i + 1]!]!;
      let b = lb[data[i + 2]!]!;

      if (doColor) {
        const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const max = r > g ? (r > b ? r : b) : g > b ? g : b;
        const min = r < g ? (r < b ? r : b) : g < b ? g : b;
        const chroma = max - min;
        // Vibração age mais nas cores pouco saturadas.
        const f = satF * (1 + vib * (1 - chroma) * (vib > 0 ? 1.2 : 1));
        r = l + (r - l) * f;
        g = l + (g - l) * f;
        b = l + (b - l) * f;
      }

      if (doSplit) {
        const l = clamp01(0.2126 * r + 0.7152 * g + 0.0722 * b);
        const ws = shAmt * (1 - l) * (1 - l);
        const wh = hiAmt * l * l;
        r += ws * sh[0] + wh * hi[0];
        g += ws * sh[1] + wh * hi[1];
        b += ws * sh[2] + wh * hi[2];
      }

      if (vig !== 0) {
        const dx = (region.offsetX + x + 0.5 - cx) * invRx;
        const d = (dx * dx + dy2) * 0.5; // 0 no centro, 1 nos cantos
        const t = d <= 0.2 ? 0 : d >= 1 ? 1 : (d - 0.2) / 0.8;
        const m = t * t * (3 - 2 * t);
        const k = vig < 0 ? 1 + vig * 0.75 * m : 1;
        const add = vig > 0 ? vig * 0.5 * m : 0;
        r = r * k + (1 - r) * add;
        g = g * k + (1 - g) * add;
        b = b * k + (1 - b) * add;
      }

      if (grain > 0) {
        const n = hashNoise(region.offsetX + x, gy) * grain;
        r += n;
        g += n;
        b += n;
      }

      // Uint8ClampedArray já arredonda e limita a 0–255. Alfa preservado.
      data[i] = r * 255;
      data[i + 1] = g * 255;
      data[i + 2] = b * 255;
    }
  }
}

/**
 * Processa uma imagem grande em faixas horizontais, devolvendo o controle
 * entre elas (útil para progresso e para não bloquear a thread).
 */
export async function processInStrips(
  width: number,
  height: number,
  a: Adjustments,
  stripHeight: number,
  read: (y: number, h: number) => Uint8ClampedArray,
  write: (y: number, h: number, data: Uint8ClampedArray) => void,
  onProgress?: (fraction: number) => void,
  yieldControl: () => Promise<void> = () => Promise.resolve(),
): Promise<void> {
  const luts = buildLuts(a);
  const fullRegion = { offsetX: 0, fullWidth: width, fullHeight: height };
  for (let y = 0; y < height; y += stripHeight) {
    const h = Math.min(stripHeight, height - y);
    const strip = read(y, h);
    processPixels(strip, width, h, a, { ...fullRegion, offsetY: y }, luts);
    write(y, h, strip);
    onProgress?.(Math.min(1, (y + h) / height));
    await yieldControl();
  }
}
