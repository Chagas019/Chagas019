import type { Adjustments } from './adjustments';
import { processInStrips, processPixels } from './pipeline';

/**
 * Núcleo de renderização. Não conhece React nem o Worker: a mesma classe
 * roda dentro do Web Worker (OffscreenCanvas) ou na thread principal
 * quando o navegador não oferece OffscreenCanvas.
 *
 * Memória: a foto original fica guardada só como arquivo compactado (Blob).
 * Em memória ficam apenas a prévia reduzida e a miniatura. A resolução total
 * é decodificada só na exportação, processada em faixas e liberada em seguida.
 */

export type ExportFormat = 'jpeg' | 'png';

export interface LoadInfo {
  width: number;
  height: number;
  previewWidth: number;
  previewHeight: number;
}

export interface ExportOptions {
  format: ExportFormat;
  /** 0–1, usado só em JPG. */
  quality: number;
  adjustments: Adjustments;
}

/** Maior lado da prévia exibida na tela. */
export const PREVIEW_MAX_EDGE = 1800;
export const THUMB_MAX_EDGE = 220;
/** Limite de segurança: acima disso navegadores móveis costumam falhar. */
export const MAX_PIXELS = 100_000_000;
/** Pixels por faixa durante a exportação (~16 MB de RGBA por vez). */
const STRIP_PIXELS = 4_000_000;

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function createCanvas(w: number, h: number): AnyCanvas {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function context(c: AnyCanvas): AnyContext {
  const ctx = c.getContext('2d', { willReadFrequently: true }) as AnyContext | null;
  if (!ctx) throw new Error('Não foi possível criar a área de desenho. A foto pode ser grande demais para este aparelho.');
  return ctx;
}

export async function canvasToBlob(c: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  if ('convertToBlob' in c) {
    return quality === undefined ? c.convertToBlob({ type }) : c.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar o arquivo.'))), type, quality);
  });
}

export function fitSize(w: number, h: number, maxEdge: number): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

export async function decode(blob: Blob): Promise<ImageBitmap> {
  try {
    // Respeita a orientação EXIF (fotos de celular "deitadas").
    return await createImageBitmap(blob, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Não foi possível abrir esta imagem. Use JPG, PNG ou WEBP.');
  }
}

function scaledImageData(bitmap: ImageBitmap, maxEdge: number): ImageData {
  const { width, height } = fitSize(bitmap.width, bitmap.height, maxEdge);
  const c = createCanvas(width, height);
  const ctx = context(c);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export class EngineCore {
  private source: Blob | null = null;
  private preview: ImageData | null = null;
  private thumb: ImageData | null = null;

  async load(blob: Blob): Promise<LoadInfo> {
    this.dispose();
    const bitmap = await decode(blob);
    try {
      if (bitmap.width * bitmap.height > MAX_PIXELS) {
        throw new Error('Foto grande demais (acima de 100 megapixels).');
      }
      this.preview = scaledImageData(bitmap, PREVIEW_MAX_EDGE);
      this.thumb = scaledImageData(bitmap, THUMB_MAX_EDGE);
      this.source = blob;
      return {
        width: bitmap.width,
        height: bitmap.height,
        previewWidth: this.preview.width,
        previewHeight: this.preview.height,
      };
    } finally {
      bitmap.close();
    }
  }

  /** Cópia intocada da prévia (camada "antes"). */
  original(): ImageData {
    const p = this.requirePreview();
    return new ImageData(new Uint8ClampedArray(p.data), p.width, p.height);
  }

  render(adjustments: Adjustments): ImageData {
    const p = this.requirePreview();
    const out = new ImageData(new Uint8ClampedArray(p.data), p.width, p.height);
    processPixels(out.data, out.width, out.height, adjustments);
    return out;
  }

  async thumbnail(adjustments: Adjustments): Promise<Blob> {
    if (!this.thumb) throw new Error('Nenhuma foto carregada.');
    const t = this.thumb;
    const img = new ImageData(new Uint8ClampedArray(t.data), t.width, t.height);
    processPixels(img.data, img.width, img.height, adjustments);
    const c = createCanvas(img.width, img.height);
    context(c).putImageData(img, 0, 0);
    return canvasToBlob(c, 'image/jpeg', 0.85);
  }

  async export(
    opts: ExportOptions,
    onProgress?: (fraction: number) => void,
    yieldControl?: () => Promise<void>,
  ): Promise<Blob> {
    if (!this.source) throw new Error('Nenhuma foto carregada.');
    const bitmap = await decode(this.source);
    const { width, height } = bitmap;
    const c = createCanvas(width, height);
    try {
      const ctx = context(c);
      if (opts.format === 'jpeg') {
        // JPG não tem transparência: fundo branco evita áreas pretas.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
      }
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();

      const stripHeight = Math.max(16, Math.floor(STRIP_PIXELS / width));
      await processInStrips(
        width,
        height,
        opts.adjustments,
        stripHeight,
        (y, h) => ctx.getImageData(0, y, width, h).data,
        (y, h, data) => ctx.putImageData(new ImageData(data, width, h), 0, y),
        (f) => onProgress?.(f * 0.9),
        yieldControl,
      );

      const type = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      const blob = await canvasToBlob(c, type, opts.format === 'jpeg' ? opts.quality : undefined);
      if (blob.type !== type) throw new Error('Este navegador não consegue gerar este formato.');
      onProgress?.(1);
      return blob;
    } catch (e) {
      bitmap.close();
      if (e instanceof Error && /memory|allocation|range/i.test(e.message)) {
        throw new Error('Memória insuficiente para exportar nesta resolução.');
      }
      throw e;
    } finally {
      // Libera a memória da imagem em resolução total.
      c.width = 1;
      c.height = 1;
    }
  }

  dispose(): void {
    this.source = null;
    this.preview = null;
    this.thumb = null;
  }

  private requirePreview(): ImageData {
    if (!this.preview) throw new Error('Nenhuma foto carregada.');
    return this.preview;
  }
}
