"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Clock, Search } from "lucide-react";
import { COURSES, TOTAL_LESSONS } from "@/lib/content/courses";
import { CATEGORIES, DIFFICULTY_LABEL } from "@/lib/content/categories";
import { useUserData } from "@/lib/store";
import type { CategoryId } from "@/lib/types";
import { EmptyState, PageHeader } from "@/components/ui/bits";
import { Bar, Reveal } from "@/components/ui/motion";

export default function AcademiaPage() {
  const { data } = useUserData();
  const [cat, setCat] = useState<CategoryId | "todas">("todas");
  const [q, setQ] = useState("");

  const doneBy = (slug: string) => data.lessons.filter((l) => l.courseSlug === slug).length;
  const list = useMemo(
    () =>
      COURSES.filter((c) => cat === "todas" || c.category === cat).filter((c) => {
        const t = q.trim().toLowerCase();
        return !t || [c.title, c.subtitle, ...c.lessons.map((l) => l.title)].join(" ").toLowerCase().includes(t);
      }),
    [cat, q],
  );
  const usedCats = CATEGORIES.filter((c) => COURSES.some((co) => co.category === c.id));
  const inProgress = COURSES.find((c) => doneBy(c.slug) > 0 && doneBy(c.slug) < c.lessons.length);

  return (
    <>
      <PageHeader
        eyebrow="Academia criativa"
        title="Técnica que vira"
        accent="intuição."
        description={`${COURSES.length} trilhas e ${TOTAL_LESSONS} aulas curtas, cada uma com um exercício prático. Você já concluiu ${data.lessons.length}.`}
      />

      {inProgress && (
        <Reveal>
          <Link
            href={`/academia/${inProgress.slug}`}
            className="card group mb-10 flex flex-col gap-4 p-6 transition hover:border-line-strong sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="label !text-lime">Continuar de onde parou</p>
              <p className="mt-2 font-display text-2xl font-semibold">{inProgress.title}</p>
            </div>
            <div className="flex items-center gap-4 sm:w-72">
              <Bar value={doneBy(inProgress.slug) / inProgress.lessons.length} />
              <ArrowUpRight className="size-5 shrink-0 transition group-hover:rotate-45" />
            </div>
          </Link>
        </Reveal>
      )}

      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button className="chip" data-active={cat === "todas"} onClick={() => setCat("todas")}>
            Todas
          </button>
          {usedCats.map((c) => (
            <button key={c.id} className="chip" data-active={cat === c.id} onClick={() => setCat(c.id)}>
              {c.label}
            </button>
          ))}
        </div>
        <label className="relative block md:w-72">
          <span className="sr-only">Buscar aulas</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-mute" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aula ou tema…" className="field !rounded-full pl-11" />
        </label>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<BookOpen className="size-5" />} title="Nenhuma trilha encontrada" text="Tente outra busca." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => {
            const done = doneBy(c.slug);
            const mins = c.lessons.reduce((n, l) => n + l.minutes, 0);
            return (
              <Reveal key={c.slug} delay={Math.min(i, 6) * 0.05}>
                <Link href={`/academia/${c.slug}`} className="card group grain flex h-full flex-col overflow-hidden transition hover:border-line-strong">
                  <div className="relative h-40 overflow-hidden border-b border-line" style={{ background: c.color }}>
                    <span
                      className="absolute -bottom-6 -right-2 font-display text-[9rem] font-bold leading-none tracking-tighter text-ink/90 transition-transform duration-700 group-hover:-translate-x-3"
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="absolute left-5 top-5 rounded-full bg-ink/85 px-3 py-1 text-[11px] text-paper">{DIFFICULTY_LABEL[c.level]}</span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="font-display text-2xl font-semibold tracking-tight">{c.title}</h2>
                    <p className="mt-1 text-sm text-fog">{c.subtitle}</p>
                    <div className="mt-auto pt-6">
                      <div className="mb-3 flex items-center justify-between text-xs text-fog">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="size-3.5" /> {c.lessons.length} aulas
                          <Clock className="ml-2 size-3.5" /> {mins} min
                        </span>
                        <span className={done === c.lessons.length ? "text-lime" : ""}>
                          {done}/{c.lessons.length}
                        </span>
                      </div>
                      <Bar value={done / c.lessons.length} />
                    </div>
                  </div>
                </Link>
              </Reveal>
            );
          })}
        </div>
      )}
    </>
  );
}
