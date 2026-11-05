"use client";

import Link from "next/link";
import { ArrowUpRight, Check, Clock, Zap } from "lucide-react";
import type { Challenge } from "@/lib/types";
import { CategoryTag, DifficultyDots } from "@/components/ui/bits";
import { Tilt } from "@/components/ui/motion";
import { categoryById } from "@/lib/content/categories";

const KIND_LABEL = { diario: "Diário", "especial-7": "Especial · 7 dias", "especial-30": "Especial · 30 dias" } as const;

export function ChallengeCard({ challenge, done, progress }: { challenge: Challenge; done?: boolean; progress?: number }) {
  const color = categoryById(challenge.category).color;
  return (
    <Tilt className="group h-full rounded-[var(--radius-card)]" max={4}>
      <Link
        href={`/desafios/${challenge.slug}`}
        className="card grain flex h-full flex-col overflow-hidden p-6 transition-colors duration-300 hover:border-line-strong"
      >
        <div className="flex items-start justify-between gap-3">
          <CategoryTag id={challenge.category} />
          {done ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 px-2.5 py-1 text-[11px] font-medium text-lime">
              <Check className="size-3" /> Concluído
            </span>
          ) : (
            <span className="label !text-[10px]">{KIND_LABEL[challenge.kind]}</span>
          )}
        </div>

        <h3 className="mt-8 font-display text-[22px] font-semibold leading-[1.08] tracking-tight">{challenge.title}</h3>
        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fog">{challenge.summary}</p>

        {typeof progress === "number" && (
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-[11px] text-fog">
              <span>Progresso</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-lime" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 pt-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-fog">
            <DifficultyDots level={challenge.difficulty} />
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" /> {challenge.minutes} min{challenge.kind !== "diario" ? "/dia" : ""}
            </span>
            <span className="inline-flex items-center gap-1 text-paper/80">
              <Zap className="size-3.5" style={{ color }} /> {challenge.xp} XP
            </span>
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line transition-all duration-300 group-hover:rotate-45 group-hover:border-lime group-hover:bg-lime group-hover:text-ink">
            <ArrowUpRight className="size-4" />
          </span>
        </div>
      </Link>
    </Tilt>
  );
}
