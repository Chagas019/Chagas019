import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_PRIVATE = 100 * 1024 * 1024;
const MAX_MEDIA = 10 * 1024 * 1024;
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// caminhos gerados por prepareUploadAction (src/app/actions/admin.ts)
const PRIVATE_PATH = new RegExp(`^products/${UUID}/${UUID}-[a-z0-9._-]{1,70}\\.(dng|xmp|zip|cube|3dl)$`);
const MEDIA_PATH = new RegExp(`^media/\\d{4}/${UUID}\\.(jpg|png|webp|avif)$`);
const MEDIA_TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/** Confere a assinatura binária da imagem (não confia no content-type do cliente). */
function looksLikeImage(buf: Buffer, ext: string) {
  if (ext === "jpg") return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === "png") return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (ext === "webp") return buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP";
  if (ext === "avif") return buf.subarray(4, 8).toString("latin1") === "ftyp";
  return false;
}

/**
 * MODO LOCAL: recebe uploads do Admin Studio (no Supabase o navegador envia direto
 * para uma URL assinada do Storage e esta rota não é usada).
 */
export async function POST(request: Request) {
  if (config.backend !== "local") return json(404, { error: "Não disponível." });
  const user = await getCurrentUser();
  if (!user) return json(401, { error: "Faça login." });
  if (user.profile.role !== "admin") return json(403, { error: "Acesso negado." });

  const len = Number(request.headers.get("content-length") ?? "0");
  if (len > MAX_PRIVATE + 1024 * 1024) return json(413, { error: "Arquivo grande demais." });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, { error: "Envio inválido." });
  }
  const target = form.get("target");
  const path = form.get("path");
  const file = form.get("file");
  if ((target !== "private" && target !== "media") || typeof path !== "string" || !(file instanceof File)) return json(400, { error: "Envio inválido." });
  if (path.includes("..") || path.includes("\\") || !(path.startsWith("products/") || path.startsWith("media/"))) return json(400, { error: "Caminho inválido." });
  if (file.size <= 0) return json(400, { error: "Arquivo vazio." });

  const ext = path.split(".").pop()!.toLowerCase();
  const s = storage();
  try {
    if (target === "private") {
      if (!PRIVATE_PATH.test(path)) return json(400, { error: "Caminho inválido." });
      if (file.size > MAX_PRIVATE) return json(413, { error: "Arquivo maior que 100 MB." });
      const nameExt = file.name.split(".").pop()?.toLowerCase();
      if (nameExt !== ext) return json(400, { error: "Extensão não confere." });
      if ((await s.statObject("private", path)) !== null) return json(409, { error: "Arquivo já existe." });
      await s.uploadPrivate(path, Buffer.from(await file.arrayBuffer()), "application/octet-stream");
      return json(200, { ok: true, path });
    }
    if (!MEDIA_PATH.test(path)) return json(400, { error: "Caminho inválido." });
    if (file.size > MAX_MEDIA) return json(413, { error: "Imagem maior que 10 MB." });
    if (file.type !== MEDIA_TYPES[ext]) return json(415, { error: "Tipo de imagem não aceito." });
    const buf = Buffer.from(await file.arrayBuffer());
    if (!looksLikeImage(buf, ext)) return json(415, { error: "O conteúdo não é uma imagem válida." });
    if ((await s.statObject("media", path)) !== null) return json(409, { error: "Arquivo já existe." });
    const url = await s.uploadMedia(path, buf, MEDIA_TYPES[ext]);
    return json(200, { ok: true, path, url });
  } catch (e) {
    console.error("[admin/upload]", e);
    return json(500, { error: "Falha ao gravar o arquivo." });
  }
}
