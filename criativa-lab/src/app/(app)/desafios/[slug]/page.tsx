"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Clock, Target, WandSparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { challengeBySlug, CHALLENGES } from "@/lib/content/challenges";
import { referenceBySlug } from "@/lib/content/references";
import { useUserData } from "@/lib/store";
import type { Reference } from "@/lib/types";
import { CategoryTag, DifficultyDots, relativeTime } from "@/components/ui/bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CompleteDialog } from "@/components/challenges/CompleteDialog";
import { ReferenceCard } from "@/components/references/ReferenceCard";
import { ReferenceModal } from "@/components/references/ReferenceModal";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { Bar, Item, Stagger } from "@/components/ui/motion";

export default function ChallengePage() {
  const { slug } = useParams<{ slug: string }>();
  const challenge = challengeBySlug(slug);
  const { data, isCompleted } = useUserData();
  const [dialog, setDialog] = useState<{ step: number | null; title: string; xp: number } | null>(null);
  const [openRef, setOpenRef] = useState<Reference | null>(null);
  if (!challenge) notFound();

  const steps = challenge.steps ?? [];
  const special = steps.length > 0;
  const stepXp = special ? Math.round(challenge.xp / steps.length) : challenge.xp;
  const doneSteps = steps.filter((_, i) => isCompleted(challenge.slug, i)).length;
  const done = special ? doneSteps === steps.length : isCompleted(challenge.slug);
  const completion = data.completions.find((c) => c.challengeSlug === challenge.slug && c.step === null);
  const nextStep = steps.findIndex((_, i) => !isCompleted(challenge.slug, i));
  const related = CHALLENGES.filter((c) => c.category === challenge.category && c.slug !== challenge.slug).slice(0, 3);

  return (
    <>
      <Link href="/desafios" className="mb-8 inline-flex items-center gap-2 text-sm text-fog transition hover:text-paper">
        <ArrowLeft className="size-4" /> Todos os desafios
      </Link>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <Stagger>
          <Item>
            <div className="flex flex-wrap items-center gap-4">
              <CategoryTag id={challenge.category} />
              <span className="label">
                {challenge.kind === "diario" ? "Desafio diário" : challenge.kind === "especial-7" ? "Especial · 7 dias" : "Especial · 30 dias"}
              </span>
            </div>
          </Item>
          <Item>
            <h1 className="display mt-6 text-[clamp(2.6rem,6vw,5rem)]">{challenge.title}</h1>
          </Item>
          <Item>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-paper/85">{challenge.summary}</p>
          </Item>
          <Item>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 border-y border-line py-4 text-sm text-fog">
              <DifficultyDots level={challenge.difficulty} />
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" /> {challenge.minutes} min{special ? " por etapa" : ""}
              </span>
              <span className="inline-flex items-center gap-1.5 text-paper">
                <Zap className="size-4 text-lime" /> {challenge.xp} XP{special ? ` (${stepXp} por etapa)` : ""}
              </span>
            </div>
          </Item>

          <Item>
            <section className="mt-10">
              <h2 className="label mb-3 flex items-center gap-2">
                <Target className="size-3.5" /> Objetivo
              </h2>
              <p className="font-display text-2xl leading-snug tracking-tight">{challenge.objective}</p>
            </section>
          </Item>

          <Item>
            <section className="mt-10">
              <h2 className="label mb-4">Instruções</h2>
              <ol className="space-y-3">
                {challenge.instructions.map((ins, i) => (
                  <li key={i} className="card flex gap-4 p-4">
                    <span className="font-mono text-xs text-lime">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[15px] leading-relaxed">{ins}</span>
                  </li>
                ))}
              </ol>
            </section>
          </Item>

          {special && (
            <Item>
              <section className="mt-10">
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="label">Etapas</h2>
                  <span className="text-sm text-fog">
                    {doneSteps}/{steps.length} concluídas
                  </span>
                </div>
                <Bar value={doneSteps / steps.length} className="mb-4" />
                <ul className="space-y-2">
                  {steps.map((s, i) => {
                    const ok = isCompleted(challenge.slug, i);
                    return (
                      <li key={i} className={`card flex items-center justify-between gap-4 p-4 ${ok ? "border-lime/25" : ""}`}>
                        <span className={`flex items-center gap-3 text-[15px] ${ok ? "text-fog line-through decoration-lime/50" : ""}`}>
                          {ok ? <CheckCircle2 className="size-5 shrink-0 text-lime" /> : <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line-strong text-[10px] text-fog">{i + 1}</span>}
                          {s}
                        </span>
                        {!ok && (
                          <Button size="sm" variant={i === nextStep ? "primary" : "outline"} onClick={() => setDialog({ step: i, title: s, xp: stepXp })}>
                            Concluir
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            </Item>
          )}
        </Stagger>

        {/* Coluna de ação */}
        <aside className="lg:sticky lg:top-12 lg:self-start">
          <motion.div
            className={`card grain overflow-hidden p-6 ${done ? "border-lime/30" : ""}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            {done ? (
              <>
                <div className="mb-4 grid size-12 place-items-center rounded-full bg-lime text-ink">
                  <Check className="size-6" strokeWidth={3} />
                </div>
                <h2 className="font-display text-2xl font-semibold">Desafio concluído</h2>
                {completion && <p className="mt-1 text-sm text-fog">{relativeTime(completion.createdAt)}</p>}
                {completion?.note && <blockquote className="mt-4 border-l-2 border-lime pl-4 text-sm italic text-paper/80">“{completion.note}”</blockquote>}
                <div className="mt-6 flex flex-col gap-2">
                  <ButtonLink href="/portfolio?novo=1" variant="outline">
                    Adicionar ao portfólio
                  </ButtonLink>
                  <ButtonLink href="/desafios" variant="ghost">
                    Próximo desafio
                  </ButtonLink>
                </div>
              </>
            ) : (
              <>
                <p className="label">Pronto para criar?</p>
                <p className="mt-3 font-display text-2xl font-semibold leading-tight">
                  {special ? `Etapa ${nextStep + 1} de ${steps.length}` : "Reserve " + challenge.minutes + " minutos e mão na massa."}
                </p>
                <Button
                  size="lg"
                  className="mt-6 w-full"
                  onClick={() =>
                    setDialog(special ? { step: nextStep, title: steps[nextStep], xp: stepXp } : { step: null, title: challenge.title, xp: challenge.xp })
                  }
                >
                  <Check className="size-4" /> {special ? "Concluir próxima etapa" : "Concluir desafio"}
                </Button>
                <ButtonLink href={`/gerador?categoria=${challenge.category}&tema=${encodeURIComponent(challenge.title)}`} variant="ghost" className="mt-2 w-full">
                  <WandSparkles className="size-4" /> Pedir ideias à IA
                </ButtonLink>
              </>
            )}
          </motion.div>

          <section className="mt-8">
            <h2 className="label mb-4">Referências</h2>
            <div className="columns-2 gap-4">
              {challenge.references.map((s) => {
                const r = referenceBySlug(s);
                return r ? <ReferenceCard key={s} reference={r} onOpen={setOpenRef} /> : null;
              })}
            </div>
          </section>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="display mb-6 text-3xl">
            Mais em <span className="accent-serif text-lime">{challenge.category === "livre" ? "criatividade livre" : "esta categoria"}</span>
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {related.map((c) => (
              <ChallengeCard key={c.slug} challenge={c} done={isCompleted(c.slug)} />
            ))}
          </div>
        </section>
      )}

      {dialog && (
        <CompleteDialog open onClose={() => setDialog(null)} slug={challenge.slug} step={dialog.step} title={dialog.title} xp={dialog.xp} />
      )}
      <ReferenceModal reference={openRef} onClose={() => setOpenRef(null)} />
    </>
  );
}
