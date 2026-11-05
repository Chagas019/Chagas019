"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Clapperboard, Copy, Lightbulb, ListChecks, Palette, RefreshCw, Sparkles, WandSparkles } from "lucide-react";
import { CATEGORIES, DIFFICULTY_LABEL } from "@/lib/content/categories";
import { useUserData } from "@/lib/store";
import type { CategoryId, Difficulty, GeneratedIdea, IdeaRequest } from "@/lib/types";
import { PageHeader } from "@/components/ui/bits";
import { Button } from "@/components/ui/Button";

const WHAT = ["Ensaio fotográfico", "Cartaz", "Identidade visual", "Reels / vídeo curto", "Carrossel", "Campanha", "Capa de álbum", "Série autoral"];
const STYLES = ["Minimalista", "Vibrante", "Retrô", "Futurista", "Editorial", "Natural", "Sombrio"];
const AUDIENCES = ["Jovens criativos", "Marcas locais", "Público corporativo", "Comunidade musical", "Crianças e famílias", "Amantes de moda"];

function ideaToText(i: GeneratedIdea) {
  return [
    i.title.toUpperCase(),
    "",
    `CONCEITO\n${i.concept}`,
    "",
    `IDEIAS\n${i.ideas.map((x) => `• ${x}`).join("\n")}`,
    "",
    `DIREÇÃO DE ARTE\n${i.artDirection}`,
    "",
    `REFERÊNCIAS\n${i.references.map((x) => `• ${x}`).join("\n")}`,
    "",
    `PALETA\n${i.palette.map((p) => `${p.name} ${p.hex}`).join(" · ")}`,
    "",
    `EXECUÇÃO\n${i.execution.map((x, n) => `${n + 1}. ${x}`).join("\n")}`,
    i.script ? `\nROTEIRO\n${i.script.join("\n")}` : "",
  ].join("\n");
}

function Generator() {
  const params = useSearchParams();
  const { logIdeaGenerated, saveIdea, toast, data } = useUserData();
  const initialCat = (CATEGORIES.find((c) => c.id === params.get("categoria"))?.id ?? "design") as CategoryId;
  const [form, setForm] = useState<IdeaRequest>({
    what: params.get("tema") ?? "",
    category: initialCat,
    style: "Editorial",
    audience: "Jovens criativos",
    difficulty: "intermediario",
    extra: "",
  });
  const [idea, setIdea] = useState<GeneratedIdea | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const salt = useRef(0);
  const resultRef = useRef<HTMLDivElement>(null);

  const set = <K extends keyof IdeaRequest>(k: K, v: IdeaRequest[K]) => setForm((f) => ({ ...f, [k]: v }));

  const generate = async (again = false) => {
    setError(null);
    if (form.what.trim().length < 2) return setError("Conte o que você deseja criar.");
    if (again) salt.current += 1;
    setLoading(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, extra: form.extra || undefined, salt: salt.current }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Não foi possível gerar agora.");
      setIdea(json.idea);
      setNotice(json.notice ?? null);
      setSaved(false);
      logIdeaGenerated(json.idea.title).catch(() => null);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha de conexão.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.get("tema")) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <PageHeader
        eyebrow="Gerador de ideias · IA"
        title="Seu diretor criativo"
        accent="de bolso."
        description="Diga o que quer criar e para quem. O assistente devolve conceito, direção de arte, referências, paleta, passos de execução e roteiro quando fizer sentido."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
        <form
          className="card space-y-6 p-6 lg:sticky lg:top-12 lg:self-start"
          onSubmit={(e) => {
            e.preventDefault();
            salt.current = 0;
            generate();
          }}
        >
          <div>
            <label htmlFor="what" className="mb-2 block text-sm font-medium">
              O que você deseja criar?
            </label>
            <input id="what" className="field" value={form.what} onChange={(e) => set("what", e.target.value)} placeholder="Ex.: ensaio fotográfico sobre a cidade à noite" maxLength={160} />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WHAT.map((w) => (
                <button type="button" key={w} className="chip !py-1 !text-xs" data-active={form.what === w} onClick={() => set("what", w)}>
                  {w}
                </button>
              ))}
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Categoria do projeto</legend>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} className="chip !text-xs" data-active={form.category === c.id} onClick={() => set("category", c.id)} aria-pressed={form.category === c.id}>
                  {c.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Estilo visual</legend>
            <div className="flex flex-wrap gap-1.5">
              {STYLES.map((s) => (
                <button type="button" key={s} className="chip !text-xs" data-active={form.style === s} onClick={() => set("style", s)} aria-pressed={form.style === s}>
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="audience" className="mb-2 block text-sm font-medium">
              Público-alvo
            </label>
            <input id="audience" list="audiences" className="field" value={form.audience} onChange={(e) => set("audience", e.target.value)} maxLength={80} />
            <datalist id="audiences">
              {AUDIENCES.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Nível de dificuldade</legend>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
                <button type="button" key={d} className="chip justify-center !text-xs" data-active={form.difficulty === d} onClick={() => set("difficulty", d)} aria-pressed={form.difficulty === d}>
                  {DIFFICULTY_LABEL[d]}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="extra" className="mb-2 block text-sm font-medium">
              Detalhes <span className="font-normal text-mute">(opcional)</span>
            </label>
            <textarea id="extra" rows={3} className="field resize-none" value={form.extra} onChange={(e) => set("extra", e.target.value)} maxLength={400} placeholder="Restrições, prazo, equipamentos, sentimentos…" />
          </div>

          {error && (
            <p role="alert" className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-[#ffd5cb]">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {!loading && <WandSparkles className="size-4" />} {loading ? "Criando…" : "Gerar ideia"}
          </Button>
        </form>

        <div ref={resultRef} className="min-w-0 scroll-mt-24" aria-live="polite">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" className="card grid min-h-[480px] place-items-center p-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-center">
                  <div className="relative mx-auto mb-6 size-20">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="absolute inset-0 rounded-full border border-lime"
                        animate={{ scale: [0.4, 1.4], opacity: [0.9, 0] }}
                        transition={{ repeat: Infinity, duration: 1.8, delay: i * 0.6, ease: "easeOut" }}
                      />
                    ))}
                    <Sparkles className="absolute inset-0 m-auto size-6 text-lime" />
                  </div>
                  <p className="font-display text-xl">Conectando referências…</p>
                  <p className="mt-1 text-sm text-fog">Misturando conceito, cor e execução.</p>
                </div>
              </motion.div>
            ) : idea ? (
              <motion.article key={idea.title + salt.current} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                <div className="card grain overflow-hidden">
                  <div className="flex h-3">
                    {idea.palette.map((p) => (
                      <span key={p.hex} className="flex-1" style={{ background: p.hex }} />
                    ))}
                  </div>
                  <div className="p-6 sm:p-10">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="label flex items-center gap-2">
                        <Sparkles className="size-3.5 text-lime" /> {idea.source === "ia" ? "Gerado por IA" : "Motor criativo local"}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigator.clipboard?.writeText(ideaToText(idea)).then(
                              () => toast("Ideia copiada."),
                              () => toast("Não foi possível copiar.", "error"),
                            )
                          }
                        >
                          <Copy className="size-3.5" /> Copiar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => generate(true)}>
                          <RefreshCw className="size-3.5" /> Outra
                        </Button>
                        <Button
                          variant={saved ? "outline" : "primary"}
                          size="sm"
                          disabled={saved}
                          onClick={async () => {
                            await saveIdea(idea).catch(() => null);
                            setSaved(true);
                          }}
                        >
                          <Bookmark className="size-3.5" /> {saved ? "Salva" : "Salvar"}
                        </Button>
                      </div>
                    </div>
                    {notice && <p className="mt-3 text-xs text-mute">{notice}</p>}

                    <h2 className="display mt-8 text-[clamp(2rem,4vw,3.4rem)]">{idea.title}</h2>
                    <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-paper/85">{idea.concept}</p>

                    <section className="mt-10">
                      <h3 className="label mb-4 flex items-center gap-2">
                        <Lightbulb className="size-3.5" /> Ideias originais
                      </h3>
                      <ol className="grid gap-3 sm:grid-cols-2">
                        {idea.ideas.map((x, i) => (
                          <motion.li
                            key={i}
                            className="rounded-2xl border border-line p-4 text-[15px] leading-relaxed"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.07 }}
                          >
                            <span className="mb-2 block font-mono text-xs text-lime">{String(i + 1).padStart(2, "0")}</span>
                            {x}
                          </motion.li>
                        ))}
                      </ol>
                    </section>

                    <section className="mt-10 grid gap-8 md:grid-cols-[1.3fr_1fr]">
                      <div>
                        <h3 className="label mb-3">Direção de arte</h3>
                        <p className="text-[15px] leading-relaxed text-paper/85">{idea.artDirection}</p>
                        <h3 className="label mb-3 mt-8">Referências</h3>
                        <ul className="space-y-2">
                          {idea.references.map((x) => (
                            <li key={x} className="flex gap-2 text-sm text-paper/85">
                              <span className="text-lime">↗</span> {x}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3 className="label mb-3 flex items-center gap-2">
                          <Palette className="size-3.5" /> Paleta de cores
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-line">
                          {idea.palette.map((p) => (
                            <button
                              key={p.hex}
                              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:pl-5"
                              style={{ background: p.hex, color: luminance(p.hex) > 0.5 ? "#0a0a0a" : "#f3f3ee" }}
                              onClick={() => navigator.clipboard?.writeText(p.hex).then(() => toast(`${p.hex} copiado.`))}
                              aria-label={`Copiar ${p.name} ${p.hex}`}
                            >
                              <span>{p.name}</span>
                              <span className="font-mono text-xs">{p.hex.toUpperCase()}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </section>

                    <section className="mt-10">
                      <h3 className="label mb-4 flex items-center gap-2">
                        <ListChecks className="size-3.5" /> Sugestões de execução
                      </h3>
                      <ol className="space-y-2">
                        {idea.execution.map((x, i) => (
                          <li key={i} className="flex gap-4 border-b border-line pb-3 text-[15px]">
                            <span className="font-mono text-xs text-fog">{i + 1}</span> {x}
                          </li>
                        ))}
                      </ol>
                    </section>

                    {idea.script && (
                      <section className="mt-10 rounded-2xl bg-ink p-5">
                        <h3 className="label mb-4 flex items-center gap-2">
                          <Clapperboard className="size-3.5" /> Roteiro
                        </h3>
                        <ol className="space-y-2 font-mono text-[13px] leading-relaxed text-paper/85">
                          {idea.script.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ol>
                      </section>
                    )}
                  </div>
                </div>
              </motion.article>
            ) : (
              <motion.div key="empty" className="card hairline-grid grid min-h-[480px] place-items-center p-10 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="max-w-sm">
                  <WandSparkles className="mx-auto mb-5 size-8 text-lime" />
                  <p className="display text-3xl">
                    Uma boa ideia começa com <span className="accent-serif text-lime">uma boa pergunta.</span>
                  </p>
                  <p className="mt-4 text-sm text-fog">Preencha o briefing ao lado. Você já salvou {data.ideas.length} {data.ideas.length === 1 ? "ideia" : "ideias"}.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export default function GeradorPage() {
  return (
    <Suspense>
      <Generator />
    </Suspense>
  );
}
