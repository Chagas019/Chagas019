"use client";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition, useState } from "react";
import { Heart } from "lucide-react";
import { toggleFavoriteAction } from "@/app/actions/library";
import { cn } from "@/lib/utils";

export function FavoriteButton({ productId, initial, loggedIn, variant = "icon", className }: { productId: string; initial: boolean; loggedIn: boolean; variant?: "icon" | "full"; className?: string }) {
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!loggedIn) {
      router.push(`/entrar?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !saved;
    start(async () => {
      setOptimistic(next);
      const res = await toggleFavoriteAction(productId, next);
      if (res.ok) {
        setSaved(next);
        setError(null);
      } else setError(res.error ?? "Erro");
    });
  };

  const label = optimistic ? "Remover dos favoritos" : "Salvar nos favoritos";
  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={optimistic}
        aria-label={variant === "icon" ? label : undefined}
        disabled={pending}
        data-testid="favorite-button"
        className={cn(
          "inline-flex items-center justify-center gap-2 transition",
          variant === "icon" ? "size-10 rounded-full bg-ink/60 text-bone backdrop-blur hover:bg-ink" : "h-14 rounded-full border border-bone/25 px-6 text-sm hover:border-bone",
          className
        )}
      >
        <Heart className={cn("size-[18px] transition", optimistic && "fill-signal text-signal")} aria-hidden />
        {variant === "full" && (optimistic ? "Nos favoritos" : "Favoritar")}
      </button>
      {error && (
        <span role="alert" className="sr-only">
          {error}
        </span>
      )}
    </>
  );
}
