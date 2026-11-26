import { promises as fs } from "node:fs";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { localPrivatePath, verifyLocalFileToken } from "@/lib/storage";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = { xmp: "application/rdf+xml", zip: "application/zip", dng: "image/x-adobe-dng", cube: "text/plain", "3dl": "text/plain" };

/** MODO LOCAL: entrega um arquivo privado mediante token HMAC válido e não expirado (equivale à URL assinada do Supabase). */
export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  if (config.backend !== "local") return new NextResponse("Not found", { status: 404 });
  const { token } = await params;
  const data = verifyLocalFileToken(decodeURIComponent(token));
  if (!data) return NextResponse.json({ error: "Link de download inválido ou expirado." }, { status: 403 });
  const full = localPrivatePath(data.path);
  if (!full) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  try {
    const body = await fs.readFile(full);
    const ext = data.name.split(".").pop()?.toLowerCase() ?? "";
    const name = data.name.replace(/[^\w.\- ]/g, "_");
    return new NextResponse(body, {
      headers: {
        "content-type": TYPES[ext] ?? "application/octet-stream",
        "content-disposition": `attachment; filename="${name}"`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  }
}
