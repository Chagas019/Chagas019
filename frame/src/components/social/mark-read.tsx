"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { markNotificationsReadAction } from "@/server/actions/profile";

/** Marca como lidas após a página ser exibida (os itens continuam destacados nesta visita). */
export function MarkReadOnView() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(async () => {
      await markNotificationsReadAction();
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [router]);
  return null;
}
