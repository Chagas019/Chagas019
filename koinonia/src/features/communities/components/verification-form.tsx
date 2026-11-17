"use client";

import { useActionState } from "react";
import { requestVerificationAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import type { Messages } from "@/i18n/types";

export function VerificationForm({ m, communityId }: { m: Messages; communityId: string }) {
  const [state, action] = useActionState(requestVerificationAction, idleState);
  if (state.status === "success") return <FormMessage state={state} />;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="communityId" value={communityId} />
      <Field label={m.communities.verificationEvidence} error={state.fieldErrors?.evidence} required>
        {({ id, describedBy, invalid }) => <Textarea id={id} name="evidence" rows={5} minLength={20} maxLength={3000} required aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <SubmitButton pendingLabel={m.common.loading} variant="gold" className="self-start">{m.communities.verificationSubmit}</SubmitButton>
    </form>
  );
}
