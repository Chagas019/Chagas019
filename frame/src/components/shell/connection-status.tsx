"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

/** Aviso fixo quando o aparelho perde a conexão. */
export function ConnectionStatus() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-16 z-40 flex justify-center px-4">
      <p className="flex items-center gap-2 rounded-full bg-ink-800 px-4 py-2 text-sm text-paper shadow-[var(--shadow-pop)] ring-1 ring-danger-400/40">
        <WifiOff className="size-4 text-danger-400" aria-hidden /> Sem conexão. Suas ações serão possíveis assim que a internet voltar.
      </p>
    </div>
  );
}
