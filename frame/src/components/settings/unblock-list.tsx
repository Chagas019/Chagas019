"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { setBlockAction, setMuteAction } from "@/server/actions/social";

export function UnblockList({ blocked, muted }: { blocked: { userId: string; handle: string }[]; muted: { userId: string; handle: string }[] }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (!blocked.length && !muted.length) return <p className="text-sm text-fog-500">Você não bloqueou nem silenciou ninguém.</p>;
  const row = (u: { userId: string; handle: string }, kind: "block" | "mute") => (
    <li key={`${kind}-${u.userId}`} className="flex items-center justify-between py-2 text-sm">
      <span>
        @{u.handle} <span className="text-fog-500">· {kind === "block" ? "bloqueado" : "silenciado"}</span>
      </span>
      <button
        disabled={pending}
        className="text-fog-400 hover:text-paper"
        onClick={() =>
          start(async () => {
            const r = kind === "block" ? await setBlockAction(u.userId, false) : await setMuteAction(u.userId, false);
            toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
            router.refresh();
          })
        }
      >
        {kind === "block" ? "Desbloquear" : "Remover silêncio"}
      </button>
    </li>
  );
  return <ul className="divide-y divide-ink-700">{[...blocked.map((u) => row(u, "block")), ...muted.map((u) => row(u, "mute"))]}</ul>;
}
