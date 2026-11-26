import { NextResponse, type NextRequest } from "next/server";
import { auth, AuthError } from "@/lib/auth";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Processa links de confirmação de cadastro e de recuperação de senha. */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = params.get("next");
  let type: string;
  try {
    ({ type } = await auth().verify(params));
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.redirect(new URL("/entrar?erro=link-invalido", request.url));
    throw e;
  }
  if (type === "recovery" || next === "/redefinir-senha") return NextResponse.redirect(new URL("/redefinir-senha", request.url));
  const dest = new URL(safeNext(next, "/lab"), request.url);
  dest.searchParams.set("bem-vindo", "1");
  return NextResponse.redirect(dest);
}
