"use client";

import { useActionState } from "react";
import { applyAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import type { Messages } from "@/i18n/types";

export function ApplyForm({ m, opportunityId }: { m: Messages; opportunityId: string }) {
  const [state, action] = useActionState(applyAction, idleState);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="opportunityId" value={opportunityId} />
      <Field label={m.opportunities.applyMessage} hint={m.opportunities.applyMessageHint} error={state.fieldErrors?.message} optionalLabel={m.common.optional}>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="message" rows={4} maxLength={2000} aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <SubmitButton pendingLabel={m.common.loading} variant="gold" size="lg">{m.opportunities.applySubmit}</SubmitButton>
    </form>
  );
}
