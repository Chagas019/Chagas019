"use client";
import { useMemo, useState } from "react";
import { BookOpen, ScrollText, Landmark, Feather, Search } from "lucide-react";
import { SOURCES, KIND_LABEL, CATECHISM_URL, BIBLE_SITE_NAME, bibleChapterUrl, parseReference, type SourceKind } from "@/data/catalog";
import { BIBLE_BOOKS } from "@/data/bible-books";
import { CATECHISM_REFS } from "@/data/catechism";
import { FIXED_CELEBRATIONS } from "@/data/saints";
import { themeLabel } from "@/data/themes";
import { normalize } from "@/lib/search";
import { Chip, ExtLink, Notice, PageHeader, VerifiedBadge, inputCls } from "@/components/ui/primitives";
import { SaveButton } from "@/components/ui/save-button";

type Tab = "documentos" | "biblia" | "catecismo" | "santos";
const KINDS: SourceKind[] = ["concilio", "enciclica", "exortacao", "carta-apostolica", "bula", "instrucao", "direito", "catecismo", "cnbb", "celam"];

const FATHERS = ["Inácio de Antioquia", "Policarpo", "Justino", "Irineu", "Cipriano", "Atanásio", "Basílio Magno", "Gregório Nazianzeno", "João Crisóstomo", "Ambrósio", "Jerônimo", "Agostinho", "Leão Magno", "Gregório Magno"];
const DOCTORS = FIXED_CELEBRATIONS.filter((f) => /doutor/i.test(f.name));

export function LibraryView() {
  const [tab, setTab] = useState<Tab>("documentos");
  const [kind, setKind] = useState<SourceKind | null>(null);
  const [q, setQ] = useState("");

  const docs = useMemo(() => {
    const t = normalize(q);
    return SOURCES.filter((s) => (!kind || s.kind === kind) && (!t || normalize(`${s.title} ${s.author} ${s.context} ${s.themes.join(" ")}`).includes(t)))
      .sort((a, b) => b.year - a.year);
  }, [kind, q]);

  return (
    <div>
      <PageHeader eyebrow="Biblioteca teológica" title="As fontes da fé, com o texto oficial a um clique" description="Aqui ficam o título, o autor, o contexto e o link de cada documento. O texto em si você lê na fonte oficial: assim nenhuma citação é reproduzida de memória." />

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Seções da biblioteca">
        {([["documentos", "Documentos da Igreja", ScrollText], ["biblia", "Bíblia Sagrada", BookOpen], ["catecismo", "Catecismo", Landmark], ["santos", "Padres e Doutores", Feather]] as const).map(([id, label, Icon]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${tab === id ? "bg-royal-800 text-ivory-50" : "bg-white/70 text-ink-soft hover:bg-white"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "documentos" && (
        <section role="tabpanel">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative md:w-96">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" />
              <label htmlFor="filtro-doc" className="sr-only">Filtrar documentos</label>
              <input id="filtro-doc" className={`${inputCls} pl-10`} placeholder="Filtrar por título, papa ou assunto" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Chip active={!kind} onClick={() => setKind(null)}>Todos</Chip>
              {KINDS.filter((k) => SOURCES.some((s) => s.kind === k)).map((k) => <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{KIND_LABEL[k]}</Chip>)}
            </div>
          </div>
          <p className="mb-4 text-sm text-ink-mute">{docs.length} documento(s)</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {docs.map((d) => (
              <article key={d.id} className="flex flex-col gap-2 rounded-2xl border border-ivory-300/70 bg-white/85 p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold-700">{KIND_LABEL[d.kind]} · {d.year}</p>
                  <SaveButton compact item={{ kind: "source", ref_id: d.id, title: d.title, subtitle: `${d.author} (${d.year})`, url: d.url }} />
                </div>
                <h3 className="font-serif text-lg leading-snug text-royal-900">{d.title}</h3>
                <p className="text-sm text-ink-soft"><span className="text-ink-mute">Autor:</span> {d.author}</p>
                <p className="text-sm leading-relaxed text-ink-soft"><span className="text-ink-mute">Contexto:</span> {d.context}</p>
                {d.themeIds.length > 0 && <p className="text-xs text-ink-mute">Útil para: {d.themeIds.map(themeLabel).join(", ")}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-4 pt-2">
                  <ExtLink href={d.url}>Ler o texto oficial</ExtLink>
                  <span className="text-xs text-ink-mute">{new URL(d.url).hostname.replace("www.", "")}</span>
                  <VerifiedBadge verified={d.verified} label="Link conferido" />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {tab === "biblia" && (
        <section role="tabpanel">
          <Notice>
            O VERBUM não reproduz o texto bíblico. Use a sua tradução católica (CNBB, Ave-Maria, Jerusalém, Pastoral…).
            {BIBLE_SITE_NAME && <> Para alguns livros há link direto para o capítulo em {BIBLE_SITE_NAME} (tradução Ave-Maria).</>}
          </Notice>
          {(["AT", "NT"] as const).map((t) => (
            <div key={t} className="mt-8">
              <h2 className="mb-3 font-serif text-2xl text-royal-900">{t === "AT" ? "Antigo Testamento" : "Novo Testamento"} <span className="text-base text-ink-mute">({BIBLE_BOOKS.filter((b) => b.testament === t).length} livros)</span></h2>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {BIBLE_BOOKS.filter((b) => b.testament === t).map((b) => {
                  const url = bibleChapterUrl(parseReference(`${b.abbr} 1`)!);
                  return (
                    <li key={b.abbr} className="rounded-xl border border-ivory-300/70 bg-white/80 px-3 py-2.5">
                      <p className="text-sm font-semibold text-royal-900">{b.name}</p>
                      <p className="text-xs text-ink-mute">{b.abbr} · {b.chapters} cap.</p>
                      {url && <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-royal-700 hover:underline">Ler cap. 1 ↗</a>}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>
      )}

      {tab === "catecismo" && (
        <section role="tabpanel">
          <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl bg-royal-900 p-6 text-ivory-50">
            <div className="flex-1">
              <p className="font-serif text-2xl">Catecismo da Igreja Católica</p>
              <p className="mt-1 text-sm text-royal-100">Promulgado por São João Paulo II (1992). Quatro partes: a profissão da fé, os sacramentos, a vida em Cristo e a oração.</p>
            </div>
            {CATECHISM_URL && <a href={CATECHISM_URL} target="_blank" rel="noopener noreferrer" className="rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gold-700">Abrir no vatican.va ↗</a>}
          </div>
          <h2 className="mb-3 font-serif text-xl text-royal-900">Índice temático para pregadores</h2>
          <div className="overflow-hidden rounded-2xl border border-ivory-300/70 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory-200/70 text-xs uppercase tracking-wider text-ink-mute"><tr><th className="px-4 py-3">Parágrafos</th><th className="px-4 py-3">Seção</th><th className="hidden px-4 py-3 md:table-cell">Temas</th><th className="px-4 py-3"><span className="sr-only">Salvar</span></th></tr></thead>
              <tbody>
                {CATECHISM_REFS.map((c) => (
                  <tr key={c.id} className="border-t border-ivory-200">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-royal-800">§§ {c.paragraphs}</td>
                    <td className="px-4 py-3 text-ink">{c.title}</td>
                    <td className="hidden px-4 py-3 text-ink-mute md:table-cell">{c.themes.map(themeLabel).join(", ")}</td>
                    <td className="px-4 py-3 text-right"><SaveButton compact item={{ kind: "catechism", ref_id: c.id, title: `CIC §§ ${c.paragraphs}`, subtitle: c.title, url: CATECHISM_URL }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "santos" && (
        <section role="tabpanel" className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="mb-2 font-serif text-2xl text-royal-900">Padres da Igreja</h2>
            <p className="mb-4 text-sm text-ink-soft">Os grandes mestres dos primeiros séculos. Trechos de seus escritos aparecem no Ofício das Leituras da Liturgia das Horas; obras completas em português estão, por exemplo, na coleção Patrística (Paulus).</p>
            <ul className="grid gap-2 sm:grid-cols-2">{FATHERS.map((f) => <li key={f} className="rounded-xl border border-ivory-300/70 bg-white/80 px-4 py-2.5 text-sm text-royal-900">{f}</li>)}</ul>
          </div>
          <div>
            <h2 className="mb-2 font-serif text-2xl text-royal-900">Doutores da Igreja no calendário</h2>
            <p className="mb-4 text-sm text-ink-soft">Santos proclamados doutores pela Igreja, com o dia em que são celebrados.</p>
            <ul className="space-y-2">{DOCTORS.map((d) => <li key={d.date + d.name} className="flex justify-between gap-3 rounded-xl border border-ivory-300/70 bg-white/80 px-4 py-2.5 text-sm"><span className="text-royal-900">{d.name}</span><span className="shrink-0 text-ink-mute">{d.date.split("-").reverse().join("/")}</span></li>)}</ul>
          </div>
          <div className="lg:col-span-2"><Notice>Não exibimos frases atribuídas a santos sem fonte conferível. Ao citar um santo, use uma edição confiável de suas obras.</Notice></div>
        </section>
      )}
    </div>
  );
}
