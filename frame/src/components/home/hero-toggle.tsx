"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, Minus } from "lucide-react";

/** Minimiza/expande o hero e lembra a escolha (cookie), para não atrapalhar quem volta todo dia. */
export function HeroToggle({ minimized }: { minimized: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        document.cookie = `frame_hero=${minimized ? "open" : "min"}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }}
      aria-label={minimized ? "Mostrar apresentação" : "Minimizar apresentação"}
      className="grid size-9 shrink-0 place-items-center rounded-full bg-white/[0.06] text-fog-300 hover:bg-white/10 hover:text-paper"
    >
      {minimized ? <ChevronDown className="size-4" /> : <Minus className="size-4" />}
    </button>
  );
}
