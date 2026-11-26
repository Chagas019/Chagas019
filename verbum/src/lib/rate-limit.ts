import "server-only";
import type { NextRequest } from "next/server";

// Limite simples em memória por instância (proteção básica; para escala use Redis/Upstash).
const buckets = new Map<string, Map<string, number[]>>();
const MAX_KEYS = 5000;

/** IP informado pela plataforma de hospedagem (não confia em X-Forwarded-For do cliente). */
export function clientIp(req: NextRequest): string {
  return req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip")?.trim() || "local";
}

export function allow(scope: string, key: string, limit: number, windowMs: number): boolean {
  let b = buckets.get(scope);
  if (!b) buckets.set(scope, (b = new Map()));
  const now = Date.now();
  const list = (b.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) { b.set(key, list); return false; }
  list.push(now);
  b.delete(key);
  b.set(key, list);
  if (b.size > MAX_KEYS) {
    for (const [k, v] of b) {
      if (b.size <= MAX_KEYS * 0.8) break;
      if (!v.some((t) => now - t < windowMs) || b.size > MAX_KEYS) b.delete(k);
    }
  }
  return true;
}
