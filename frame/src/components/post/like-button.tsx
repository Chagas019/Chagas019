"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bookmark, Heart } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { toggleLikeAction, toggleSaveAction } from "@/server/actions/social";
import { cn, compactNumber } from "@/lib/utils";

export function LikeButton({ postId, initialLiked, initialCount, signedIn, compact }: { postId: string; initialLiked: boolean; initialCount: number; signedIn: boolean; compact?: boolean }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const reduce = useReducedMotion();
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? `Descurtir (${count} curtidas)` : `Curtir (${count} curtidas)`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) return router.push("/cadastro");
        const next = !liked;
        setLiked(next);
        setCount((c) => c + (next ? 1 : -1));
        start(async () => {
          const r = await toggleLikeAction(postId);
          if (!r.ok) {
            setLiked(!next);
            setCount((c) => c + (next ? -1 : 1));
            toast.show(r.error, "error");
          } else {
            setLiked(r.data.liked);
            setCount(r.data.count);
          }
        });
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-sm transition-colors",
        compact ? "px-1.5 py-1" : "px-3 py-2 hover:bg-white/5",
        liked ? "text-volt-300" : "text-fog-300 hover:text-paper",
      )}
    >
      <motion.span key={String(liked)} initial={reduce || !liked ? false : { scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 15 }}>
        <Heart className={cn("size-[18px]", liked && "fill-current")} aria-hidden />
      </motion.span>
      <span className="tabular-nums">{compactNumber(count)}</span>
    </button>
  );
}

export function SaveButton({ postId, initialSaved, signedIn }: { postId: string; initialSaved: boolean; signedIn: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remover dos salvos" : "Salvar"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) return router.push("/cadastro");
        const next = !saved;
        setSaved(next);
        start(async () => {
          const r = await toggleSaveAction(postId);
          if (!r.ok) {
            setSaved(!next);
            toast.show(r.error, "error");
          } else toast.show(r.data.saved ? "Salvo na sua biblioteca." : "Removido dos salvos.");
        });
      }}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm transition-colors hover:bg-white/5", saved ? "text-cobalt-400" : "text-fog-300 hover:text-paper")}
    >
      <Bookmark className={cn("size-[18px]", saved && "fill-current")} aria-hidden />
      <span>{saved ? "Salvo" : "Salvar"}</span>
    </button>
  );
}
