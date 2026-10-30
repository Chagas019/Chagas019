"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { applyAction, decideApplicationAction, deleteListingAction, setListingStatusAction } from "@/server/actions/collab";

export function ApplyForm({ listingId, code }: { listingId: string; code?: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await applyAction({ listingId, message: String(fd.get("message") ?? ""), portfolioUrl: String(fd.get("portfolioUrl") ?? "") }, code);
          if (!r.ok) {
            setErrors(r.fields ?? {});
            return toast.show(r.error, "error");
          }
          toast.show(r.message ?? "Enviado.");
          router.refresh();
        });
      }}
    >
      <Field label="Por que você?" id="message" error={errors.message} hint="Conte sua experiência e disponibilidade. Não compartilhe documentos pessoais.">
        <Textarea id="message" name="message" rows={4} maxLength={1500} invalid={!!errors.message} />
      </Field>
      <Field label="Link do portfólio" id="portfolioUrl" optional error={errors.portfolioUrl}>
        <Input id="portfolioUrl" name="portfolioUrl" type="url" placeholder="https://" />
      </Field>
      <Button type="submit" loading={pending}>
        Tenho interesse
      </Button>
    </form>
  );
}

export function DecisionButtons({ applicationId }: { applicationId: string }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  const act = (d: "accepted" | "declined") =>
    start(async () => {
      const r = await decideApplicationAction(applicationId, d);
      toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
      router.refresh();
    });
  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={pending} onClick={() => act("accepted")}>
        Aceitar
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => act("declined")}>
        Recusar
      </Button>
    </div>
  );
}

export function OwnerListingControls({ id, status, shareCode }: { id: string; status: "open" | "closed" | "removed"; shareCode: string | null }) {
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  if (status === "removed") return <p className="text-sm text-danger-400">Removida pela moderação.</p>;
  return (
    <div className="space-y-3">
      {shareCode ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            await navigator.clipboard.writeText(`${window.location.origin}/collab/${id}?codigo=${shareCode}`);
            toast.show("Link privado copiado.");
          }}
        >
          <Copy className="size-4" aria-hidden /> Copiar link privado
        </Button>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await setListingStatusAction(id, status === "open" ? "closed" : "open");
              toast.show(r.ok ? (r.message ?? "Feito.") : r.error, r.ok ? "success" : "error");
              router.refresh();
            })
          }
        >
          {status === "open" ? "Encerrar candidaturas" : "Reabrir"}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() =>
            confirm("Excluir esta oportunidade e todas as candidaturas?") &&
            start(async () => {
              const r = await deleteListingAction(id);
              if (!r.ok) return toast.show(r.error, "error");
              router.push("/collab");
            })
          }
        >
          Excluir
        </Button>
      </div>
    </div>
  );
}
