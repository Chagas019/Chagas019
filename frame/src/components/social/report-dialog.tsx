"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { reportAction } from "@/server/actions/social";
import { REPORT_REASONS } from "@/lib/taxonomy";

export function ReportButton({ targetType, targetId, label = "Denunciar", compact }: { targetType: "post" | "comment" | "user" | "community" | "collab"; targetId: string; label?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={compact ? "text-xs text-fog-500 hover:text-paper" : "inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-fog-400 hover:bg-white/5 hover:text-paper"}>
        {compact ? null : <Flag className="size-4" aria-hidden />}
        {label}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Denunciar">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const details = String(new FormData(e.currentTarget).get("details") ?? "");
            start(async () => {
              const r = await reportAction({ targetType, targetId, reason, details });
              if (!r.ok) return setError(r.fields?.details ?? r.error);
              toast.show(r.message ?? "Denúncia enviada.");
              setOpen(false);
            });
          }}
        >
          <Field label="Motivo" id="reason">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              {REPORT_REASONS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={reason === "copyright" ? "Obra original e onde foi publicada" : "Detalhes"}
            id="details"
            optional={reason !== "copyright"}
            hint={reason === "copyright" ? "Informe o link da obra original e sua relação com ela (autor, representante…)." : undefined}
            error={error ?? undefined}
          >
            <Textarea id="details" name="details" rows={4} maxLength={2000} />
          </Field>
          <p className="text-xs text-fog-500">A pessoa denunciada não sabe quem denunciou. Denúncias falsas podem levar à suspensão.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={pending}>
              Enviar denúncia
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
