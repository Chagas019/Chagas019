import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { localMediaDir, resolveSafe } from "@/lib/storage";

export const dynamic = "force-dynamic";
const TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };

/** MODO LOCAL: serve imagens públicas enviadas pelo Admin Studio (equivale ao bucket público "media"). */
export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (config.backend !== "local") return new NextResponse("Not found", { status: 404 });
  const { path } = await params;
  const full = resolveSafe(localMediaDir(), path.join("/"));
  const type = TYPES[path.at(-1)?.split(".").pop()?.toLowerCase() ?? ""];
  if (!full || !type) return new NextResponse("Not found", { status: 404 });
  try {
    return new NextResponse(await fs.readFile(full), { headers: { "content-type": type, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
