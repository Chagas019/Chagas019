"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bookmark, Clock, FolderPlus, Gauge, Package, RefreshCw, Sparkles, X } from "lucide-react";
import { generateMission, missionToProposal, type Mission } from "@/lib/creative/missions";
import { projectFromIdeaAction, saveIdeaAction } from "@/server/actions/studio";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const CATS = [
  { v: undefined, l: "Surpresa" },
  { v: "fotografia", l: "Foto" },
  { v: "video", l: "Vídeo" },
  { v: "design", l: "Design" },
  { v: "edicao", l: "Edição" },
  { v: "mobile", l: "Celular" },
] as const;

/**
 * Botão + experiência em tela cheia do "Me dê uma ideia" (missões criativas).
 * `variant` muda só o gatilho; a experiência é a mesma em todo o site.
 */
export function IdeaLauncher({ signedIn, variant = "inline", className }: { signedIn: boolean; variant?: "inline" | "fab" | "nav" | "sheet"; className?: string }) {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<string | undefined>(undefined);
  const [mission, setMission] = useState<Mission | null>(null);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDialogElement>(null);
  const reduce = useReducedMotion();
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const roll = (c = cat) => setMission(generateMission(Math.floor(Math.random() * 2 ** 31), c));
  const launch = () => {
    roll();
    setOpen(true);
  };

  function save(asProject: boolean) {
    if (!mission) return;
    start(async () => {
      const r = await saveIdeaAction(missionToProposal(mission));
      if (!r.ok) return toast.show(r.error, "error");
      if (!asProject) return toast.show("Missão salva em Meu estúdio › Ideias.");
      const p = await projectFromIdeaAction(r.data.id);
      if (!p.ok) return toast.show(p.error, "error");
      setOpen(false);
      router.push(`/estudio/projetos/${p.data.id}`);
    });
  }

  const trigger =
    variant === "fab" ? (
      <button type="button" onClick={launch} className={cn("group fixed bottom-6 right-6 z-[var(--z-float)] hidden items-center gap-2 rounded-full bg-volt-500 py-3 pl-4 pr-5 font-semibold text-ink-950 shadow-[0_18px_40px_-12px_rgb(212_255_54/0.5)] transition-transform duration-300 hover:-translate-y-0.5 xl:flex", className)}>
        <Sparkles className="size-5 transition-transform duration-500 group-hover:rotate-90" aria-hidden /> Me dê uma ideia
      </button>
    ) : variant === "nav" ? (
      <button type="button" onClick={launch} className={cn("group flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-fog-300 hover:bg-white/[0.05] hover:text-paper", className)}>
        <Sparkles className="size-5 shrink-0 text-volt-500 transition-transform duration-500 group-hover:rotate-90" aria-hidden />
        <span className="nav-label truncate">Me dê uma ideia</span>
      </button>
    ) : variant === "sheet" ? (
      <button type="button" onClick={launch} className={cn("flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-volt-500 px-4 py-3.5 text-left font-semibold text-ink-950", className)}>
        <Sparkles className="size-5" aria-hidden /> Me dê uma ideia
      </button>
    ) : (
      <button type="button" onClick={launch} className={cn("inline-flex h-11 items-center gap-2 rounded-full bg-volt-500 px-5 font-semibold text-ink-950 transition-transform hover:-translate-y-0.5", className)}>
        <Sparkles className="size-4" aria-hidden /> Me dê uma ideia
      </button>
    );

  return (
    <>
      {trigger}
      {open ? createPortal(<dialog
        ref={ref}
        onClose={() => setOpen(false)}
        aria-label="Me dê uma ideia"
        className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-transparent p-0 text-paper backdrop:bg-ink-950/90 backdrop:backdrop-blur-md"
      >
        <div className="relative mx-auto flex min-h-full max-w-5xl flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-[calc(env(safe-area-inset-top)+20px)] sm:px-8">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-volt-500">Gerador de missões · FRAME LAB</p>
            <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full bg-white/[0.06] hover:bg-white/10" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>

          <div role="radiogroup" aria-label="Área" className="scrollbar-none -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
            {CATS.map((c) => (
              <button
                key={c.l}
                type="button"
                role="radio"
                aria-checked={cat === c.v}
                onClick={() => {
                  setCat(c.v);
                  roll(c.v);
                }}
                className={cn("shrink-0 rounded-full px-4 py-2 text-sm ring-1 ring-inset", cat === c.v ? "bg-paper text-ink-950 ring-paper" : "text-fog-300 ring-white/15 hover:text-paper")}
              >
                {c.l}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mission ? (
              <motion.div
                key={mission.theme + mission.mission}
                initial={reduce ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -16, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 py-8"
                aria-live="polite"
              >
                <p className="font-mono text-xs uppercase tracking-[0.3em] text-fog-500">Tema</p>
                <h2 className="relative mt-1 font-display text-[clamp(3.4rem,13vw,9rem)] leading-[0.82]">
                  <span className="text-outline-strong absolute left-1.5 top-1.5 select-none" aria-hidden>
                    {mission.theme}.
                  </span>
                  <span className="relative">{mission.theme}.</span>
                </h2>
                <ul className="mt-6 flex flex-wrap gap-2 text-xs">
                  <li className="rounded-full bg-volt-500 px-3 py-1 font-semibold text-ink-950">{mission.categoryLabel}</li>
                  <li className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1"><Gauge className="size-3.5" aria-hidden /> {mission.level}</li>
                  <li className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1"><Clock className="size-3.5" aria-hidden /> ~{mission.minutes} min</li>
                  <li className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1"><Package className="size-3.5" aria-hidden /> {mission.materials.join(" · ")}</li>
                </ul>
                <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_1fr]">
                  <section>
                    <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-volt-500">Missão</h3>
                    <p className="mt-2 text-pretty text-2xl leading-snug sm:text-3xl">{mission.mission}</p>
                  </section>
                  <section className="space-y-6">
                    <div>
                      <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-volt-500">Regras</h3>
                      <ul className="mt-2 space-y-2">
                        {mission.rules.map((r) => (
                          <li key={r} className="flex gap-2 text-fog-200">
                            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-volt-500" aria-hidden /> {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-volt-500">Resultado</h3>
                      <p className="mt-2 text-fog-200">{mission.result}</p>
                    </div>
                  </section>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-white/[0.08] bg-ink-950/80 pt-4 backdrop-blur">
            <button type="button" onClick={() => roll()} className="inline-flex h-12 items-center gap-2 rounded-full bg-paper px-5 font-semibold text-ink-950">
              <RefreshCw className="size-4" aria-hidden /> Gerar outra ideia
            </button>
            {signedIn ? (
              <>
                <button type="button" disabled={pending} onClick={() => save(true)} className="inline-flex h-12 items-center gap-2 rounded-full bg-volt-500 px-5 font-semibold text-ink-950 disabled:opacity-50">
                  <FolderPlus className="size-4" aria-hidden /> Transformar em projeto
                </button>
                <button type="button" disabled={pending} onClick={() => save(false)} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-paper ring-1 ring-inset ring-white/20 disabled:opacity-50">
                  <Bookmark className="size-4" aria-hidden /> Salvar ideia
                </button>
              </>
            ) : (
              <Link href="/entrar" className="inline-flex h-12 items-center px-3 text-sm text-volt-500 underline underline-offset-4">
                Entre para salvar e virar projeto
              </Link>
            )}
            <p className="w-full pt-1 text-xs text-fog-500">Missões montadas a partir de temas, técnicas e restrições escritos pela equipe FRAME — não é inteligência artificial.</p>
          </div>
        </div>
      </dialog>, document.body) : null}
    </>
  );
}
