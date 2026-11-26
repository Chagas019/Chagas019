import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

/** Identificador anônimo do cliente (hash do IP) para limitação de requisições. */
export async function clientKey() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}
