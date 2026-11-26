"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Mic2, CirclePlay, Globe } from "lucide-react";
import { PREACHERS, FORMATION_PORTALS } from "@/data/preachers";
import { THEMES, themeLabel } from "@/data/themes";
import { youtubeSearchUrl } from "@/data/catalog";
import { Card, Chip, ExtLink, PageHeader, inputCls, Button } from "@/components/ui/primitives";
import { SaveButton } from "@/components/ui/save-button";
import { VideoResults } from "@/components/video-results";
import { useApp } from "@/components/providers";

const DURATIONS = [
  { v: "any", l: "Qualquer duração" },
  { v: "short", l: "Até 4 min" },
  { v: "medium", l: "4 a 20 min" },
  { v: "long", l: "Mais de 20 min" },
];

export function SermonsView() {
  const params = useSearchParams();
  const router = useRouter();
  const { store } = useApp();
  const [assunto, setAssunto] = useState(params.get("q") ?? "");
  const [pregador, setPregador] = useState(params.get("pregador") ?? "");
  const [duracao, setDuracao] = useState(params.get("duracao") ?? "any");
  const query = [assunto, pregador].filter(Boolean).join(" ");
  const [submitted, setSubmitted] = useState(query);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const q = [assunto, pregador].filter(Boolean).join(" ").trim();
    if (!q) return;
    setSubmitted(q);
    store.addHistory(q, "pregacoes", 0).catch(() => {});
    router.replace(`/pregacoes?${new URLSearchParams({ q: assunto, pregador, duracao })}`, { scroll: false });
  }

  return (
    <div>
      <PageHeader eyebrow="Biblioteca de pregações" title="Ouça quem já anunciou este tema" description="Encontre pregações e palestras católicas por assunto, pregador, palavra-chave e duração. Os vídeos vêm diretamente do YouTube: nada aqui é inventado." />

      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-2xl border border-ivory-300/70 bg-white/80 p-4 shadow-card md:grid-cols-[2fr_1.5fr_1fr_auto]">
        <div><label htmlFor="assunto" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-mute">Assunto ou palavra-chave</label>
          <input id="assunto" className={inputCls} value={assunto} onChange={(e) => setAssunto(e.target.value)} placeholder="ex.: perdão, Pentecostes, família" /></div>
        <div><label htmlFor="pregador" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-mute">Pregador</label>
          <input id="pregador" list="lista-pregadores" className={inputCls} value={pregador} onChange={(e) => setPregador(e.target.value)} placeholder="Qualquer pregador" />
          <datalist id="lista-pregadores">{PREACHERS.map((p) => <option key={p.id} value={p.name} />)}</datalist></div>
        <div><label htmlFor="duracao" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-mute">Duração</label>
          <select id="duracao" className={inputCls} value={duracao} onChange={(e) => setDuracao(e.target.value)}>{DURATIONS.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}</select></div>
        <Button type="submit" className="self-end">Buscar</Button>
      </form>

      <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
        {THEMES.slice(0, 14).map((t) => <Chip key={t.id} active={assunto === t.label} onClick={() => { setAssunto(t.label); setSubmitted([t.label, pregador].filter(Boolean).join(" ")); }}>{t.label}</Chip>)}
      </div>

      {submitted && (
        <section className="mb-14">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-2xl text-royal-900">Resultados para “{submitted}”</h2>
            <ExtLink href={youtubeSearchUrl(`${submitted} pregação católica`)}>Ver mais no YouTube</ExtLink>
          </div>
          <VideoResults q={submitted} duracao={duracao} />
        </section>
      )}

      <section>
        <h2 className="mb-1 font-serif text-2xl text-royal-900">Pregadores de referência</h2>
        <p className="mb-5 text-sm text-ink-soft">Atalhos para buscar as pregações de cada um. Descrições resumidas; confira sempre o canal oficial.</p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {PREACHERS.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-royal-900 font-serif text-gold-300">{p.name.replace(/^(Padre|Frei|Monsenhor)\s/, "").charAt(0)}</span>
                  <h3 className="font-serif text-lg text-royal-900">{p.name}</h3>
                </div>
                <SaveButton compact item={{ kind: "preacher", ref_id: p.id, title: p.name, subtitle: p.description, url: p.officialUrl ?? youtubeSearchUrl(`${p.name} pregação`) }} />
              </div>
              <p className="text-sm text-ink-soft">{p.description}</p>
              <p className="text-xs text-ink-mute">Temas frequentes: {p.themes.map(themeLabel).join(", ")}</p>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-2">
                <button className="inline-flex items-center gap-1 text-sm font-medium text-royal-700 hover:underline" onClick={() => { setPregador(p.name); setSubmitted([assunto, p.name].filter(Boolean).join(" ")); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  <Mic2 className="h-3.5 w-3.5" /> Ver pregações aqui
                </button>
                <ExtLink href={youtubeSearchUrl(`${p.name} pregação`)}><CirclePlay className="h-3.5 w-3.5" /> YouTube</ExtLink>
                {p.officialUrl && <ExtLink href={p.officialUrl}><Globe className="h-3.5 w-3.5" /> Site oficial</ExtLink>}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="mb-4 font-serif text-2xl text-royal-900">Portais de formação</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATION_PORTALS.map((f) => (
            <li key={f.url} className="rounded-2xl border border-ivory-300 bg-white/70 p-4">
              <ExtLink href={f.url} className="text-base">{f.name}</ExtLink>
              <p className="mt-1 text-sm text-ink-soft">{f.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
