"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity as ActivityIcon, Flame, Trophy, Zap } from "lucide-react";
import { useUserData } from "@/lib/store";
import { BADGES, LEVELS, dayKey, xpByDay } from "@/lib/gamification";
import { CATEGORIES } from "@/lib/content/categories";
import { challengeBySlug } from "@/lib/content/challenges";
import type { ActivityType } from "@/lib/types";
import { BadgeMedal, PageHeader, relativeTime } from "@/components/ui/bits";
import { Bar, CountUp, ProgressRing, Reveal } from "@/components/ui/motion";

const FILTERS: { id: ActivityType | "todas"; label: string }[] = [
  { id: "todas", label: "Tudo" },
  { id: "challenge_completed", label: "Desafios" },
  { id: "lesson_completed", label: "Aulas" },
  { id: "reference_saved", label: "Referências" },
  { id: "project_created", label: "Projetos" },
  { id: "idea_generated", label: "Ideias" },
];

export default function ProgressoPage() {
  const { data, stats } = useUserData();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todas");
  const [limit, setLimit] = useState(20);

  const heat = useMemo(() => xpByDay(data.activities, 7 * 18), [data.activities]);
  const heatMax = Math.max(1, ...heat.map((d) => d.xp));
  // Alinha a primeira coluna à segunda-feira.
  const pad = (heat[0].date.getDay() + 6) % 7;

  const month = useMemo(() => xpByDay(data.activities, 30), [data.activities]);
  const monthXp = month.reduce((n, d) => n + d.xp, 0);
  const activeDays = month.filter((d) => d.xp > 0).length;

  const byCategory = useMemo(
    () =>
      CATEGORIES.map((c) => ({
        ...c,
        count: data.completions.filter((x) => challengeBySlug(x.challengeSlug)?.category === c.id).length,
      })),
    [data.completions],
  );
  const catMax = Math.max(1, ...byCategory.map((c) => c.count));

  const history = data.activities.filter((a) => filter === "todas" || a.type === filter || (filter === "project_created" && a.type === "project_updated") || (filter === "idea_generated" && a.type === "idea_saved"));

  return (
    <>
      <PageHeader eyebrow="Meu progresso" title="Evolução se" accent="mede." description="XP, níveis, medalhas e sequência. Cada ação no lab soma — e fica registrada no seu histórico." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Zap, label: "XP total", value: stats.xp, hint: `+${stats.weekXp} nesta semana` },
          { icon: Flame, label: "Sequência atual", value: stats.streak, hint: `Recorde: ${stats.bestStreak} dias` },
          { icon: Trophy, label: "Desafios concluídos", value: data.completions.length, hint: `${stats.monthCompleted} neste mês` },
          { icon: ActivityIcon, label: "Dias ativos (30d)", value: activeDays, hint: `${monthXp} XP no mês` },
        ].map(({ icon: Icon, label, value, hint }, i) => (
          <Reveal key={label} delay={i * 0.05}>
            <div className="card p-5">
              <p className="flex items-center gap-2 text-xs text-fog">
                <Icon className="size-3.5 text-lime" /> {label}
              </p>
              <CountUp value={value} className="display mt-3 block text-5xl" />
              <p className="mt-2 text-xs text-mute">{hint}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-12">
        <Reveal className="lg:col-span-5">
          <section className="card p-6" aria-labelledby="niveis">
            <h2 id="niveis" className="label mb-6">
              Níveis de criatividade
            </h2>
            <div className="mb-8 flex items-center gap-5">
              <ProgressRing value={stats.level.progress} size={104} label="Progresso do nível">
                <span className="display text-3xl">{stats.level.level}</span>
              </ProgressRing>
              <div>
                <p className="font-display text-2xl font-semibold">{stats.level.name}</p>
                <p className="text-sm text-fog">{stats.level.next ? `${stats.level.toNext} XP para ${stats.level.next.name}` : "Você chegou ao topo."}</p>
              </div>
            </div>
            <ol className="space-y-2">
              {LEVELS.map((l) => {
                const reached = stats.xp >= l.min;
                const current = l.level === stats.level.level;
                return (
                  <li key={l.level} className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${current ? "bg-lime text-ink" : reached ? "text-paper" : "text-mute"}`}>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs">{String(l.level).padStart(2, "0")}</span> {l.name}
                    </span>
                    <span className="font-mono text-xs">{l.min.toLocaleString("pt-BR")} XP</span>
                  </li>
                );
              })}
            </ol>
          </section>
        </Reveal>

        <div className="space-y-4 lg:col-span-7">
          <Reveal>
            <section className="card p-6" aria-labelledby="calor">
              <div className="mb-5 flex items-center justify-between">
                <h2 id="calor" className="label">
                  Constância · últimas 18 semanas
                </h2>
                <span className="flex items-center gap-1.5 text-[10px] text-mute" aria-hidden>
                  menos
                  {[0.08, 0.3, 0.55, 0.8, 1].map((o) => (
                    <span key={o} className="size-2.5 rounded-[3px]" style={{ background: o === 0.08 ? "rgb(255 255 255 / 0.06)" : `rgb(212 255 58 / ${o})` }} />
                  ))}
                  mais
                </span>
              </div>
              <div className="overflow-x-auto">
                <div className="grid w-max grid-flow-col grid-rows-7 gap-1" role="img" aria-label="Mapa de calor de atividade diária">
                  {Array.from({ length: pad }).map((_, i) => (
                    <span key={`p${i}`} className="size-3.5" />
                  ))}
                  {heat.map((d, i) => {
                    const o = d.xp === 0 ? 0 : 0.25 + (d.xp / heatMax) * 0.75;
                    return (
                      <motion.span
                        key={d.key}
                        className="size-3.5 rounded-[3px]"
                        style={{ background: d.xp === 0 ? "rgb(255 255 255 / 0.06)" : `rgb(212 255 58 / ${o})` }}
                        title={`${d.date.toLocaleDateString("pt-BR")}: ${d.xp} XP`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: i * 0.004 }}
                      />
                    );
                  })}
                </div>
              </div>
              <p className="mt-4 text-xs text-mute">Hoje: {dayKey(new Date()).split("-").reverse().join("/")}</p>
            </section>
          </Reveal>

          <Reveal>
            <section className="card p-6" aria-labelledby="mensal">
              <div className="mb-4 flex items-end justify-between">
                <h2 id="mensal" className="label">
                  Progresso mensal · XP por dia
                </h2>
                <span className="text-sm text-fog">{monthXp} XP</span>
              </div>
              <div className="flex h-32 items-end gap-[3px]" role="img" aria-label="XP por dia nos últimos 30 dias">
                {month.map((d, i) => (
                  <motion.span
                    key={d.key}
                    className={`flex-1 rounded-sm ${d.xp ? "bg-lime" : "bg-white/[0.06]"}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(4, (d.xp / Math.max(60, ...month.map((m) => m.xp))) * 128)}px` }}
                    transition={{ delay: i * 0.015, duration: 0.6 }}
                    title={`${d.date.toLocaleDateString("pt-BR")}: ${d.xp} XP`}
                  />
                ))}
              </div>
            </section>
          </Reveal>

          <Reveal>
            <section className="card p-6" aria-labelledby="cats">
              <h2 id="cats" className="label mb-5">
                Desafios por categoria
              </h2>
              <ul className="space-y-3">
                {byCategory.map((c) => (
                  <li key={c.id} className="grid grid-cols-[130px_1fr_28px] items-center gap-3 text-sm">
                    <span className="truncate text-fog">{c.label}</span>
                    <Bar value={c.count / catMax} />
                    <span className="text-right font-mono text-xs">{c.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        </div>
      </div>

      <section className="mt-14" aria-labelledby="medalhas">
        <h2 id="medalhas" className="display mb-6 text-3xl">
          Medalhas <span className="accent-serif text-lime">{stats.badges.length}/{BADGES.length}</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BADGES.map((b) => (
            <BadgeMedal key={b.id} badge={b} earned={stats.badges.includes(b.id)} />
          ))}
        </div>
      </section>

      <section id="historico" className="mt-14 scroll-mt-24" aria-labelledby="hist">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <h2 id="hist" className="display text-3xl">
            Histórico de <span className="accent-serif text-lime">atividades</span>
          </h2>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {FILTERS.map((f) => (
              <button key={f.id} className="chip" data-active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {history.length === 0 ? (
          <p className="card p-8 text-center text-sm text-mute">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ul className="card divide-y divide-line">
            {history.slice(0, limit).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="min-w-0 text-sm">{a.label}</span>
                <span className="flex shrink-0 items-center gap-4 text-xs text-fog">
                  {a.xp > 0 && <span className="font-mono text-lime">+{a.xp} XP</span>}
                  <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString("pt-BR")}>
                    {relativeTime(a.createdAt)}
                  </time>
                </span>
              </li>
            ))}
          </ul>
        )}
        {history.length > limit && (
          <div className="mt-4 text-center">
            <button className="chip" onClick={() => setLimit((l) => l + 20)}>
              Carregar mais ({history.length - limit})
            </button>
          </div>
        )}
      </section>
    </>
  );
}
