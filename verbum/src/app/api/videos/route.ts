import { NextResponse, type NextRequest } from "next/server";
import { searchYouTube, IntegrationMissingError, type VideoDuration } from "@/lib/youtube";
import { youtubeSearchUrl } from "@/data/catalog";
import { allow, clientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 150);
  const kind = req.nextUrl.searchParams.get("tipo") === "musica" ? "música católica" : "pregação católica";
  const d = req.nextUrl.searchParams.get("duracao") as VideoDuration | null;
  const duration: VideoDuration = d && ["any", "short", "medium", "long"].includes(d) ? d : "any";
  if (!q) return NextResponse.json({ error: "Informe o que deseja buscar." }, { status: 400 });
  const query = `${q} ${kind}`;
  if (!allow("videos", clientIp(req), 40, 3_600_000)) {
    return NextResponse.json({ configured: true, videos: [], error: "Muitas buscas de vídeo nesta hora. Use o link direto do YouTube.", fallbackUrl: youtubeSearchUrl(query), query }, { status: 429 });
  }
  try {
    const videos = await searchYouTube(query, { duration });
    return NextResponse.json({ configured: true, videos, query });
  } catch (e) {
    if (e instanceof IntegrationMissingError) {
      return NextResponse.json({ configured: false, videos: [], fallbackUrl: youtubeSearchUrl(query), query });
    }
    return NextResponse.json({ configured: true, videos: [], error: "A busca no YouTube falhou agora. Tente novamente em instantes.", fallbackUrl: youtubeSearchUrl(query), query }, { status: 502 });
  }
}
