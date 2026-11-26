"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Music2, Search, CirclePlay } from "lucide-react";
import { SONGS, youtubeSearchUrl } from "@/data/catalog";
import { MUSIC_THEMES, themeLabel } from "@/data/themes";
import { normalize } from "@/lib/search";
import { Chip, EmptyState, ExtLink, Notice, PageHeader, VerifiedBadge, inputCls } from "@/components/ui/primitives";
import { SaveButton } from "@/components/ui/save-button";
import { ThemeArt } from "@/components/theme-art";
import { VideoResults } from "@/components/video-results";

const CONTEXTS = Array.from(new Set(SONGS.flatMap((s) => s.contexts))).sort();

export function MusicView() {
  const params = useSearchParams();
  const [theme, setTheme] = useState<string | null>(params.get("tema"));
  const [ctx, setCtx] = useState<string>("");
  const [text, setText] = useState(params.get("q") ?? "");
  const [moreVideos, setMoreVideos] = useState(false);

  const list = useMemo(() => {
    const t = normalize(text);
    return SONGS.filter((s) => (!theme || s.themes.includes(theme)) && (!ctx || s.contexts.includes(ctx)) && (!t || normalize(`${s.title} ${s.artist}`).includes(t)))
      .sort((a, b) => (theme ? (a.themes[0] === theme ? -1 : 0) - (b.themes[0] === theme ? -1 : 0) : 0) || a.title.localeCompare(b.title, "pt-BR"));
  }, [theme, ctx, text]);

  return (
    <div>
      <PageHeader eyebrow="Buscador de músicas" title="A canção certa para cada momento" description="Músicas católicas conferidas no Spotify, organizadas por tema e momento do encontro. Não reproduzimos letras: ouça a gravação original." />

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
          <label htmlFor="filtro-musica" className="sr-only">Filtrar por título ou artista</label>
          <input id="filtro-musica" value={text} onChange={(e) => setText(e.target.value)} placeholder="Título ou artista" className={`${inputCls} pl-10`} />
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          Momento
          <select value={ctx} onChange={(e) => setCtx(e.target.value)} className="rounded-xl border border-ivory-300 bg-white px-3 py-2.5 text-sm text-ink">
            <option value="">Todos</option>
            {CONTEXTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        <Chip active={!theme} onClick={() => setTheme(null)}>Todos os temas</Chip>
        {MUSIC_THEMES.map((t) => <Chip key={t.id} active={theme === t.id} onClick={() => setTheme(t.id)}>{t.label}</Chip>)}
      </div>

      <p className="mb-4 text-sm text-ink-mute" aria-live="polite">{list.length} música(s){theme ? ` em ${themeLabel(theme)}` : ""}</p>

      {list.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((s) => (
            <article key={s.id} className="flex flex-col overflow-hidden rounded-2xl border border-ivory-300/70 bg-white shadow-card">
              <ThemeArt theme={s.themes[0]} className="h-24 rounded-none" label={`Tema: ${themeLabel(s.themes[0])}`} />
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-lg leading-snug text-royal-900">{s.title}</h3>
                    <p className="text-sm text-ink-soft">{s.artist}</p>
                  </div>
                  <SaveButton compact item={{ kind: "song", ref_id: s.id, title: s.title, subtitle: s.artist, url: s.spotifyUrl, payload: { themes: s.themes } }} />
                </div>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                  <dt className="text-ink-mute">Tema</dt><dd className="text-ink">{s.themes.map(themeLabel).join(", ")}</dd>
                  <dt className="text-ink-mute">Momento</dt><dd className="text-ink">{s.contexts.join(", ")}</dd>
                </dl>
                <p className="rounded-xl bg-ivory-100 p-3 text-sm leading-relaxed text-ink-soft"><span className="font-semibold text-royal-800">Por que combina: </span>{s.rationale}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                  <ExtLink href={s.spotifyUrl}><Music2 className="h-3.5 w-3.5" /> Spotify</ExtLink>
                  <ExtLink href={youtubeSearchUrl(`${s.title} ${s.artist}`)}><CirclePlay className="h-3.5 w-3.5" /> Buscar no YouTube</ExtLink>
                  <VerifiedBadge label="Faixa conferida" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<Music2 className="h-8 w-8" />} title="Nenhuma música com esses filtros">Remova um filtro ou tente outro tema.</EmptyState>
      )}

      <section className="mt-14">
        <h2 className="font-serif text-2xl text-royal-900">Procurar mais no YouTube</h2>
        <p className="mt-1 text-sm text-ink-soft">Busca em tempo real de vídeos de música católica{theme ? ` sobre ${themeLabel(theme)}` : ""}.</p>
        <div className="mt-4">
          {moreVideos ? <VideoResults q={text || (theme ? themeLabel(theme) : "louvor")} tipo="musica" /> : (
            <button onClick={() => setMoreVideos(true)} className="rounded-full border border-ivory-300 bg-white px-5 py-2.5 text-sm font-semibold text-royal-800 hover:border-royal-300">Buscar vídeos</button>
          )}
        </div>
        <div className="mt-6"><Notice>A justificativa de cada música é uma indicação editorial do VERBUM, feita a partir do título e do tema da canção. Ouça a música antes de usá-la no encontro.</Notice></div>
      </section>
    </div>
  );
}
