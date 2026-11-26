import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { authorizeDownload, DownloadError } from "@/lib/services/downloads";

export const dynamic = "force-dynamic";

/**
 * POST /api/download/:fileId — autoriza no servidor e redireciona (303) para uma URL
 * assinada que expira em segundos. POST evita prefetch e downloads disparados por links de terceiros
 * (cookies SameSite=Lax não acompanham POST entre sites).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  const user = await getCurrentUser();
  const back = request.headers.get("referer");
  if (!user) {
    const next = back ? new URL(back).pathname : "/lab";
    return NextResponse.redirect(new URL(`/entrar?next=${encodeURIComponent(next)}`, request.url), 303);
  }
  try {
    const { url } = await authorizeDownload(user, fileId);
    return NextResponse.redirect(new URL(url, request.url), 303);
  } catch (e) {
    if (e instanceof DownloadError) {
      const status = e.code === "not_found" ? 404 : e.code === "forbidden" ? 403 : e.code === "rate_limited" ? 429 : 503;
      if (request.headers.get("accept")?.includes("application/json")) return NextResponse.json({ error: e.message, reason: e.reason }, { status });
      return new NextResponse(errorPage(e.message), { status, headers: { "content-type": "text/html; charset=utf-8" } });
    }
    throw e;
  }
}

export function GET() {
  return NextResponse.json({ error: "Use o botão de download da sua biblioteca." }, { status: 405, headers: { Allow: "POST" } });
}

function errorPage(msg: string) {
  const safe = msg.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Download indisponível · PRESET LAB</title><body style="background:#0a0a0a;color:#f2efe9;font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px"><main style="max-width:420px"><p style="color:#ff5a1f;letter-spacing:.14em;font-size:11px;text-transform:uppercase">Download indisponível</p><h1 style="font-size:28px;margin:.4em 0">${safe}</h1><p><a style="color:#f2efe9" href="/lab">Voltar para a biblioteca</a> · <a style="color:#f2efe9" href="/premium">Premium Club</a></p></main></body></html>`;
}
