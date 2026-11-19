import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("oferta_session")?.value;
  const { pathname } = req.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname === "/favicon.ico";
  if (!token && !isPublic) {
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "não autenticado" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
