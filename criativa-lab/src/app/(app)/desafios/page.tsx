"use client";

import { useMemo, useState } from "react";
import { Search, Target } from "lucide-react";
import { CHALLENGES, challengeOfTheDay } from "@/lib/content/challenges";
import { CATEGORIES, DIFFICULTY_LABEL } from "@/lib/content/categories";
import { useUserData } from "@/lib/store";
import type { CategoryId, ChallengeKind, Difficulty } from "@/lib/types";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState, PageHeader } from "@/components/ui/bits";
import { ButtonLink } from "@/components/ui/Button";
import { motion, AnimatePresence } from "framer-motion";

const TABS: { id: ChallengeKind | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "diario", label: "Diários" },
  { id: "especial-7", label: "Especiais 7 dias" },
  { id: "especial-30", label: "Especiais 30 dias" },
];

export default function DesafiosPage() {
  const { data, isCompleted } = useUserData();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("todos");
  const [cat, setCat] = useState<CategoryId | "todas">("todas");
  const [level, setLevel] = useState<Difficulty | "todos">("todos");
  const [status, setStatus] = useState<"todos" | "pendentes" | "concluidos">("todos");
  const [q, setQ] = useState("");
  const today = challengeOfTheDay();

  const progressOf = (slug: string, steps?: string[]) => {
    if (!steps?.length) return undefined;
    const done = data.completions.filter((c) => c.challengeSlug === slug && c.step !== null).length;
    return done / steps.length;
  };
  const doneOf = (slug: string, steps?: string[]) => (steps?.length ? progressOf(slug, steps) === 1 : isCompleted(slug));

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return CHALLENGES.filter((c) => (tab === "todos" ? true : c.kind === tab))
      .filter((c) => (cat === "todas" ? true : c.category === cat))
      .filter((c) => (level === "todos" ? true : c.difficulty === level))
      .filter((c) => {
        if (status === "todos") return true;
        const d = doneOf(c.slug, c.steps);
        return status === "concluidos" ? d : !d;
      })
      .filter((c) => !term || [c.title, c.summary, ...c.tags].join(" ").toLowerCase().includes(term));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, cat, level, status, q, data.completions]);

  return (
    <>
      <PageHeader
        eyebrow="Desafios criativos"
        title="Treine o olhar,"
        accent="todo dia."
        description="Missões curtas com objetivo claro. Conclua, registre o aprendizado e ganhe XP. Os especiais de 7 e 30 dias constroem hábito."
        actions={
          <ButtonLink href={`/desafios/${today.slug}`}>
            <Target className="size-4" /> Desafio do dia
          </ButtonLink>
        }
      />

      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div role="tablist" aria-label="Tipo de desafio" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} data-active={tab === t.id} onClick={() => setTab(t.id)} className="chip">
                {t.label}
              </button>
            ))}
          </div>
          <label className="relative block md:w-72">
            <span className="sr-only">Buscar desafios</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar desafio, técnica, tema…" className="field !rounded-full pl-11" type="search" />
          </label>
        </div>
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Categorias">
          <button className="chip" data-active={cat === "todas"} onClick={() => setCat("todas")}>
            Todas as categorias
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className="chip" data-active={cat === c.id} onClick={() => setCat(c.id)}>
              <span className="size-1.5 rounded-full" style={{ background: c.color }} /> {c.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm text-fog">
            Nível
            <select value={level} onChange={(e) => setLevel(e.target.value as Difficulty | "todos")} className="field !w-auto !py-2">
              <option value="todos">Todos</option>
              {(Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-fog">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="field !w-auto !py-2">
              <option value="todos">Todos</option>
              <option value="pendentes">Pendentes</option>
              <option value="concluidos">Concluídos</option>
            </select>
          </label>
          <p className="ml-auto self-center text-sm text-mute" aria-live="polite">
            {list.length} {list.length === 1 ? "desafio" : "desafios"}
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Search className="size-5" />} title="Nada por aqui" text="Nenhum desafio corresponde aos filtros. Tente outra combinação." />
      ) : (
        <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {list.map((c, i) => (
              <motion.div
                key={c.slug}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] } }}
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <ChallengeCard challenge={c} done={doneOf(c.slug, c.steps)} progress={progressOf(c.slug, c.steps)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}
