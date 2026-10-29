"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Camera, Film, FolderKanban, GraduationCap, Plus, Swords, X } from "lucide-react";
import { IdeaLauncher } from "@/components/studio/idea-launcher";
import { cn } from "@/lib/utils";

function options(isModerator: boolean) {
  return [
    { href: "/publicar?formato=photo", label: "Publicar foto", desc: "Uma imagem ou uma galeria", icon: Camera },
    { href: "/publicar?formato=video", label: "Publicar vídeo", desc: "MP4, MOV ou WebM", icon: Film },
    { href: "/publicar?tipo=showcase", label: "Compartilhar projeto", desc: "Resultado, processo e antes/depois", icon: FolderKanban },
    isModerator
      ? { href: "/desafios/novo", label: "Criar desafio", desc: "Creative Battle com regras e prazo", icon: Swords }
      : { href: "/lab", label: "Entrar em um desafio", desc: "Escolha uma missão do LAB", icon: Swords },
    { href: "/publicar?tipo=tutorial", label: "Publicar tutorial", desc: "Ensine uma técnica no FRAME LAB", icon: GraduationCap },
  ];
}

/**
 * Botão "Criar" que abre uma folha (celular) ou painel (desktop) com as ações de criação.
 * Todas as opções levam a fluxos reais.
 */
export function CreateMenu({ signedIn, isModerator, variant }: { signedIn: boolean; isModerator: boolean; variant: "bar" | "sidebar" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const trigger =
    variant === "bar" ? (
      signedIn ? (
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label="Criar" className="flex flex-col items-center gap-1 py-1.5">
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className="grid size-12 place-items-center rounded-2xl bg-volt-500 text-ink-950 shadow-[0_10px_24px_-8px_rgb(212_255_54/0.6)]">
            <Plus className="size-6" aria-hidden />
          </motion.span>
        </button>
      ) : (
        <Link href="/cadastro" aria-label="Criar conta para publicar" className="flex flex-col items-center gap-1 py-1.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-volt-500 text-ink-950">
            <Plus className="size-6" aria-hidden />
          </span>
        </Link>
      )
    ) : signedIn ? (
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-volt-500 px-3 py-3 font-semibold text-ink-950 transition-transform hover:-translate-y-0.5">
        <Plus className="size-5 shrink-0" aria-hidden /> <span className="nav-label">Criar</span>
      </button>
    ) : (
      <Link href="/cadastro" className="flex w-full items-center gap-3 rounded-[var(--radius-md)] bg-volt-500 px-3 py-3 font-semibold text-ink-950">
        <Plus className="size-5 shrink-0" aria-hidden /> <span className="nav-label">Criar conta</span>
      </Link>
    );

  return (
    <>
      {trigger}
      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === ref.current && setOpen(false)}
        aria-label="Criar"
        className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-paper backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md"
      >
        <motion.div
          initial={reduce ? false : { y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="rounded-t-[28px] bg-ink-900 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] ring-1 ring-white/[0.08] sm:rounded-[28px] sm:pb-4"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 sm:hidden" aria-hidden />
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="font-display text-3xl">Criar</p>
            <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full bg-white/[0.06]" aria-label="Fechar">
              <X className="size-5" />
            </button>
          </div>
          <ul className="space-y-1.5">
            {options(isModerator).map((o, i) => (
              <motion.li key={o.href} initial={reduce ? false : { opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduce ? 0 : 0.04 * i }}>
                <Link href={o.href} onClick={() => setOpen(false)} className="flex items-center gap-4 rounded-[var(--radius-md)] px-3 py-3 hover:bg-white/[0.05]">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-ink-800 text-volt-500 ring-1 ring-white/[0.06]">
                    <o.icon className="size-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-semibold">{o.label}</span>
                    <span className="block text-sm text-fog-500">{o.desc}</span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </ul>
          <div className="mt-3 border-t border-white/[0.06] pt-3" onClick={() => setOpen(false)}>
            <IdeaLauncher signedIn={signedIn} variant="sheet" className={cn()} />
          </div>
        </motion.div>
      </dialog>
    </>
  );
}
