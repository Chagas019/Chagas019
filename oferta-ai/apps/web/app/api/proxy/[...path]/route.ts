import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { API_URL, COOKIE } from "@/lib/server";

/** Proxy autenticado para a API: injeta o token do cookie httpOnly no servidor. */
async function handler(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
  // Bloqueia segmentos "." / ".." para o proxy não alcançar rotas fora de /api com o token do usuário.
  if (path.some((seg) => seg === "." || seg === ".." || seg.includes("/") || seg.includes("\\"))) return NextResponse.json({ error: "caminho inválido" }, { status: 400 });
  const url = `${API_URL}/api/${path.map(encodeURIComponent).join("/")}${req.nextUrl.search}`;
  const init: RequestInit = { method: req.method, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" };
  if (!["GET", "HEAD"].includes(req.method)) init.body = await req.text();
  const r = await fetch(url, init);
  const res = new NextResponse(await r.text(), { status: r.status, headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" } });
  if (r.status === 401) res.cookies.delete(COOKIE);
  return res;
}
export { handler as GET, handler as POST, handler as PUT, handler as DELETE };
