import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "@/lib/config";
import { dataDir } from "@/lib/local/store";
import { createAdminClient } from "@/lib/supabase/server";

export const PRIVATE_BUCKET = "preset-files";
export const MEDIA_BUCKET = "media";

/**
 * Armazenamento de arquivos.
 *  - Supabase: bucket PRIVADO "preset-files" (só service role) + URLs assinadas de curta duração;
 *    bucket público "media" para capas e galerias.
 *  - Local: arquivos em disco, entregues por /api/files/<token> com token HMAC que expira.
 */
export interface FileStorage {
  signedDownloadUrl(storagePath: string, fileName: string, ttlSeconds: number): Promise<string>;
  uploadPrivate(storagePath: string, data: Buffer, contentType: string): Promise<void>;
  removePrivate(storagePath: string): Promise<void>;
  uploadMedia(storagePath: string, data: Buffer, contentType: string): Promise<string>;
  /**
   * Upload direto do navegador (evita o limite de corpo das funções serverless).
   * Supabase: URL de upload assinada (uso único). Local: o navegador envia para /api/admin/upload.
   */
  createSignedUpload(target: "private" | "media", storagePath: string): Promise<{ kind: "supabase"; signedUrl: string; path: string; publicUrl?: string } | { kind: "local"; path: string }>;
  /** Confere se um objeto existe e devolve o tamanho em bytes (null = não existe). */
  statObject(target: "private" | "media", storagePath: string): Promise<number | null>;
  /** URL pública de uma mídia já enviada. */
  mediaUrl(storagePath: string): string;
}

// ------------------------------------------------------------------ tokens locais
const b64 = (s: string) => Buffer.from(s).toString("base64url");
const sign = (payload: string) => createHmac("sha256", config.appSecret).update(payload).digest("base64url");

export function createLocalFileToken(p: { path: string; name: string; exp: number }) {
  const payload = b64(JSON.stringify(p));
  return `${payload}.${sign(payload)}`;
}

export function verifyLocalFileToken(token: string): { path: string; name: string } | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const got = Buffer.from(sig);
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { path: string; name: string; exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return { path: data.path, name: data.name };
  } catch {
    return null;
  }
}

/** Resolve um caminho de storage local sem permitir sair do diretório base (path traversal). */
export function resolveSafe(base: string, rel: string): string | null {
  if (!rel || rel.includes("\0") || path.isAbsolute(rel)) return null;
  const full = path.resolve(base, rel);
  return full.startsWith(path.resolve(base) + path.sep) ? full : null;
}

export function localPrivatePath(storagePath: string) {
  // arquivos de demonstração versionados no repositório ficam em private-files/demo
  if (storagePath.startsWith("demo/")) return resolveSafe(path.join(process.cwd(), "private-files"), storagePath);
  return resolveSafe(path.join(dataDir(), "private"), storagePath);
}
export const localMediaDir = () => path.join(dataDir(), "media");

class LocalStorage implements FileStorage {
  async createSignedUpload(_target: "private" | "media", storagePath: string) {
    return { kind: "local" as const, path: storagePath };
  }
  async statObject(target: "private" | "media", storagePath: string) {
    const full = target === "private" ? localPrivatePath(storagePath) : resolveSafe(localMediaDir(), storagePath);
    if (!full) return null;
    try {
      return (await fs.stat(full)).size;
    } catch {
      return null;
    }
  }
  mediaUrl(storagePath: string) {
    return `/api/media/${storagePath}`;
  }
  async signedDownloadUrl(storagePath: string, fileName: string, ttlSeconds: number) {
    return `/api/files/${createLocalFileToken({ path: storagePath, name: fileName, exp: Date.now() + ttlSeconds * 1000 })}`;
  }
  async uploadPrivate(storagePath: string, data: Buffer) {
    const full = localPrivatePath(storagePath);
    if (!full || storagePath.startsWith("demo/")) throw new Error("Caminho inválido.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  }
  async removePrivate(storagePath: string) {
    if (storagePath.startsWith("demo/")) return; // arquivos de demonstração versionados não são apagados
    const full = localPrivatePath(storagePath);
    if (full) await fs.rm(full, { force: true });
  }
  async uploadMedia(storagePath: string, data: Buffer) {
    const full = resolveSafe(localMediaDir(), storagePath);
    if (!full) throw new Error("Caminho inválido.");
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return `/api/media/${storagePath}`;
  }
}

class SupabaseStorage implements FileStorage {
  private demo = new LocalStorage();
  async createSignedUpload(target: "private" | "media", storagePath: string) {
    const bucket = target === "private" ? PRIVATE_BUCKET : MEDIA_BUCKET;
    const { data, error } = await createAdminClient().storage.from(bucket).createSignedUploadUrl(storagePath);
    if (error || !data) throw new Error("Não foi possível preparar o upload.");
    return { kind: "supabase" as const, signedUrl: data.signedUrl, path: data.path, publicUrl: target === "media" ? this.mediaUrl(storagePath) : undefined };
  }
  async statObject(target: "private" | "media", storagePath: string) {
    const bucket = target === "private" ? PRIVATE_BUCKET : MEDIA_BUCKET;
    const dir = storagePath.split("/").slice(0, -1).join("/");
    const name = storagePath.split("/").pop()!;
    const { data } = await createAdminClient().storage.from(bucket).list(dir, { search: name, limit: 10 });
    const obj = data?.find((o) => o.name === name);
    return obj ? Number((obj.metadata as { size?: number } | null)?.size ?? 0) : null;
  }
  mediaUrl(storagePath: string) {
    return createAdminClient().storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  }
  async signedDownloadUrl(storagePath: string, fileName: string, ttlSeconds: number) {
    // presets de demonstração vêm versionados com o app (private-files/demo) e saem pelo mesmo link assinado
    if (storagePath.startsWith("demo/")) return this.demo.signedDownloadUrl(storagePath, fileName, ttlSeconds);
    const { data, error } = await createAdminClient().storage.from(PRIVATE_BUCKET).createSignedUrl(storagePath, ttlSeconds, { download: fileName });
    if (error || !data) throw new Error("Não foi possível gerar o link de download.");
    return data.signedUrl;
  }
  async uploadPrivate(storagePath: string, data: Buffer, contentType: string) {
    const { error } = await createAdminClient().storage.from(PRIVATE_BUCKET).upload(storagePath, data, { contentType, upsert: false });
    if (error) throw new Error(`Falha no upload: ${error.message}`);
  }
  async removePrivate(storagePath: string) {
    await createAdminClient().storage.from(PRIVATE_BUCKET).remove([storagePath]);
  }
  async uploadMedia(storagePath: string, data: Buffer, contentType: string) {
    const sb = createAdminClient();
    const { error } = await sb.storage.from(MEDIA_BUCKET).upload(storagePath, data, { contentType, upsert: false, cacheControl: "31536000" });
    if (error) throw new Error(`Falha no upload: ${error.message}`);
    return sb.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  }
}

let local: LocalStorage | null = null;
let supa: SupabaseStorage | null = null;
export function storage(): FileStorage {
  return config.backend === "supabase" ? (supa ??= new SupabaseStorage()) : (local ??= new LocalStorage());
}
