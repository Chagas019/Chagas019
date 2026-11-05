import type { Activity, Completion, Favorite, LessonProgress, Project } from "./types";
import { CHALLENGES } from "./content/challenges.ts";

/* ───────────── Níveis ───────────── */

export const LEVELS = [
  { level: 1, name: "Faísca", min: 0 },
  { level: 2, name: "Curioso", min: 150 },
  { level: 3, name: "Explorador", min: 400 },
  { level: 4, name: "Experimentador", min: 800 },
  { level: 5, name: "Criador", min: 1400 },
  { level: 6, name: "Autor", min: 2200 },
  { level: 7, name: "Diretor Criativo", min: 3300 },
  { level: 8, name: "Visionário", min: 4800 },
  { level: 9, name: "Mestre do Lab", min: 7000 },
] as const;

export function levelFor(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.min) current = l;
  const next = LEVELS.find((l) => l.min > xp) ?? null;
  const span = next ? next.min - current.min : 1;
  const progress = next ? (xp - current.min) / span : 1;
  return { ...current, next, progress: Math.min(1, Math.max(0, progress)), toNext: next ? next.min - xp : 0 };
}

/* ───────────── Datas ───────────── */

export const dayKey = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function startOfWeek(d = new Date()) {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (date.getDay() + 6) % 7; // segunda = 0
  date.setDate(date.getDate() - diff);
  return date;
}

/** Sequência de dias consecutivos com pelo menos um desafio concluído (hoje ou ontem contam como ativos). */
export function computeStreak(completions: Pick<Completion, "createdAt">[], now = new Date()) {
  const days = new Set(completions.map((c) => dayKey(c.createdAt)));
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeBestStreak(completions: Pick<Completion, "createdAt">[]) {
  const days = [...new Set(completions.map((c) => dayKey(c.createdAt)))].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of days) {
    const [y, m, d] = k.split("-").map(Number);
    const cur = new Date(y, m - 1, d);
    if (prev && (cur.getTime() - prev.getTime()) / 86_400_000 === 1) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

/** XP por dia nos últimos N dias (mais antigo → hoje). */
export function xpByDay(activities: Activity[], days: number, now = new Date()) {
  const map = new Map<string, number>();
  for (const a of activities) map.set(dayKey(a.createdAt), (map.get(dayKey(a.createdAt)) ?? 0) + a.xp);
  const out: { key: string; date: Date; xp: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    out.push({ key: dayKey(d), date: d, xp: map.get(dayKey(d)) ?? 0 });
  }
  return out;
}

/* ───────────── Medalhas ───────────── */

export interface BadgeContext {
  completions: Completion[];
  favorites: Favorite[];
  projects: Project[];
  lessons: LessonProgress[];
  activities: Activity[];
  streak: number;
  bestStreak: number;
  xp: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: "spark" | "flame" | "camera" | "type" | "book" | "folder" | "heart" | "wand" | "crown" | "infinity" | "grid";
  test: (c: BadgeContext) => boolean;
}

const completedCategory = (c: BadgeContext, cat: string) =>
  c.completions.filter((x) => CHALLENGES.find((ch) => ch.slug === x.challengeSlug)?.category === cat).length;

export const BADGES: Badge[] = [
  { id: "primeira-faisca", name: "Primeira faísca", description: "Conclua seu primeiro desafio.", icon: "spark", test: (c) => c.completions.length >= 1 },
  { id: "tres-seguidos", name: "Em chamas", description: "Mantenha uma sequência de 3 dias.", icon: "flame", test: (c) => c.bestStreak >= 3 },
  { id: "semana-perfeita", name: "Semana perfeita", description: "Sequência de 7 dias.", icon: "infinity", test: (c) => c.bestStreak >= 7 },
  { id: "olho-de-lente", name: "Olho de lente", description: "Conclua 3 desafios de fotografia.", icon: "camera", test: (c) => completedCategory(c, "fotografia") >= 3 },
  { id: "tipografo", name: "Tipógrafo", description: "Conclua 2 desafios de tipografia.", icon: "type", test: (c) => completedCategory(c, "tipografia") >= 2 },
  { id: "estudante", name: "Estudante do Lab", description: "Conclua 5 aulas na Academia.", icon: "book", test: (c) => c.lessons.length >= 5 },
  { id: "curador", name: "Curador", description: "Salve 10 referências.", icon: "heart", test: (c) => c.favorites.length >= 10 },
  { id: "portfolio-vivo", name: "Portfólio vivo", description: "Crie 3 projetos no portfólio.", icon: "folder", test: (c) => c.projects.length >= 3 },
  { id: "inventor", name: "Inventor", description: "Gere 5 ideias com o assistente.", icon: "wand", test: (c) => c.activities.filter((a) => a.type === "idea_generated").length >= 5 },
  { id: "versatil", name: "Versátil", description: "Conclua desafios em 4 categorias diferentes.", icon: "grid", test: (c) => new Set(c.completions.map((x) => CHALLENGES.find((ch) => ch.slug === x.challengeSlug)?.category)).size >= 4 },
  { id: "criador", name: "Criador", description: "Alcance o nível 5.", icon: "crown", test: (c) => c.xp >= 1400 },
];

export const XP = {
  lesson: 25,
  favorite: 5,
  projectCreated: 40,
  ideaGenerated: 10,
  ideaSaved: 5,
} as const;
