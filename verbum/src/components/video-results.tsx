"use client";
import { useEffect, useState } from "react";
import { Clock, CirclePlay, Loader2 } from "lucide-react";
import { ExtLink, Notice } from "./ui/primitives";
import { SaveButton } from "./ui/save-button";

type Video = { id: string; title: string; channel: string; url: string; thumbnail: string | null; publishedAt: string; durationSeconds: number | null };
type Resp = { configured: boolean; videos: Video[]; fallbackUrl?: string; error?: string; query: string };

export function fmtDuration(s: number | null) {
  if (s == null) return "";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}:${String(sec).padStart(2, "0")}`;
}

export function VideoResults({ q, tipo = "pregacao", duracao = "any", max }: { q: string; tipo?: "pregacao" | "musica"; duracao?: string; max?: number }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) return;
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/videos?${new URLSearchParams({ q, tipo, duracao })}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: Resp) => setData(d))
      .catch((e) => { if (e.name !== "AbortError") setData({ configured: true, videos: [], error: "Falha de conexão.", query: q }); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [q, tipo, duracao]);

  if (!q.trim()) return null;
  if (loading) return <p className="flex items-center gap-2 text-sm text-ink-mute"><Loader2 className="h-4 w-4 animate-spin" /> Buscando vídeos no YouTube…</p>;
  if (!data) return null;

  if (!data.configured) {
    return (
      <Notice title="Busca de vídeos ainda não configurada">
        A integração com o YouTube não está ativa neste servidor, então não listamos vídeos aqui para não exibir nada que não tenha sido conferido.{" "}
        {data.fallbackUrl && <ExtLink href={data.fallbackUrl}>Abrir esta busca diretamente no YouTube</ExtLink>}
      </Notice>
    );
  }
  if (data.error) return <Notice tone="warn" title="Não foi possível buscar agora">{data.error} {data.fallbackUrl && <ExtLink href={data.fallbackUrl}>Buscar no YouTube</ExtLink>}</Notice>;
  if (!data.videos.length) return <p className="text-sm text-ink-mute">Nenhum vídeo encontrado para “{q}”.</p>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.videos.slice(0, max ?? 12).map((v) => (
        <article key={v.id} className="flex flex-col overflow-hidden rounded-2xl border border-ivory-300/70 bg-white shadow-card">
          <a href={v.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-video bg-royal-900">
            {v.thumbnail && /* eslint-disable-next-line @next/next/no-img-element */ <img src={v.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover" />}
            {v.durationSeconds != null && <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs text-white">{fmtDuration(v.durationSeconds)}</span>}
          </a>
          <div className="flex flex-1 flex-col gap-2 p-4">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-royal-900">{v.title}</h3>
            <p className="text-xs text-ink-mute">{v.channel} · {new Date(v.publishedAt).toLocaleDateString("pt-BR")}</p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <ExtLink href={v.url}><CirclePlay className="h-3.5 w-3.5" /> Assistir</ExtLink>
              <SaveButton compact item={{ kind: "video", ref_id: v.id, title: v.title, subtitle: v.channel, url: v.url, payload: { thumbnail: v.thumbnail, durationSeconds: v.durationSeconds } }} />
            </div>
          </div>
        </article>
      ))}
      <p className="col-span-full flex items-center gap-1.5 text-xs text-ink-mute"><Clock className="h-3.5 w-3.5" /> Resultados fornecidos pela API do YouTube. Confira o conteúdo e o canal antes de recomendar.</p>
    </div>
  );
}
