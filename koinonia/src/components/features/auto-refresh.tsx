"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Atualiza os dados do Server Component periodicamente enquanto a aba está visível. */
export function AutoRefresh({ intervalMs = 15000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
