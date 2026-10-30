"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { resolveReportAction, restoreContentAction } from "@/server/actions/moderation";

export function ReportActions({ reportId }: { reportId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const act = (a: "remove" | "dismiss") =>
    start(async () => {
      const r = await resolveReportAction(reportId, a);
      toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
      router.refresh();
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="danger" disabled={pending} onClick={() => act("remove")}>Remover conteúdo</Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("dismiss")}>Arquivar</Button>
    </div>
  );
}

export function RestoreButton({ targetType, targetId }: { targetType: "post" | "comment"; targetId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await restoreContentAction(targetType, targetId);
          toast.show(r.ok ? (r.message ?? "Restaurado.") : r.error, r.ok ? "success" : "error");
          router.refresh();
        })
      }
    >
      Restaurar
    </Button>
  );
}
