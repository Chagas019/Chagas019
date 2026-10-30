import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { del, get, put } from "@vercel/blob";

export type StoredObject = {
  body: ReadableStream<Uint8Array>;
  size: number | null;
  contentType: string | null;
  /** Presente quando a resposta é parcial (HTTP Range). */
  range?: { start: number; end: number; total: number };
};

export interface Storage {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string, range?: { start: number; end?: number }): Promise<StoredObject | null>;
  delete(keys: string[]): Promise<void>;
}

const KEY_RE = /^[a-zA-Z0-9_-]+(\/[a-zA-Z0-9_.-]+)+$/;
function assertKey(key: string) {
  if (!KEY_RE.test(key) || key.includes("..")) throw new Error(`Chave de storage inválida: ${key}`);
}

class LocalStorage implements Storage {
  constructor(private readonly root: string) {}

  private resolve(key: string) {
    assertKey(key);
    const full = path.resolve(this.root, key);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Caminho fora do storage");
    return full;
  }

  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async get(key: string, range?: { start: number; end?: number }): Promise<StoredObject | null> {
    const full = this.resolve(key);
    const info = await stat(full).catch(() => null);
    if (!info) return null;
    if (range) {
      const end = Math.min(range.end ?? info.size - 1, info.size - 1);
      if (range.start > end) return null;
      const stream = createReadStream(full, { start: range.start, end });
      return {
        body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
        size: end - range.start + 1,
        contentType: null,
        range: { start: range.start, end, total: info.size },
      };
    }
    return {
      body: Readable.toWeb(createReadStream(full)) as ReadableStream<Uint8Array>,
      size: info.size,
      contentType: null,
    };
  }

  async delete(keys: string[]) {
    await Promise.all(keys.map((k) => rm(this.resolve(k), { force: true })));
  }
}

/** Vercel Blob em modo privado: nenhum arquivo fica acessível por URL pública. */
class BlobStorage implements Storage {
  async put(key: string, data: Buffer, contentType: string) {
    assertKey(key);
    await put(key, data, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false });
  }

  async get(key: string, range?: { start: number; end?: number }): Promise<StoredObject | null> {
    assertKey(key);
    const headers = range ? { Range: `bytes=${range.start}-${range.end ?? ""}` } : undefined;
    const res = await get(key, { access: "private", headers, useCache: !range }).catch(() => null);
    if (!res || !res.stream) return null;
    const contentRange = res.headers.get("content-range");
    const m = contentRange ? /^bytes (\d+)-(\d+)\/(\d+)$/.exec(contentRange) : null;
    return {
      body: res.stream,
      size: res.blob.size ?? null,
      contentType: res.blob.contentType ?? null,
      range: m ? { start: Number(m[1]), end: Number(m[2]), total: Number(m[3]) } : undefined,
    };
  }

  async delete(keys: string[]) {
    if (keys.length === 0) return;
    keys.forEach(assertKey);
    await del(keys);
  }
}

let instance: Storage | undefined;

export function storage(): Storage {
  if (!instance) {
    instance =
      process.env.STORAGE_DRIVER === "blob"
        ? new BlobStorage()
        : new LocalStorage(path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.LOCAL_STORAGE_DIR ?? "./storage"));
  }
  return instance;
}
