import type { Adjustments } from './adjustments';
import { EngineCore, type ExportOptions, type LoadInfo } from './core';
import type { Request, Response } from '../workers/protocol';

/** API usada pela interface, independente de onde o processamento roda. */
export interface Engine {
  readonly mode: 'worker' | 'main-thread';
  load(blob: Blob): Promise<LoadInfo>;
  original(): Promise<ImageData>;
  render(adjustments: Adjustments): Promise<ImageData>;
  thumbnail(adjustments: Adjustments): Promise<Blob>;
  export(options: ExportOptions, onProgress?: (fraction: number) => void): Promise<Blob>;
  dispose(): Promise<void>;
}

type Pending = {
  resolve: (r: Response) => void;
  reject: (e: Error) => void;
  onProgress?: ((f: number) => void) | undefined;
};

type RequestBody = Request extends infer R ? (R extends Request ? Omit<R, 'id'> : never) : never;

class WorkerEngine implements Engine {
  readonly mode = 'worker' as const;
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(private worker: Worker) {
    worker.onmessage = (e: MessageEvent<Response>) => {
      const msg = e.data;
      const p = this.pending.get(msg.id);
      if (!p) return;
      if (msg.type === 'progress') {
        p.onProgress?.(msg.fraction);
        return;
      }
      this.pending.delete(msg.id);
      if (msg.type === 'error') p.reject(new Error(msg.message));
      else p.resolve(msg);
    };
    worker.onerror = (e) => {
      const err = new Error(e.message || 'O processador de imagens parou de responder.');
      for (const p of this.pending.values()) p.reject(err);
      this.pending.clear();
    };
  }

  private call(body: RequestBody, onProgress?: (f: number) => void): Promise<Response> {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      this.worker.postMessage({ ...body, id } as Request);
    });
  }

  private async image(body: RequestBody): Promise<ImageData> {
    const r = await this.call(body);
    if (r.type !== 'image') throw new Error('Resposta inesperada do processador.');
    return new ImageData(new Uint8ClampedArray(r.buffer), r.width, r.height);
  }

  private async blob(body: RequestBody, onProgress?: (f: number) => void): Promise<Blob> {
    const r = await this.call(body, onProgress);
    if (r.type !== 'blob') throw new Error('Resposta inesperada do processador.');
    return r.blob;
  }

  async load(blob: Blob): Promise<LoadInfo> {
    const r = await this.call({ type: 'load', blob });
    if (r.type !== 'loaded') throw new Error('Resposta inesperada do processador.');
    return r.info;
  }

  original(): Promise<ImageData> {
    return this.image({ type: 'original' });
  }

  render(adjustments: Adjustments): Promise<ImageData> {
    return this.image({ type: 'render', adjustments });
  }

  thumbnail(adjustments: Adjustments): Promise<Blob> {
    return this.blob({ type: 'thumbnail', adjustments });
  }

  export(options: ExportOptions, onProgress?: (fraction: number) => void): Promise<Blob> {
    return this.blob({ type: 'export', options }, onProgress);
  }

  async dispose(): Promise<void> {
    await this.call({ type: 'dispose' });
  }
}

/** Fallback sem Worker/OffscreenCanvas: mesma lógica, cedendo a vez à interface. */
class MainThreadEngine implements Engine {
  readonly mode = 'main-thread' as const;
  private core = new EngineCore();
  load(blob: Blob) {
    return this.core.load(blob);
  }
  async original() {
    return this.core.original();
  }
  async render(adjustments: Adjustments) {
    return this.core.render(adjustments);
  }
  thumbnail(adjustments: Adjustments) {
    return this.core.thumbnail(adjustments);
  }
  export(options: ExportOptions, onProgress?: (fraction: number) => void) {
    return this.core.export(options, onProgress, () => new Promise((r) => setTimeout(r, 0)));
  }
  async dispose() {
    this.core.dispose();
  }
}

function supportsWorkerCanvas(): boolean {
  if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') return false;
  try {
    return new OffscreenCanvas(1, 1).getContext('2d') !== null;
  } catch {
    return false;
  }
}

export function createEngine(): Engine {
  if (supportsWorkerCanvas()) {
    try {
      const worker = new Worker(new URL('../workers/engine.worker.ts', import.meta.url), {
        type: 'module',
      });
      return new WorkerEngine(worker);
    } catch {
      // cai para a thread principal
    }
  }
  return new MainThreadEngine();
}
