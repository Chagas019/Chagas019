import "server-only";
import { serverEnv } from "@/lib/env";

export type VideoResult = {
  id: string;
  title: string;
  channel: string;
  url: string;
  thumbnail: string | null;
  publishedAt: string;
  durationSeconds: number | null;
};

export type VideoDuration = "any" | "short" | "medium" | "long";

export class IntegrationMissingError extends Error {}

function parseIsoDuration(d: string | undefined): number | null {
  const m = d?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Busca vídeos reais na YouTube Data API v3 (nada é inventado: só o que a API devolve). */
export async function searchYouTube(q: string, opts: { duration?: VideoDuration; max?: number } = {}): Promise<VideoResult[]> {
  if (!serverEnv.youtubeKey) throw new IntegrationMissingError("YOUTUBE_API_KEY não configurada");
  const params = new URLSearchParams({
    part: "snippet", type: "video", q, maxResults: String(Math.min(opts.max ?? 12, 25)),
    regionCode: "BR", relevanceLanguage: "pt", safeSearch: "strict", key: serverEnv.youtubeKey,
  });
  if (opts.duration && opts.duration !== "any") params.set("videoDuration", opts.duration);
  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`YouTube respondeu ${res.status}`);
  const data = (await res.json()) as { items?: { id: { videoId: string }; snippet: { title: string; channelTitle: string; publishedAt: string; thumbnails?: { medium?: { url: string } } } }[] };
  const items = data.items ?? [];
  const ids = items.map((i) => i.id.videoId).filter(Boolean);
  const durations = new Map<string, number | null>();
  if (ids.length) {
    const dres = await fetch(`https://www.googleapis.com/youtube/v3/videos?${new URLSearchParams({ part: "contentDetails", id: ids.join(","), key: serverEnv.youtubeKey })}`, { next: { revalidate: 3600 } });
    if (dres.ok) {
      const d = (await dres.json()) as { items?: { id: string; contentDetails: { duration: string } }[] };
      for (const v of d.items ?? []) durations.set(v.id, parseIsoDuration(v.contentDetails.duration));
    }
  }
  return items.map((i) => ({
    id: i.id.videoId,
    title: decode(i.snippet.title),
    channel: decode(i.snippet.channelTitle),
    url: `https://www.youtube.com/watch?v=${i.id.videoId}`,
    thumbnail: i.snippet.thumbnails?.medium?.url ?? null,
    publishedAt: i.snippet.publishedAt,
    durationSeconds: durations.get(i.id.videoId) ?? null,
  }));
}
