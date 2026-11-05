"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Clock, Flame, FolderOpen, Heart, Plus, Shuffle, Sparkles, Zap } from "lucide-react";
import { useUserData } from "@/lib/store";
import { CHALLENGES, DAILY_CHALLENGES, challengeOfTheDay } from "@/lib/content/challenges";
import { REFERENCES, referenceBySlug } from "@/lib/content/references";
import { categoryById } from "@/lib/content/categories";
import { xpByDay } from "@/lib/gamification";
import type { Reference } from "@/lib/types";
import { CategoryTag, DifficultyDots, EmptyState, relativeTime } from "@/components/ui/bits";
import { Button, ButtonLink } from "@/components/ui/Button";
import { CountUp, Item, ProgressRing, Stagger } from "@/components/ui/motion";
import { RefArt } from "@/components/art/RefArt";
import { ReferenceCard } from "@/components/references/ReferenceCard";
import { ReferenceModal } from "@/components/references/ReferenceModal";
import { CompleteDialog } from "@/components/challenges/CompleteDialog";
import { useRouter } from "next/navigation";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const WEEKDAYS = ["S", "T", "Q", "Q", "S", "S", "D"];

export default function Dashboard() {
  const { data, stats, isCompleted } = useUserData();
  const router = useRouter();
  const [openRef, setOpenRef] = useState<Reference | null>(null);
  const [completing, setCompleting] = useState(false);
  const today = challengeOfTheDay();
  const todayDone = isCompleted(today.slug);
  const firstName = data.profile.name.split(" ")[0];
  const week = xpByDay(data.activities, 7);
  const maxXp = Math.max(60, ...week.map((d) => d.xp));
  const goal = data.profile.weeklyGoal || 4;

  const recommended = useMemo(() => {
    const favs = new Set(data.favorites.map((f) => f.referenceSlug));
    const focus = data.profile.focus;
    const pool = REFERENCES.filter((r) => !favs.has(r.slug));
    // Prioriza referências ligadas aos desafios das categorias de foco do usuário.
    const focusRefs = new Set(CHALLENGES.filter((c) => focus.includes(c.category)).flatMap((c) => c.references));
    const day = new Date().getDate();
    return [...pool].sort((a, b) => Number(focusRefs.has(b.slug)) - Number(focusRefs.has(a.slug)) || ((a.seed + day) % 7) - ((b.seed + day) % 7)).slice(0, 4);
  }, [data.favorites, data.profile.focus]);

  const surprise = () => {
    const pending = DAILY_CHALLENGES.filter((c) => !isCompleted(c.slug));
    const list = pending.length ? pending : DAILY_CHALLENGES;
    router.push(`/desafios/${list[Math.floor(Math.random() * list.length)].slug}`);
  };

  const recentProjects = data.projects.slice(0, 3);
  const savedRefs = data.favorites.slice(0, 4).map((f) => referenceBySlug(f.referenceSlug)).filter(Boolean) as Reference[];

  return (
    <>
      {/* Saudação */}
      <Stagger className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Item>
            <p className="label mb-4">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </Item>
          <Item>
            <h1 className="display text-[clamp(2.6rem,6.5vw,5.2rem)]">
              {greeting()}, <span className="accent-serif text-lime">{firstName}.</span>
            </h1>
          </Item>
          <Item>
            <p className="mt-4 max-w-lg text-fog">
              {todayDone
                ? "Desafio do dia concluído. Que tal explorar referências ou transformar a ideia em projeto?"
                : stats.streak > 0
                  ? `Você está há ${stats.streak} ${stats.streak === 1 ? "dia" : "dias"} em sequência. Não deixe a chama apagar hoje.`
                  : "Uma pequena criação por dia muda tudo. Comece pelo desafio de hoje."}
            </p>
          </Item>
        </div>
        <Item className="flex flex-wrap gap-2">
          <Button onClick={surprise} variant="outline">
            <Shuffle className="size-4" /> Me surpreenda
          </Button>
          <ButtonLink href="/desafios">
            <Plus className="size-4" /> Novo desafio
          </ButtonLink>
        </Item>
      </Stagger>

      <div className="grid gap-4 lg:grid-cols-12">
        {/* Desafio do dia */}
        <motion.section
          aria-labelledby="hoje"
          className="card grain relative overflow-hidden p-6 sm:p-8 lg:col-span-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <div className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full border border-dashed border-lime/20 animate-spin-slow" aria-hidden />
          <div className="pointer-events-none absolute -right-4 -top-4 size-44 rounded-full bg-lime/[0.07] blur-2xl" aria-hidden />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="label flex items-center gap-2 !text-lime">
                <span className="size-1.5 animate-pulse-lime rounded-full bg-lime" /> Desafio do dia
              </p>
              <CategoryTag id={today.category} />
            </div>
            <h2 id="hoje" className="display mt-8 max-w-xl text-[clamp(2.2rem,4.6vw,3.8rem)]">
              {today.title}
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-fog">{today.summary}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-fog">
              <DifficultyDots level={today.difficulty} />
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" /> {today.minutes} min
              </span>
              <span className="inline-flex items-center gap-1.5 text-paper">
                <Zap className="size-4 text-lime" /> {today.xp} XP
              </span>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {todayDone ? (
                <span className="inline-flex h-11 items-center gap-2 rounded-full bg-lime/15 px-5 text-sm font-medium text-lime">
                  <Check className="size-4" /> Concluído hoje
                </span>
              ) : (
                <Button onClick={() => setCompleting(true)}>
                  <Check className="size-4" /> Concluir
                </Button>
              )}
              <ButtonLink href={`/desafios/${today.slug}`} variant="outline">
                Ver instruções <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </motion.section>

        {/* Nível / XP */}
        <motion.section
          aria-label="Seu nível"
          className="card flex flex-col justify-between gap-6 p-6 lg:col-span-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
        >
          <div className="flex items-center justify-between">
            <p className="label">Nível {stats.level.level}</p>
            <Link href="/progresso" className="text-xs text-fog hover:text-lime">
              Ver progresso →
            </Link>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={stats.level.progress} size={116} label={`${Math.round(stats.level.progress * 100)}% até o próximo nível`}>
              <div>
                <CountUp value={stats.xp} className="display block text-2xl" />
                <span className="label !text-[10px]">XP</span>
              </div>
            </ProgressRing>
            <div>
              <p className="font-display text-2xl font-semibold leading-tight">{stats.level.name}</p>
              <p className="mt-1 text-sm text-fog">
                {stats.level.next ? `Faltam ${stats.level.toNext} XP para ${stats.level.next.name}` : "Nível máximo alcançado!"}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-line p-3">
              <p className="flex items-center gap-1.5 text-xs text-fog">
                <Flame className="size-3.5 text-ember" /> Sequência
              </p>
              <p className="display mt-1 text-3xl">{stats.streak}</p>
            </div>
            <div className="rounded-xl border border-line p-3">
              <p className="flex items-center gap-1.5 text-xs text-fog">
                <Sparkles className="size-3.5 text-lime" /> Medalhas
              </p>
              <p className="display mt-1 text-3xl">{stats.badges.length}</p>
            </div>
          </div>
        </motion.section>

        {/* Progresso semanal */}
        <motion.section
          aria-labelledby="semana"
          className="card p-6 lg:col-span-5"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.24 }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 id="semana" className="label">
                Progresso semanal
              </h2>
              <p className="mt-2 font-display text-3xl font-semibold">
                {stats.weekCompleted}
                <span className="text-fog">/{goal}</span> <span className="text-base font-normal text-fog">desafios</span>
              </p>
            </div>
            <span className="rounded-full border border-line px-3 py-1 text-xs text-fog">+{stats.weekXp} XP</span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
            <motion.div
              className="h-full rounded-full bg-lime"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(1, stats.weekCompleted / goal) * 100}%` }}
              transition={{ duration: 1, delay: 0.4 }}
            />
          </div>
          <div className="mt-6 flex h-28 items-end gap-2" role="img" aria-label="XP ganho nos últimos 7 dias">
            {week.map((d, i) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                <motion.div
                  className={`w-full rounded-md ${d.xp > 0 ? "bg-lime" : "bg-white/[0.06]"}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(6, (d.xp / maxXp) * 88)}px` }}
                  transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  title={`${d.date.toLocaleDateString("pt-BR")}: ${d.xp} XP`}
                />
                <span className={`text-[10px] ${i === 6 ? "text-lime" : "text-mute"}`}>{WEEKDAYS[(d.date.getDay() + 6) % 7]}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Atividades recentes */}
        <motion.section
          aria-labelledby="atividades"
          className="card p-6 lg:col-span-7"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="atividades" className="label">
              Atividades recentes
            </h2>
            <Link href="/progresso#historico" className="text-xs text-fog hover:text-lime">
              Histórico completo →
            </Link>
          </div>
          {data.activities.length === 0 ? (
            <p className="py-8 text-center text-sm text-mute">Suas conquistas aparecem aqui.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.activities.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                  <span className="min-w-0 truncate text-sm">{a.label}</span>
                  <span className="flex shrink-0 items-center gap-3 text-xs text-fog">
                    {a.xp > 0 && <span className="text-lime">+{a.xp}</span>}
                    {relativeTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      {/* Projetos salvos */}
      <section className="mt-14" aria-labelledby="projetos">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="projetos" className="display text-3xl">
            Projetos <span className="accent-serif text-lime">salvos</span>
          </h2>
          <Link href="/portfolio" className="text-sm text-fog hover:text-lime">
            Portfólio →
          </Link>
        </div>
        {recentProjects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="size-5" />}
            title="Seu portfólio começa aqui"
            text="Registre resultados dos desafios, ideias e experimentos para acompanhar sua evolução."
            action={
              <ButtonLink href="/portfolio?novo=1" size="sm">
                <Plus className="size-4" /> Criar projeto
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {recentProjects.map((p) => (
              <Link key={p.id} href={`/portfolio?projeto=${p.id}`} className="card group overflow-hidden transition hover:border-line-strong">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate">
                  {p.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                  ) : (
                    <div className="grid h-full place-items-center font-display text-5xl font-semibold" style={{ color: categoryById(p.category).color }}>
                      {p.title.slice(0, 1)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-medium">{p.title}</p>
                  <p className="mt-1 text-xs text-fog">
                    {categoryById(p.category).label} · {relativeTime(p.updatedAt)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Referências */}
      <section className="mt-14" aria-labelledby="refs">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="refs" className="display text-3xl">
            Recomendadas <span className="accent-serif text-lime">para você</span>
          </h2>
          <Link href="/referencias" className="text-sm text-fog hover:text-lime">
            Laboratório →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {recommended.map((r, i) => (
            <motion.button
              key={r.slug}
              onClick={() => setOpenRef(r)}
              className="group relative aspect-[4/5] overflow-hidden rounded-[var(--radius-card)] border border-line text-left"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.6 }}
              aria-label={`Abrir referência ${r.title}`}
            >
              <RefArt {...r} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <span className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-4">
                <span className="font-display text-base font-semibold leading-tight">{r.title}</span>
                <ArrowUpRight className="size-4 shrink-0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          ))}
        </div>
        {savedRefs.length > 0 && (
          <div className="mt-10">
            <p className="label mb-4 flex items-center gap-2">
              <Heart className="size-3.5" /> Salvas recentemente
            </p>
            <div className="columns-2 gap-4 md:columns-4">
              {savedRefs.map((r) => (
                <ReferenceCard key={r.slug} reference={r} onOpen={setOpenRef} />
              ))}
            </div>
          </div>
        )}
      </section>

      <ReferenceModal reference={openRef} onClose={() => setOpenRef(null)} />
      {completing && <CompleteDialog open onClose={() => setCompleting(false)} slug={today.slug} title={today.title} xp={today.xp} />}
    </>
  );
}
