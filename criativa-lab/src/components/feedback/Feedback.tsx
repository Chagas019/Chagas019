"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, CircleAlert, Sparkles, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useApp } from "@/lib/store";

export function Toaster() {
  const { toasts } = useApp();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-6">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-2xl ${
              t.tone === "error" ? "border-ember/40 bg-[#1d0f0b] text-[#ffd5cb]" : "border-line-strong bg-slate text-paper"
            }`}
            role={t.tone === "error" ? "alert" : "status"}
          >
            {t.tone === "error" ? <CircleAlert className="size-4 shrink-0 text-ember" /> : <Check className="size-4 shrink-0 text-lime" />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Feedback ao concluir um desafio/aula/projeto: XP, nível e medalhas. */
export function CelebrationOverlay() {
  const { celebration, dismissCelebration } = useApp();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(dismissCelebration, celebration.levelUp || celebration.badges?.length ? 5200 : 3200);
    // Captura o Esc antes dos diálogos: fecha só a camada do topo.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      dismissCelebration();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [celebration, dismissCelebration]);

  const shards = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => {
        const angle = (i / 22) * Math.PI * 2;
        const dist = 120 + (i % 5) * 34;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, r: (i * 47) % 360, s: 6 + (i % 4) * 3, c: i % 3 };
      }),
    [],
  );

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key={celebration.id}
          className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-6 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={dismissCelebration}
          role="status"
          aria-live="assertive"
        >
          <div className="relative">
            {!reduce &&
              shards.map((s, i) => (
                <motion.span
                  key={i}
                  aria-hidden
                  className="absolute left-1/2 top-1/2"
                  style={{
                    width: s.s,
                    height: s.c === 2 ? s.s : s.s * 2.4,
                    background: s.c === 0 ? "#d4ff3a" : s.c === 1 ? "#f3f3ee" : "#ff5c39",
                    borderRadius: s.c === 2 ? "999px" : 2,
                  }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
                  animate={{ x: s.x, y: s.y, rotate: s.r + 180, opacity: 0, scale: 1 }}
                  transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
                />
              ))}
            <motion.div
              className="card relative w-[min(88vw,380px)] overflow-hidden bg-graphite p-8 text-center"
              initial={{ scale: 0.7, rotate: -4, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={dismissCelebration} aria-label="Fechar celebração" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-fog hover:bg-white/10">
                <X className="size-4" />
              </button>
              <motion.div
                className="mx-auto mb-5 grid size-16 place-items-center rounded-full bg-lime text-ink"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.6, delay: 0.15 }}
              >
                <Check className="size-8" strokeWidth={3} />
              </motion.div>
              <p className="label mb-2">Concluído</p>
              <h2 className="font-display text-xl font-semibold leading-tight">{celebration.title}</h2>
              {celebration.xp > 0 && (
                <motion.p
                  className="display mt-5 text-6xl text-lime"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  +{celebration.xp}
                  <span className="ml-1 font-mono text-base tracking-widest text-paper/70">XP</span>
                </motion.p>
              )}
              {celebration.levelUp && (
                <motion.p
                  className="mt-5 inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-4 py-2 text-sm text-lime"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.55 }}
                >
                  <Sparkles className="size-4" /> Novo nível: {celebration.levelUp}
                </motion.p>
              )}
              {!!celebration.badges?.length && (
                <motion.div className="mt-4 space-y-1 text-sm text-paper/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
                  {celebration.badges.map((b) => (
                    <p key={b}>🏅 Medalha desbloqueada: <strong className="text-paper">{b}</strong></p>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
