"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { History, Loader2, SearchX, Sparkles, X } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { ResultCard } from "@/components/result-card";
import { VideoResults } from "@/components/video-results";
import { Chip, EmptyState, PageHeader } from "@/components/ui/primitives";
import { useApp } from "@/components/providers";
import { CATEGORY_LABEL, type Category, type SearchResult } from "@/lib/search";
import { THEMES, themeLabel } from "@/data/themes";
import type { HistoryEntry } from "@/lib/store/types";

type Resp = { results: SearchResult[]; matchedThemes: string[]; reference: SearchResult | null };
const ORDER: Category[] = ["biblia", "catecismo", "documento", "musica", "pregacao", "santo", "tema"];

export function SearchView() {
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const { store } = useApp();
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);
  const [cat, setCat] = useState<Category | "tudo">("tudo");
  const [sort, setSort] = useState<"relevancia" | "titulo">("relevancia");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => { store.listHistory(8).then(setHistory).catch(() => {}); }, [store, data]);

  useEffect(() => {
    if (!q) { setData(null); return; }
    setLoading(true);
    setCat("tudo");
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d: Resp) => { setData(d); store.addHistory(q, "tudo", d.results.length).catch(() => {}); })
      .catch(() => setData({ results: [], matchedThemes: [], reference: null }))
      .finally(() => setLoading(false));
  }, [q, store]);

  const counts = useMemo(() => {
    const c: Partial<Record<Category, number>> = {};
    for (const r of data?.results ?? []) c[r.category] = (c[r.category] ?? 0) + 1;
    return c;
  }, [data]);

  const shown = useMemo(() => {
    let list = (data?.results ?? []).filter((r) => cat === "tudo" || r.category === cat);
    if (sort === "titulo") list = [...list].sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    return list;
  }, [data, cat, sort]);

  return (
    <div>
      <PageHeader eyebrow="Central de pesquisa" title="O que você vai pregar?" description="Pesquise por tema, passagem bíblica (ex.: Lc 15,11-32), santo, música ou documento da Igreja.">
        <SearchBox initial={q} />
      </PageHeader>

      {!q && (
        <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
          <section>
            <h2 className="mb-3 font-serif text-xl text-royal-900">Comece por um tema</h2>
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => <Chip key={t.id} href={`/pesquisa?q=${encodeURIComponent(t.label)}`}>{t.label}</Chip>)}
            </div>
          </section>
          <section aria-labelledby="hist">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="hist" className="flex items-center gap-2 font-serif text-xl text-royal-900"><History className="h-4 w-4 text-gold-500" /> Pesquisas recentes</h2>
              {history.length > 0 && <button className="text-xs text-ink-mute hover:text-royal-700" onClick={async () => { await store.clearHistory(); setHistory([]); }}>Limpar</button>}
            </div>
            {history.length ? (
              <ul className="space-y-1">
                {history.map((h) => (
                  <li key={h.id}><Link className="flex justify-between rounded-lg px-3 py-2 text-sm hover:bg-white" href={`/pesquisa?q=${encodeURIComponent(h.query)}`}><span>{h.query}</span><span className="text-ink-mute">{h.results_count}</span></Link></li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-mute">Suas pesquisas aparecerão aqui.</p>}
          </section>
        </div>
      )}

      {q && loading && <p className="flex items-center gap-2 text-ink-mute"><Loader2 className="h-4 w-4 animate-spin" /> Pesquisando…</p>}

      {q && data && !loading && (
        <>
          {data.matchedThemes.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-gold-300/60 bg-gold-100/40 p-4 text-sm">
              <span className="text-ink-soft">Temas reconhecidos:</span>
              {data.matchedThemes.map((t) => <span key={t} className="rounded-full bg-white px-3 py-1 font-medium text-royal-800">{themeLabel(t)}</span>)}
              <Link href={`/assistente?tema=${encodeURIComponent(q)}`} className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-royal-800 px-4 py-1.5 font-semibold text-ivory-50 hover:bg-royal-700">
                <Sparkles className="h-4 w-4 text-gold-300" /> Preparar pregação sobre isto
              </Link>
            </div>
          )}

          {data.reference && (
            <div className="mb-6"><ResultCard r={data.reference} /></div>
          )}

          <div className="sticky top-16 z-10 -mx-4 mb-6 flex items-center gap-2 overflow-x-auto bg-ivory-100/90 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
            <Chip active={cat === "tudo"} onClick={() => setCat("tudo")}>Tudo ({data.results.length})</Chip>
            {ORDER.filter((c) => counts[c]).map((c) => (
              <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{CATEGORY_LABEL[c]} ({counts[c]})</Chip>
            ))}
            <label className="ml-auto flex shrink-0 items-center gap-2 text-sm text-ink-mute">
              Ordenar
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-full border border-ivory-300 bg-white px-3 py-1.5 text-sm text-ink">
                <option value="relevancia">Relevância</option>
                <option value="titulo">Título (A–Z)</option>
              </select>
            </label>
            {cat !== "tudo" && <button aria-label="Limpar filtro" onClick={() => setCat("tudo")} className="rounded-full p-1.5 text-ink-mute hover:bg-white"><X className="h-4 w-4" /></button>}
          </div>

          {shown.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{shown.map((r) => <ResultCard key={r.id} r={r} />)}</div>
          ) : (
            <EmptyState icon={<SearchX className="h-8 w-8" />} title="Nada encontrado no catálogo verificado">
              Tente outro termo, um tema da lista ou uma referência bíblica. Não exibimos resultados que não possam ser conferidos.
            </EmptyState>
          )}

          {(cat === "tudo" || cat === "pregacao") && (
            <section className="mt-12">
              <h2 className="mb-4 font-serif text-2xl text-royal-900">Pregações em vídeo</h2>
              <VideoResults q={q} max={6} />
            </section>
          )}
        </>
      )}
    </div>
  );
}
