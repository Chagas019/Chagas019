"use client";
import { useEffect, useRef } from "react";
import { Plus, Trash2, ShieldCheck, ShieldAlert, Bot } from "lucide-react";
import type { SermonOutline, VerifiedRef } from "@/lib/ai/schema";
import { TIPO_LABEL } from "@/lib/ai/schema";
import { ExtLink } from "@/components/ui/primitives";

function AutoText({ value, onChange, className = "", label, serif = false }: { value: string; onChange: (v: string) => void; className?: string; label: string; serif?: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }, [value]);
  return (
    <>
      <textarea ref={ref} aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} rows={1}
        className={`print:hidden w-full resize-none rounded-lg border border-transparent bg-transparent p-1 -m-1 leading-relaxed text-ink hover:border-ivory-300 focus:border-royal-300 focus:bg-white focus:outline-none ${serif ? "font-serif" : ""} ${className}`} />
      <div className={`hidden whitespace-pre-wrap print:block ${serif ? "font-serif" : ""} ${className}`}>{value}</div>
    </>
  );
}

function Section({ n, title, children, ai = true }: { n: number; title: string; children: React.ReactNode; ai?: boolean }) {
  return (
    <section className="break-inside-avoid border-t border-ivory-300/70 py-6 first:border-t-0">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-royal-900 text-xs font-semibold text-gold-300 print:border print:border-royal-900 print:bg-white print:text-royal-900">{n}</span>
        <h3 className="font-serif text-xl text-royal-900">{title}</h3>
        {ai && <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-royal-50 px-2 py-0.5 text-[11px] text-royal-700 print:hidden" title="Texto gerado: revise antes de usar"><Bot className="h-3 w-3" /> Texto gerado · editável</span>}
      </div>
      {children}
    </section>
  );
}

function RefList({ items }: { items: VerifiedRef[] }) {
  if (!items.length) return <p className="text-sm text-ink-mute">Nenhuma referência.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((r, i) => (
        <li key={i} className="rounded-xl border border-ivory-300/70 bg-ivory-50 p-3.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {r.status !== "nao-verificada"
              ? <ShieldCheck className={`h-4 w-4 ${r.status === "verificada" ? "text-emerald-700" : "text-sky-700"}`} aria-label={r.status === "verificada" ? "Verificada" : "Capítulo conferido"} />
              : <ShieldAlert className="h-4 w-4 text-amber-700" aria-label="Não verificada" />}
            <span className="font-semibold text-royal-900">{r.label}</span>
            {r.status === "nao-verificada" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">não verificada</span>}
            {r.status === "capitulo" && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-900">versículos a conferir</span>}
            {r.url && <ExtLink href={r.url} className="ml-auto text-xs">Abrir fonte</ExtLink>}
          </div>
          {r.note && <p className="mt-1.5 leading-relaxed text-ink-soft">{r.note}</p>}
          {r.detail && !r.detail.startsWith("http") && <p className="mt-1 text-xs text-ink-mute">{r.detail}</p>}
          {r.detail?.startsWith("http") && <ExtLink href={r.detail} className="mt-1 text-xs">Buscar no YouTube</ExtLink>}
        </li>
      ))}
    </ul>
  );
}

function ListEdit({ items, onChange, label, ordered = false }: { items: string[]; onChange: (v: string[]) => void; label: string; ordered?: boolean }) {
  return (
    <div>
      <ol className={`space-y-2 ${ordered ? "list-decimal" : "list-disc"} pl-5 marker:text-gold-500`}>
        {items.map((it, i) => (
          <li key={i} className="group">
            <div className="flex items-start gap-2">
              <div className="flex-1"><AutoText label={`${label} ${i + 1}`} value={it} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} /></div>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remover item ${i + 1}`} className="rounded p-1 text-ink-mute opacity-0 hover:text-wine-500 group-hover:opacity-100 focus:opacity-100 print:hidden"><Trash2 className="h-4 w-4" /></button>
            </div>
          </li>
        ))}
      </ol>
      <button type="button" onClick={() => onChange([...items, ""])} className="mt-2 inline-flex items-center gap-1 text-sm text-royal-700 hover:underline print:hidden"><Plus className="h-4 w-4" /> Adicionar</button>
    </div>
  );
}

export function OutlineEditor({ outline, onChange }: { outline: SermonOutline; onChange: (o: SermonOutline) => void }) {
  const set = <K extends keyof SermonOutline>(k: K, v: SermonOutline[K]) => onChange({ ...outline, [k]: v });
  const b = outline.brief;
  let n = 0;
  return (
    <article id="roteiro" className="rounded-3xl border border-ivory-300/70 bg-white px-6 py-8 shadow-card sm:px-10 print:border-0 print:p-0 print:shadow-none">
      <header className="mb-4 border-b border-gold-300/70 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">{TIPO_LABEL[b.tipo]} · {b.publico} · {b.duracao} min</p>
        <AutoText serif label="Título" value={outline.titulo} onChange={(v) => set("titulo", v)} className="mt-2 text-3xl leading-tight text-royal-900 sm:text-4xl" />
        {outline.titulos_alternativos.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 print:hidden">
            <span className="text-xs text-ink-mute">Outras propostas:</span>
            {outline.titulos_alternativos.map((t) => <button key={t} type="button" onClick={() => set("titulo", t)} className="rounded-full border border-ivory-300 px-3 py-1 text-xs text-ink-soft hover:border-royal-300">{t}</button>)}
          </div>
        )}
      </header>

      <Section n={++n} title="Objetivo central"><AutoText label="Objetivo central" value={outline.objetivo_central} onChange={(v) => set("objetivo_central", v)} /></Section>
      <Section n={++n} title="Introdução"><AutoText label="Introdução" value={outline.introducao} onChange={(v) => set("introducao", v)} /></Section>
      <Section n={++n} title="Fundamentação bíblica" ai={false}><RefList items={outline.fundamentacao_biblica} /></Section>
      <Section n={++n} title="Contextualização da passagem"><AutoText label="Contextualização" value={outline.contextualizacao} onChange={(v) => set("contextualizacao", v)} /></Section>
      <Section n={++n} title="Desenvolvimento">
        <div className="space-y-5">
          {outline.desenvolvimento.map((t, i) => (
            <div key={i} className="rounded-2xl bg-ivory-50 p-4 print:bg-white print:p-0">
              <AutoText serif label={`Tópico ${i + 1}`} value={t.topico} onChange={(v) => set("desenvolvimento", outline.desenvolvimento.map((x, j) => (j === i ? { ...x, topico: v } : x)))} className="text-lg font-semibold text-royal-900" />
              <AutoText label={`Conteúdo do tópico ${i + 1}`} value={t.conteudo} onChange={(v) => set("desenvolvimento", outline.desenvolvimento.map((x, j) => (j === i ? { ...x, conteudo: v } : x)))} className="mt-2" />
              {t.referencias.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {t.referencias.map((r, k) => (
                    <span key={k} title={r.detail} className={`rounded-full px-2 py-0.5 ${r.status === "verificada" ? "bg-emerald-50 text-emerald-800" : r.status === "capitulo" ? "bg-sky-50 text-sky-900" : "bg-amber-50 text-amber-900"}`}>{r.label}{r.status === "nao-verificada" ? " (não verificada)" : ""}</span>
                  ))}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>
      <Section n={++n} title="Referências ao Catecismo" ai={false}><RefList items={outline.catecismo} /></Section>
      <Section n={++n} title="Documentos da Igreja e santos" ai={false}>
        <RefList items={outline.documentos} />
        {outline.santos.length > 0 && <div className="mt-4"><p className="mb-2 text-sm font-semibold text-royal-900">Santos</p><RefList items={outline.santos} /></div>}
      </Section>
      <Section n={++n} title="Aplicações práticas"><ListEdit label="Aplicação" items={outline.aplicacoes_praticas} onChange={(v) => set("aplicacoes_praticas", v)} /></Section>
      <Section n={++n} title="Perguntas para reflexão"><ListEdit ordered label="Pergunta" items={outline.perguntas_reflexao} onChange={(v) => set("perguntas_reflexao", v)} /></Section>
      <Section n={++n} title="Conclusão"><AutoText label="Conclusão" value={outline.conclusao} onChange={(v) => set("conclusao", v)} /></Section>
      <Section n={++n} title="Sugestões de músicas" ai={false}><RefList items={outline.musicas} /></Section>

      {outline.avisos.length > 0 && (
        <aside className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-sm text-amber-950">
          <p className="mb-2 font-semibold">Avisos</p>
          <ul className="list-disc space-y-1 pl-5">{outline.avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </aside>
      )}
      <footer className="mt-6 border-t border-ivory-300/70 pt-4 text-xs leading-relaxed text-ink-mute">
        Preparado com o VERBUM em {new Date(outline.generatedAt).toLocaleDateString("pt-BR")} ({outline.model}). As seções marcadas como “texto gerado” são explicações e sugestões, não citações; fontes verificadas trazem link para o texto original.
        Pregação, formação e testemunho distinguem-se da homilia litúrgica, reservada ao ministro ordenado na Santa Missa (CIC cân. 767 §1).
      </footer>
    </article>
  );
}
