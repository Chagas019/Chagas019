import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { post } from "@/server/db/schema";
import { getViewer } from "@/server/session";
import { canViewPost } from "@/server/services/access";
import { getMediaRow } from "@/server/services/media";
import { storage } from "@/server/storage";

export const runtime = "nodejs";

const notFound = () => new Response("Não encontrado", { status: 404 });

/**
 * Entrega de mídia com autorização. Não existem URLs públicas permanentes:
 * cada requisição verifica se quem pede pode ver o post ao qual o arquivo pertence.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return notFound();
  const row = await getMediaRow(id);
  if (!row) return notFound();

  let isPublic = false;
  if (row.purpose === "avatar" || row.purpose === "cover") {
    isPublic = true;
  } else if (!row.postId) {
    const viewer = await getViewer();
    if (viewer?.id !== row.ownerId) return notFound();
  } else {
    const [p] = await db
      .select({ authorId: post.authorId, visibility: post.visibility, status: post.status, communityId: post.communityId })
      .from(post)
      .where(eq(post.id, row.postId))
      .limit(1);
    if (!p) return notFound();
    const viewer = await getViewer();
    if (!(await canViewPost(viewer, p))) return notFound();
    isPublic = p.visibility === "public" && p.status === "published" && !p.communityId;
  }

  const url = new URL(req.url);
  const wantsThumb = url.searchParams.get("v") === "thumb" && row.thumbKey;
  const key = wantsThumb ? row.thumbKey! : row.storageKey;

  let range: { start: number; end?: number } | undefined;
  const rangeHeader = req.headers.get("range");
  if (row.kind === "video" && rangeHeader) {
    const m = /^bytes=(\d+)-(\d*)$/.exec(rangeHeader);
    if (m) range = { start: Number(m[1]), end: m[2] ? Number(m[2]) : undefined };
  }

  const obj = await storage().get(key, range);
  if (!obj) return notFound();

  const headers = new Headers({
    "Content-Type": wantsThumb ? "image/webp" : row.mimeType,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
    "Accept-Ranges": row.kind === "video" ? "bytes" : "none",
    // Conteúdo não público nunca vai para caches compartilhados.
    "Cache-Control": isPublic ? "public, max-age=60, s-maxage=60" : "private, no-cache",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  if (obj.size !== null) headers.set("Content-Length", String(obj.size));
  if (obj.range) {
    headers.set("Content-Range", `bytes ${obj.range.start}-${obj.range.end}/${obj.range.total}`);
    return new Response(obj.body, { status: 206, headers });
  }
  return new Response(obj.body, { status: 200, headers });
}
