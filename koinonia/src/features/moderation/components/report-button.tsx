"use client";

import { useActionState, useId, useState } from "react";
import { Flag } from "lucide-react";
import { reportAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { reportReasonValues } from "@/schemas/common";
import type { Messages } from "@/i18n/types";
import type { ReportTarget } from "@/types/database";

/** Denúncia em painel expansível (sem modal, acessível por teclado). */
export function ReportButton({ m, targetType, targetId, label }: { m: Messages; targetType: ReportTarget; targetId: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(reportAction, idleState);
  const panelId = useId();
  return (
    <div className="w-full">
      <Button variant="ghost" size="sm" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((v) => !v)} className="text-ink-muted">
        <Flag aria-hidden />{label}
      </Button>
      <div id={panelId} hidden={!open} className="mt-3 rounded-lg border border-border bg-surface p-4">
        {state.status === "success" ? <FormMessage state={state} /> : (
          <form action={action} className="flex flex-col gap-4">
            <FormMessage state={state} />
            <input type="hidden" name="targetType" value={targetType} />
            <input type="hidden" name="targetId" value={targetId} />
            <Field label={m.report.reason} required>
              {({ id }) => (
                <Select id={id} name="reason" required defaultValue="spam">
                  {reportReasonValues.map((r) => <option key={r} value={r}>{m.report.reasons[r]}</option>)}
                </Select>
              )}
            </Field>
            <Field label={m.report.details} optionalLabel={m.common.optional}>
              {({ id }) => <Textarea id={id} name="details" rows={3} maxLength={2000} />}
            </Field>
            <SubmitButton pendingLabel={m.common.loading} variant="danger" size="sm" className="self-start">{m.report.submit}</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
