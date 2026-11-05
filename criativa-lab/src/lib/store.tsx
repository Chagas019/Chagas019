"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getBackend, nowIso, uid, type Backend, type UserData } from "./data";
import { challengeBySlug } from "./content/challenges";
import { courseBySlug } from "./content/courses";
import { referenceBySlug } from "./content/references";
import { BADGES, XP, computeBestStreak, computeStreak, levelFor, startOfWeek } from "./gamification";
import type { Activity, ActivityType, AppUser, Completion, GeneratedIdea, Profile, Project } from "./types";

type Status = "loading" | "anonymous" | "ready";

export interface Celebration {
  id: string;
  title: string;
  xp: number;
  levelUp?: string;
  badges?: string[];
}

export interface Toast {
  id: string;
  message: string;
  tone: "ok" | "error";
}

interface Ctx {
  backend: Backend;
  status: Status;
  user: AppUser | null;
  data: UserData | null;
  stats: ReturnType<typeof computeStats>;
  celebration: Celebration | null;
  dismissCelebration: () => void;
  toasts: Toast[];
  toast: (message: string, tone?: Toast["tone"]) => void;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<"signed-in" | "confirm-email">;
  signOut: () => Promise<void>;

  updateProfile: (patch: Partial<Omit<Profile, "id" | "createdAt">>) => Promise<void>;
  completeChallenge: (slug: string, note: string, step?: number | null) => Promise<void>;
  isCompleted: (slug: string, step?: number | null) => boolean;
  toggleFavorite: (referenceSlug: string) => Promise<void>;
  isFavorite: (referenceSlug: string) => boolean;
  createCollection: (name: string) => Promise<string>;
  renameCollection: (id: string, name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  moveFavorite: (referenceSlug: string, collectionId: string | null) => Promise<void>;
  saveProject: (project: Partial<Project> & Pick<Project, "title" | "category">) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  uploadImage: (file: File) => Promise<string>;
  completeLesson: (courseSlug: string, lessonSlug: string) => Promise<void>;
  isLessonDone: (courseSlug: string, lessonSlug: string) => boolean;
  logIdeaGenerated: (title: string) => Promise<void>;
  saveIdea: (idea: GeneratedIdea) => Promise<void>;
  deleteIdea: (id: string) => Promise<void>;
  resetProgress: () => Promise<void>;
}

const AppContext = createContext<Ctx | null>(null);

function computeStats(data: UserData | null) {
  const empty = {
    xp: 0,
    level: levelFor(0),
    streak: 0,
    bestStreak: 0,
    weekCompleted: 0,
    weekXp: 0,
    monthCompleted: 0,
    badges: [] as string[],
  };
  if (!data) return empty;
  const xp = data.activities.reduce((n, a) => n + a.xp, 0);
  const week = startOfWeek().getTime();
  const now = new Date();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const streak = computeStreak(data.completions);
  const bestStreak = computeBestStreak(data.completions);
  const ctx = {
    completions: data.completions,
    favorites: data.favorites,
    projects: data.projects,
    lessons: data.lessons,
    activities: data.activities,
    streak,
    bestStreak,
    xp,
  };
  return {
    xp,
    level: levelFor(xp),
    streak,
    bestStreak,
    weekCompleted: data.completions.filter((c) => new Date(c.createdAt).getTime() >= week).length,
    weekXp: data.activities.filter((a) => new Date(a.createdAt).getTime() >= week).reduce((n, a) => n + a.xp, 0),
    monthCompleted: data.completions.filter((c) => new Date(c.createdAt).getTime() >= month).length,
    badges: BADGES.filter((b) => b.test(ctx)).map((b) => b.id),
  };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const backend = useMemo(() => getBackend(), []);
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dataRef = useRef<UserData | null>(null);
  dataRef.current = data;

  const toast = useCallback((message: string, tone: Toast["tone"] = "ok") => {
    const id = uid();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const userIdRef = useRef<string | null | undefined>(undefined);
  const loadSeq = useRef(0);

  const load = useCallback(
    async (u: AppUser | null) => {
      userIdRef.current = u?.id ?? null;
      const seq = ++loadSeq.current;
      setUser(u);
      if (!u) {
        setData(null);
        setStatus("anonymous");
        return;
      }
      try {
        const d = await backend.loadAll(u);
        if (seq !== loadSeq.current) return; // uma carga mais nova já está em andamento
        setData(d);
        setStatus("ready");
      } catch (err) {
        console.error(err);
        toast("Não foi possível carregar seus dados. Tente recarregar a página.", "error");
        setStatus("anonymous");
      }
    },
    [backend, toast],
  );

  useEffect(() => {
    let active = true;
    backend.getUser().then((u) => {
      if (active) load(u);
    });
    const off = backend.onAuthChange((u) => {
      if (!active) return;
      // Evita recarregar quando o usuário não mudou (ex.: refresh de token).
      if (userIdRef.current !== (u?.id ?? null)) load(u);
    });
    return () => {
      active = false;
      off();
    };
  }, [backend, load]);

  const requireUser = () => {
    if (!user || !dataRef.current) throw new Error("Entre na sua conta para continuar.");
    return user;
  };

  /** Executa uma ação com tratamento de erro padronizado. */
  const guard = async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Algo deu errado.";
      toast(message, "error");
      throw err;
    }
  };

  const logActivity = async (type: ActivityType, label: string, xp: number, meta?: Record<string, string>) => {
    const u = requireUser();
    const row: Activity = { id: uid(), type, label, xp, meta, createdAt: nowIso() };
    const saved = await backend.insert(u.id, "activities", row);
    setData((d) => (d ? { ...d, activities: [saved, ...d.activities] } : d));
    return saved;
  };

  const celebrate = (before: UserData, after: UserData, title: string, xp: number) => {
    const s0 = computeStats(before);
    const s1 = computeStats(after);
    const newBadges = s1.badges.filter((b) => !s0.badges.includes(b));
    setCelebration({
      id: uid(),
      title,
      xp,
      levelUp: s1.level.level > s0.level.level ? s1.level.name : undefined,
      badges: newBadges.map((id) => BADGES.find((b) => b.id === id)!.name),
    });
  };

  const value: Ctx = {
    backend,
    status,
    user,
    data,
    stats: useMemo(() => computeStats(data), [data]),
    celebration,
    dismissCelebration: () => setCelebration(null),
    toasts,
    toast,

    signIn: (email, password) => backend.signIn(email, password),
    async signUp(name, email, password) {
      const res = await backend.signUp(name, email, password);
      if (res.status === "signed-in") {
        const u = await backend.getUser();
        if (u) {
          const row: Activity = { id: uid(), type: "signup", label: "Entrou no CRIATIVA LAB", xp: 20, createdAt: nowIso() };
          await backend.insert(u.id, "activities", row).catch(() => null);
          await load(u);
        }
      }
      return res.status;
    },
    async signOut() {
      await backend.signOut();
      setUser(null);
      setData(null);
      setStatus("anonymous");
    },

    updateProfile: (patch) =>
      guard(async () => {
        const u = requireUser();
        const profile = await backend.updateProfile(u.id, patch);
        setData((d) => (d ? { ...d, profile } : d));
        toast("Perfil atualizado.");
      }),

    completeChallenge: (slug, note, step = null) =>
      guard(async () => {
        const u = requireUser();
        const challenge = challengeBySlug(slug);
        if (!challenge) throw new Error("Desafio não encontrado.");
        const before = dataRef.current!;
        if (before.completions.some((c) => c.challengeSlug === slug && (c.step ?? null) === step)) {
          throw new Error("Você já concluiu esta etapa.");
        }
        const steps = challenge.steps?.length ?? 0;
        const xp = step === null ? challenge.xp : Math.round(challenge.xp / Math.max(1, steps));
        const row: Completion = { id: uid(), challengeSlug: slug, step, note: note.trim(), xp, createdAt: nowIso() };
        const saved = await backend.insert(u.id, "completions", row);
        const label =
          step === null ? `Concluiu “${challenge.title}”` : `${challenge.title} · ${challenge.steps?.[step] ?? `Etapa ${step + 1}`}`;
        const activity: Activity = {
          id: uid(),
          type: "challenge_completed",
          label,
          xp,
          meta: { slug },
          createdAt: nowIso(),
        };
        const savedAct = await backend.insert(u.id, "activities", activity);
        const after = { ...before, completions: [saved, ...before.completions], activities: [savedAct, ...before.activities] };
        setData(after);
        celebrate(before, after, step === null ? challenge.title : label, xp);
      }),

    isCompleted: (slug, step = null) =>
      Boolean(data?.completions.some((c) => c.challengeSlug === slug && (c.step ?? null) === step)),

    toggleFavorite: (referenceSlug) =>
      guard(async () => {
        const u = requireUser();
        const existing = dataRef.current!.favorites.find((f) => f.referenceSlug === referenceSlug);
        if (existing) {
          await backend.remove(u.id, "favorites", existing.id);
          setData((d) => (d ? { ...d, favorites: d.favorites.filter((f) => f.id !== existing.id) } : d));
          toast("Removida dos favoritos.");
          return;
        }
        const saved = await backend.insert(u.id, "favorites", {
          id: uid(),
          referenceSlug,
          collectionId: null,
          createdAt: nowIso(),
        });
        setData((d) => (d ? { ...d, favorites: [saved, ...d.favorites] } : d));
        const alreadyRewarded = dataRef.current!.activities.some(
          (a) => a.type === "reference_saved" && a.meta?.slug === referenceSlug,
        );
        await logActivity(
          "reference_saved",
          `Salvou “${referenceBySlug(referenceSlug)?.title ?? referenceSlug}”`,
          alreadyRewarded ? 0 : XP.favorite,
          { slug: referenceSlug },
        );
        toast("Salva nos favoritos.");
      }),

    isFavorite: (slug) => Boolean(data?.favorites.some((f) => f.referenceSlug === slug)),

    createCollection: (name) =>
      guard(async () => {
        const u = requireUser();
        const clean = name.trim();
        if (!clean) throw new Error("Dê um nome para a coleção.");
        const saved = await backend.insert(u.id, "collections", { id: uid(), name: clean, createdAt: nowIso() });
        setData((d) => (d ? { ...d, collections: [saved, ...d.collections] } : d));
        toast(`Coleção “${clean}” criada.`);
        return saved.id;
      }),

    renameCollection: (id, name) =>
      guard(async () => {
        const u = requireUser();
        await backend.update(u.id, "collections", id, { name: name.trim() });
        setData((d) => (d ? { ...d, collections: d.collections.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)) } : d));
      }),

    deleteCollection: (id) =>
      guard(async () => {
        const u = requireUser();
        const inside = dataRef.current!.favorites.filter((f) => f.collectionId === id);
        await Promise.all(inside.map((f) => backend.update(u.id, "favorites", f.id, { collectionId: null })));
        await backend.remove(u.id, "collections", id);
        setData((d) =>
          d
            ? {
                ...d,
                collections: d.collections.filter((c) => c.id !== id),
                favorites: d.favorites.map((f) => (f.collectionId === id ? { ...f, collectionId: null } : f)),
              }
            : d,
        );
        toast("Coleção excluída. As referências continuam nos favoritos.");
      }),

    moveFavorite: (referenceSlug, collectionId) =>
      guard(async () => {
        const u = requireUser();
        let fav = dataRef.current!.favorites.find((f) => f.referenceSlug === referenceSlug);
        if (!fav) {
          fav = await backend.insert(u.id, "favorites", { id: uid(), referenceSlug, collectionId, createdAt: nowIso() });
          const created = fav;
          setData((d) => (d ? { ...d, favorites: [created, ...d.favorites] } : d));
        } else {
          await backend.update(u.id, "favorites", fav.id, { collectionId });
          const id = fav.id;
          setData((d) => (d ? { ...d, favorites: d.favorites.map((f) => (f.id === id ? { ...f, collectionId } : f)) } : d));
        }
        const col = dataRef.current!.collections.find((c) => c.id === collectionId);
        toast(col ? `Adicionada a “${col.name}”.` : "Removida da coleção.");
      }),

    saveProject: (input) =>
      guard(async () => {
        const u = requireUser();
        const title = input.title.trim();
        if (!title) throw new Error("O projeto precisa de um título.");
        if (input.id) {
          const patch: Partial<Project> = { ...input, title, updatedAt: nowIso() };
          await backend.update(u.id, "projects", input.id, patch);
          const merged = { ...dataRef.current!.projects.find((p) => p.id === input.id)!, ...patch } as Project;
          setData((d) => (d ? { ...d, projects: d.projects.map((p) => (p.id === input.id ? merged : p)) } : d));
          await logActivity("project_updated", `Atualizou o projeto “${title}”`, 0, { id: input.id });
          toast("Projeto atualizado.");
          return merged;
        }
        const row: Project = {
          id: uid(),
          title,
          description: input.description ?? "",
          category: input.category,
          images: input.images ?? [],
          status: input.status ?? "ideia",
          tags: input.tags ?? [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        const saved = await backend.insert(u.id, "projects", row);
        const before = dataRef.current!;
        setData((d) => (d ? { ...d, projects: [saved, ...d.projects] } : d));
        const act = await logActivity("project_created", `Criou o projeto “${title}”`, XP.projectCreated, { id: saved.id });
        const after = { ...before, projects: [saved, ...before.projects], activities: [act, ...before.activities] };
        celebrate(before, after, `Projeto “${title}” criado`, XP.projectCreated);
        return saved;
      }),

    deleteProject: (id) =>
      guard(async () => {
        const u = requireUser();
        await backend.remove(u.id, "projects", id);
        setData((d) => (d ? { ...d, projects: d.projects.filter((p) => p.id !== id) } : d));
        toast("Projeto excluído.");
      }),

    uploadImage: (file) =>
      guard(async () => {
        const u = requireUser();
        const { compressImage } = await import("./image");
        const blob = await compressImage(file, backend.mode === "local" ? 1200 : 1800, backend.mode === "local" ? 0.75 : 0.85);
        return backend.uploadImage(u.id, blob);
      }),

    completeLesson: (courseSlug, lessonSlug) =>
      guard(async () => {
        const u = requireUser();
        const before = dataRef.current!;
        if (before.lessons.some((l) => l.courseSlug === courseSlug && l.lessonSlug === lessonSlug)) return;
        const course = courseBySlug(courseSlug);
        const lesson = course?.lessons.find((l) => l.slug === lessonSlug);
        if (!course || !lesson) throw new Error("Aula não encontrada.");
        const saved = await backend.insert(u.id, "lesson_progress", {
          id: uid(),
          courseSlug,
          lessonSlug,
          createdAt: nowIso(),
        });
        const act = await backend.insert(u.id, "activities", {
          id: uid(),
          type: "lesson_completed",
          label: `Aula “${lesson.title}” · ${course.title}`,
          xp: XP.lesson,
          meta: { course: courseSlug, lesson: lessonSlug },
          createdAt: nowIso(),
        });
        const after = { ...before, lessons: [saved, ...before.lessons], activities: [act, ...before.activities] };
        setData(after);
        celebrate(before, after, `Aula concluída: ${lesson.title}`, XP.lesson);
      }),

    isLessonDone: (c, l) => Boolean(data?.lessons.some((x) => x.courseSlug === c && x.lessonSlug === l)),

    logIdeaGenerated: (title) => guard(async () => void (await logActivity("idea_generated", `Gerou a ideia “${title}”`, XP.ideaGenerated))),

    saveIdea: (idea) =>
      guard(async () => {
        const u = requireUser();
        const saved = await backend.insert(u.id, "saved_ideas", { id: uid(), title: idea.title, payload: idea, createdAt: nowIso() });
        setData((d) => (d ? { ...d, ideas: [saved, ...d.ideas] } : d));
        await logActivity("idea_saved", `Salvou a ideia “${idea.title}”`, XP.ideaSaved);
        toast("Ideia salva no seu portfólio.");
      }),

    deleteIdea: (id) =>
      guard(async () => {
        const u = requireUser();
        await backend.remove(u.id, "saved_ideas", id);
        setData((d) => (d ? { ...d, ideas: d.ideas.filter((i) => i.id !== id) } : d));
        toast("Ideia removida.");
      }),

    resetProgress: () =>
      guard(async () => {
        const u = requireUser();
        await backend.clear(u.id, ["completions", "lesson_progress", "activities"]);
        setData((d) => (d ? { ...d, completions: [], lessons: [], activities: [] } : d));
        toast("Progresso reiniciado.");
      }),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp precisa estar dentro de <AppProvider>.");
  return ctx;
}

/** Atalho para páginas autenticadas (o layout garante que `data` existe). */
export function useUserData() {
  const ctx = useApp();
  return { ...ctx, data: ctx.data as UserData, user: ctx.user as AppUser };
}
