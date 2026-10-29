"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bookmark, FolderPlus, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { generateIdea, IDEA_OPTIONS, type IdeaInputs } from "@/lib/creative/ideas";
import type { IdeaProposal } from "@/server/db/schema";
import { projectFromIdeaAction, saveIdeaAction } from "@/server/actions/studio";
import { cn } from "@/lib/utils";

const GROUPS: { key: keyof IdeaInputs; label: string }[] = [
  { key: "kind", label: "Tipo de criação" },
  { key: "goal", label: "Objetivo" },
  { key: "style", label: "Estilo visual" },
  { key: "platform", label: "Onde vai publicar" },
  { key: "time", label: "Tempo disponível" },
];

/** Gerador de propostas criativas por modelos — sem IA, e a interface diz isso. */
export function IdeaGenerator({ signedIn }: { signedIn: boolean }) {
  const [inputs, setInputs] = useState<IdeaInputs>({ kind: "foto", goal: "portfolio", style: "cinematografico", platform: "feed", time: "2h" });
  const [idea, setIdea] = useState<IdeaProposal | null>(null);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const reduce = useReducedMotion();
  const toast = useToast();
  const router = useRouter();

  const generate = () => {
    setEditing(false);
    setIdea(generateIdea(inputs, Math.floor(Math.random() * 2 ** 31)));
  };
  const patch = (p: Partial<IdeaProposal>) => setIdea((i) => (i ? { ...i, ...p } : i));

  function save(thenProject: boolean) {
    if (!idea) return;
    start(async () => {
      const r = await saveIdeaAction(idea);
      if (!r.ok) return toast.show(r.error, "error");
      if (!thenProject) return toast.show(r.message ?? "Ideia salva.");
      const p = await projectFromIdeaAction(r.data.id);
      if (!p.ok) return toast.show(p.error, "error");
      toast.show("Ideia virou projeto no seu estúdio.");
      router.push(`/estudio/projetos/${p.data.id}`);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {GROUPS.map((g) => (
          <fieldset key={g.key} className="space-y-2">
            <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-fog-400">{g.label}</legend>
            <div className="flex flex-wrap gap-1.5">
              {IDEA_OPTIONS[g.key].map((o) => (
                <button
                  key={o.v}
                  type="button"
                  aria-pressed={inputs[g.key] === o.v}
                  onClick={() => setInputs((s) => ({ ...s, [g.key]: o.v }))}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm transition-colors",
                    inputs[g.key] === o.v ? "bg-paper text-ink-950" : "bg-ink-850 text-fog-300 ring-1 ring-inset ring-white/[0.08] hover:text-paper",
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <motion.button
          type="button"
          onClick={generate}
          whileTap={reduce ? undefined : { scale: 0.95 }}
          className="pill-3d group flex h-16 items-center gap-3 pl-6 pr-2 text-left"
        >
          <span className="font-display text-xl tracking-wide text-paper">{idea ? "Gerar outra" : "Me dê uma ideia"}</span>
          <span className="pill-3d__knob grid size-12 place-items-center rounded-full transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:translate-x-1">
            {idea ? <RefreshCw className="size-5 text-ink-950" aria-hidden /> : <Sparkles className="size-5 text-ink-950" aria-hidden />}
          </span>
        </motion.button>
        <p className="max-w-sm text-xs text-fog-500">As propostas são montadas a partir de modelos criativos da equipe FRAME combinados com as suas escolhas — não é inteligência artificial.</p>
      </div>

      <AnimatePresence mode="wait">
        {idea ? (
          <motion.article
            key={idea.title + idea.caption}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            aria-live="polite"
            className="overflow-hidden rounded-[var(--radius-lg)] bg-ink-850 ring-1 ring-inset ring-white/[0.06]"
          >
            <div className="flex h-3" aria-label={`Paleta sugerida: ${idea.palette.join(", ")}`}>
              {idea.palette.map((c) => (
                <span key={c} className="flex-1" style={{ background: c }} />
              ))}
            </div>
            <div className="space-y-6 p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                {editing ? (
                  <Input aria-label="Título" value={idea.title} maxLength={140} onChange={(e) => patch({ title: e.target.value })} className="font-display text-2xl" />
                ) : (
                  <h3 className="font-display text-4xl leading-none">{idea.title}</h3>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)} aria-pressed={editing}>
                  <Pencil className="size-4" aria-hidden /> {editing ? "Concluir edição" : "Editar"}
                </Button>
              </div>

              <Field label="Conceito" value={idea.concept} editing={editing} onChange={(v) => patch({ concept: v })} />
              <Field label="Referência visual" value={idea.visualReference} editing={editing} onChange={(v) => patch({ visualReference: v })} />

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-fog-400">Roteiro / estrutura</h4>
                <ol className="mt-2 space-y-2">
                  {idea.structure.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-fog-200">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-volt-500 text-xs font-bold text-ink-950">{i + 1}</span>
                      {editing ? (
                        <Input aria-label={`Etapa ${i + 1}`} value={s} maxLength={300} onChange={(e) => patch({ structure: idea.structure.map((x, j) => (j === i ? e.target.value : x)) })} />
                      ) : (
                        <span className="pt-0.5">{s}</span>
                      )}
                    </li>
                  ))}
                </ol>
              </section>

              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Enquadramento" value={idea.framing} editing={editing} onChange={(v) => patch({ framing: v })} />
                <Field label="Edição" value={idea.editing} editing={editing} onChange={(v) => patch({ editing: v })} />
                <Field label="Legenda (opcional)" value={idea.caption} editing={editing} onChange={(v) => patch({ caption: v })} />
                <Field label="Chamada para ação" value={idea.cta} editing={editing} onChange={(v) => patch({ cta: v })} />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-white/[0.06] pt-5">
                {signedIn ? (
                  <>
                    <Button onClick={() => save(true)} loading={pending}>
                      <FolderPlus className="size-4" aria-hidden /> Transformar em projeto
                    </Button>
                    <Button variant="secondary" onClick={() => save(false)} disabled={pending}>
                      <Bookmark className="size-4" aria-hidden /> Salvar ideia
                    </Button>
                  </>
                ) : (
                  <Link href="/entrar?next=/estudio-criativo%23ideia" className="text-sm text-volt-500 underline underline-offset-4">
                    Entre para salvar ideias e criar projetos
                  </Link>
                )}
                <Button variant="ghost" onClick={generate} disabled={pending}>
                  <RefreshCw className="size-4" aria-hidden /> Outra alternativa
                </Button>
              </div>
            </div>
          </motion.article>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (v: string) => void }) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-fog-400">{label}</h4>
      {editing ? (
        <Textarea aria-label={label} value={value} rows={3} maxLength={1000} onChange={(e) => onChange(e.target.value)} className="mt-2" />
      ) : (
        <p className="mt-1.5 text-pretty text-sm leading-relaxed text-fog-200">{value}</p>
      )}
    </section>
  );
}
