import { describe, expect, it } from 'vitest';
import { NEUTRAL, combine, type Adjustments } from './adjustments';
import {
  buildLuts,
  hueOffset,
  linearToSrgb,
  processInStrips,
  processPixels,
  srgbToLinear,
} from './pipeline';
import { PRESETS } from '../presets/presets';

const adj = (over: Partial<Adjustments>): Adjustments => ({ ...NEUTRAL, ...over });

/** Imagem de teste com gradiente e cores variadas. */
function makeImage(w: number, h: number): Uint8ClampedArray {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      d[i] = (x * 255) / Math.max(1, w - 1);
      d[i + 1] = (y * 255) / Math.max(1, h - 1);
      d[i + 2] = ((x + y) * 97) % 256;
      d[i + 3] = 200;
    }
  }
  return d;
}

function pixel(rgb: [number, number, number], a: Adjustments): [number, number, number] {
  const d = new Uint8ClampedArray([rgb[0], rgb[1], rgb[2], 255]);
  processPixels(d, 1, 1, a);
  return [d[0]!, d[1]!, d[2]!];
}

const mean = (d: Uint8ClampedArray): number => {
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i]! + d[i + 1]! + d[i + 2]!;
  return s / ((d.length / 4) * 3);
};

describe('conversões de cor', () => {
  it('sRGB ↔ linear é reversível', () => {
    for (let v = 0; v <= 1; v += 0.05) {
      expect(linearToSrgb(srgbToLinear(v))).toBeCloseTo(v, 6);
    }
  });

  it('desvio de matiz não altera a luminância', () => {
    for (const h of [0, 45, 120, 200, 300]) {
      const [r, g, b] = hueOffset(h);
      expect(0.2126 * r + 0.7152 * g + 0.0722 * b).toBeCloseTo(0, 6);
    }
  });
});

describe('processPixels', () => {
  it('ajustes neutros não alteram nenhum pixel', () => {
    const img = makeImage(37, 23);
    const copy = img.slice();
    processPixels(img, 37, 23, NEUTRAL);
    expect(Array.from(img)).toEqual(Array.from(copy));
  });

  it('preserva o canal alfa', () => {
    const img = makeImage(8, 8);
    processPixels(img, 8, 8, combine(PRESETS[0]!.adjustments, 1, NEUTRAL));
    for (let i = 3; i < img.length; i += 4) expect(img[i]).toBe(200);
  });

  it('exposição positiva clareia e negativa escurece', () => {
    const base = pixel([100, 100, 100], NEUTRAL)[0];
    expect(pixel([100, 100, 100], adj({ exposure: 1 }))[0]).toBeGreaterThan(base);
    expect(pixel([100, 100, 100], adj({ exposure: -1 }))[0]).toBeLessThan(base);
  });

  it('+1 EV dobra a luz em espaço linear', () => {
    const out = pixel([80, 80, 80], adj({ exposure: 1 }))[0] / 255;
    expect(srgbToLinear(out)).toBeCloseTo(2 * srgbToLinear(80 / 255), 2);
  });

  it('contraste afasta os tons do meio', () => {
    const a = adj({ contrast: 60 });
    expect(pixel([60, 60, 60], a)[0]).toBeLessThan(60);
    expect(pixel([200, 200, 200], a)[0]).toBeGreaterThan(200);
    const low = adj({ contrast: -60 });
    expect(pixel([60, 60, 60], low)[0]).toBeGreaterThan(60);
    expect(pixel([200, 200, 200], low)[0]).toBeLessThan(200);
  });

  it('temperatura positiva aquece (mais vermelho, menos azul)', () => {
    const [r, , b] = pixel([128, 128, 128], adj({ temperature: 60 }));
    expect(r).toBeGreaterThan(128);
    expect(b).toBeLessThan(128);
    const [rc, , bc] = pixel([128, 128, 128], adj({ temperature: -60 }));
    expect(rc).toBeLessThan(128);
    expect(bc).toBeGreaterThan(128);
  });

  it('saturação -100 gera cinza', () => {
    const [r, g, b] = pixel([200, 80, 40], adj({ saturation: -100 }));
    expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
    expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
  });

  it('sombras clareiam tons escuros mais que os claros', () => {
    const a = adj({ shadows: 80 });
    const dark = pixel([50, 50, 50], a)[0] - 50;
    const light = pixel([230, 230, 230], a)[0] - 230;
    expect(dark).toBeGreaterThan(5);
    expect(dark).toBeGreaterThan(light);
  });

  it('realces negativos escurecem tons claros mais que os escuros', () => {
    const a = adj({ highlights: -80 });
    const light = 220 - pixel([220, 220, 220], a)[0];
    const dark = 40 - pixel([40, 40, 40], a)[0];
    expect(light).toBeGreaterThan(5);
    expect(light).toBeGreaterThan(dark);
  });

  it('vinheta negativa escurece as bordas e mantém o centro', () => {
    const w = 41;
    const h = 31;
    const img = new Uint8ClampedArray(w * h * 4).fill(180);
    processPixels(img, w, h, adj({ vignette: -100 }));
    const at = (x: number, y: number) => img[(y * w + x) * 4]!;
    expect(at(20, 15)).toBe(180);
    expect(at(0, 0)).toBeLessThan(120);
  });

  it('granulação é determinística', () => {
    const a = adj({ grain: 50 });
    const i1 = makeImage(16, 16);
    const i2 = makeImage(16, 16);
    processPixels(i1, 16, 16, a);
    processPixels(i2, 16, 16, a);
    expect(Array.from(i1)).toEqual(Array.from(i2));
  });
});

describe('processamento em faixas (alta resolução)', () => {
  it('dá o mesmo resultado que processar a imagem inteira', async () => {
    const w = 64;
    const h = 50;
    const a = PRESETS.find((p) => p.id === "cinema")!.adjustments;
    const full = makeImage(w, h);
    processPixels(full, w, h, combine(a, 1, NEUTRAL));

    const target = makeImage(w, h);
    const progress: number[] = [];
    await processInStrips(
      w,
      h,
      combine(a, 1, NEUTRAL),
      7,
      (y, sh) => target.slice(y * w * 4, (y + sh) * w * 4),
      (y, _sh, data) => target.set(data, y * w * 4),
      (f) => progress.push(f),
    );
    expect(Array.from(target)).toEqual(Array.from(full));
    expect(progress[progress.length - 1]).toBe(1);
  });
});

describe('intensidade dos presets', () => {
  it('0% é idêntico à foto original', () => {
    for (const p of PRESETS) {
      const img = makeImage(20, 20);
      const copy = img.slice();
      processPixels(img, 20, 20, combine(p.adjustments, 0, NEUTRAL));
      expect(Array.from(img)).toEqual(Array.from(copy));
    }
  });

  it('o efeito cresce de forma monotônica com a intensidade', () => {
    const original = makeImage(24, 24);
    for (const p of PRESETS) {
      let prev = -1;
      for (const t of [0, 0.25, 0.5, 0.75, 1]) {
        const img = original.slice();
        processPixels(img, 24, 24, combine(p.adjustments, t, NEUTRAL));
        let diff = 0;
        for (let i = 0; i < img.length; i++) diff += Math.abs(img[i]! - original[i]!);
        expect(diff).toBeGreaterThanOrEqual(prev);
        prev = diff;
      }
      expect(prev).toBeGreaterThan(0);
    }
  });

  it('Moody escurece e Luz Sagrada aquece', () => {
    const base = makeImage(30, 30);
    const moody = base.slice();
    processPixels(moody, 30, 30, combine(PRESETS.find((p) => p.id === 'moody')!.adjustments, 1, NEUTRAL));
    expect(mean(moody)).toBeLessThan(mean(base));

    const [r, , b] = pixel(
      [128, 128, 128],
      combine(PRESETS.find((p) => p.id === 'luz-sagrada')!.adjustments, 1, NEUTRAL),
    );
    expect(r).toBeGreaterThan(b);
  });
});

describe('tabelas de tons', () => {
  it('são monotônicas com ajustes moderados', () => {
    const luts = buildLuts(adj({ contrast: 40, shadows: 30, highlights: -30, exposure: 0.3 }));
    for (let i = 1; i < 256; i++) expect(luts.g[i]!).toBeGreaterThanOrEqual(luts.g[i - 1]! - 1e-6);
  });
});
