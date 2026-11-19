import { NextResponse } from "next/server";
import { API_URL, COOKIE } from "@/lib/server";

/** Login: o JWT fica em cookie httpOnly — nunca acessível ao JavaScript do navegador. */
export async function POST(req: Request) {
  const body = await req.json();
  const r = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": req.headers.get("x-forwarded-for") ?? "" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) return NextResponse.json(data, { status: r.status });
  const res = NextResponse.json({ user: data.user });
  res.cookies.set(COOKIE, data.token, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" && process.env.COOKIE_SECURE !== "false", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
