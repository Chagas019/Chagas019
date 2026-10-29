import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lt } from "drizzle-orm";
import sharp, { type Metadata, type Sharp } from "sharp";
import { db } from "../db";
import { media } from "../db/schema";
import { AppError } from "../errors";
import { storage } from "../storage";

export const IMAGE_MAX_BYTES = 20 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024;
const MAX_INPUT_PIXELS = 60_000_000;

export type MediaPurpose = (typeof media.$inferInsert)["purpose"];

type Sniffed = { kind: "image"; mime: "image/jpeg" | "image/png" | "image/webp" | "image/avif" } | { kind: "video"; mime: "video/mp4" | "video/quicktime" | "video/webm" };

/** Identifica o tipo real do arquivo pela assinatura binária — nunca pela extensão ou pelo MIME enviado. */
export function sniffMime(buf: Buffer): Sniffed | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { kind: "image", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: "image", mime: "image/png" };
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { kind: "image", mime: "image/webp" };
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { kind: "video", mime: "video/webm" };
  if (buf.toString("ascii", 4, 8) === "ftyp") {
    const brand = buf.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return { kind: "image", mime: "image/avif" };
    if (brand === "qt  ") return { kind: "video", mime: "video/quicktime" };
    if (["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "dash", "MSNV"].includes(brand))
      return { kind: "video", mime: "video/mp4" };
  }
  return null;
}

export type UploadedMedia = {
  id: string;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
};

/**
 * Valida e armazena um arquivo enviado pelo usuário.
 * Imagens: reorientadas, sem EXIF/GPS, convertidas para WebP (exibição ≤2560px e miniatura 640px).
 * Vídeos: validados por assinatura e tamanho; armazenados como enviados.
 */
export async function storeUpload(params: {
  ownerId: string;
  purpose: MediaPurpose;
  data: Buffer;
  alt?: string;
  allowVideo?: boolean;
}): Promise<UploadedMedia> {
  const sniffed = sniffMime(params.data);
  if (!sniffed) {
    throw new AppError("VALIDATION", "Formato não suportado. Envie JPEG, PNG, WebP, AVIF, MP4, MOV ou WebM.");
  }
  if (sniffed.kind === "video" && params.allowVideo === false) {
    throw new AppError("VALIDATION", "Aqui só aceitamos imagens.");
  }
  const id = randomUUID();
  const base = `${params.ownerId.replace(/[^a-zA-Z0-9_-]/g, "")}/${id}`;

  if (sniffed.kind === "image") {
    if (params.data.length > IMAGE_MAX_BYTES) throw new AppError("VALIDATION", "Imagens podem ter até 20 MB.");
    let pipeline: Sharp;
    let meta: Metadata;
    try {
      pipeline = sharp(params.data, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" }).rotate();
      meta = await pipeline.metadata();
    } catch {
      throw new AppError("VALIDATION", "Não conseguimos ler esta imagem. Ela pode estar corrompida.");
    }
    const maxSide = params.purpose === "avatar" ? 512 : 2560;
    const display = await pipeline
      .clone()
      .resize({ width: maxSide, height: maxSide, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await pipeline
      .clone()
      .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer();
    const key = `${base}.webp`;
    const thumbKey = `${base}_thumb.webp`;
    await storage().put(key, display.data, "image/webp");
    await storage().put(thumbKey, thumb, "image/webp");
    const width = display.info.width ?? meta.width ?? null;
    const height = display.info.height ?? meta.height ?? null;
    await db.insert(media).values({
      id,
      ownerId: params.ownerId,
      purpose: params.purpose,
      kind: "image",
      mimeType: "image/webp",
      storageKey: key,
      thumbKey,
      width,
      height,
      sizeBytes: display.data.length,
      alt: params.alt ?? "",
    });
    return { id, kind: "image", width, height };
  }

  if (params.data.length > VIDEO_MAX_BYTES) throw new AppError("VALIDATION", "Vídeos podem ter até 200 MB.");
  const ext = sniffed.mime === "video/webm" ? "webm" : sniffed.mime === "video/quicktime" ? "mov" : "mp4";
  const key = `${base}.${ext}`;
  await storage().put(key, params.data, sniffed.mime);
  await db.insert(media).values({
    id,
    ownerId: params.ownerId,
    purpose: params.purpose,
    kind: "video",
    mimeType: sniffed.mime,
    storageKey: key,
    sizeBytes: params.data.length,
    alt: params.alt ?? "",
  });
  return { id, kind: "video", width: null, height: null };
}

/** Remove arquivos e metadados. Usado ao excluir posts, contas e uploads abandonados. */
export async function deleteMediaRows(rows: { id: string; storageKey: string; thumbKey: string | null }[]) {
  if (rows.length === 0) return;
  const keys = rows.flatMap((r) => (r.thumbKey ? [r.storageKey, r.thumbKey] : [r.storageKey]));
  await storage().delete(keys);
  await db.delete(media).where(inArray(media.id, rows.map((r) => r.id)));
}

/** Uploads que nunca foram anexados a um post em 24h são descartados. */
export async function cleanupOrphanMedia(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: media.id, storageKey: media.storageKey, thumbKey: media.thumbKey })
    .from(media)
    .where(and(isNull(media.postId), inArray(media.purpose, ["post", "showcase_before", "showcase_after"]), lt(media.createdAt, cutoff)))
    .limit(500);
  await deleteMediaRows(rows);
  return rows.length;
}

export async function getMediaRow(id: string) {
  const [row] = await db.select().from(media).where(eq(media.id, id)).limit(1);
  return row ?? null;
}
