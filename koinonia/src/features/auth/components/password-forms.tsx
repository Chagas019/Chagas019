"use client";

import { useActionState } from "react";
import { forgotPasswordAction, resetPasswordAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { ButtonLink } from "@/components/ui/button";
import type { Messages } from "@/i18n/types";

export function ForgotPasswordForm({ m }: { m: Messages }) {
  const [state, action] = useActionState(forgotPasswordAction, idleState);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field label={m.auth.email} error={state.fieldErrors?.email} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="email" type="email" autoComplete="email" required aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <SubmitButton pendingLabel={m.common.loading} size="lg" className="w-full">{m.auth.forgotSubmit}</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ m }: { m: Messages }) {
  const [state, action] = useActionState(resetPasswordAction, idleState);
  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage state={state} />
        <ButtonLink href="/painel">{m.nav.dashboard}</ButtonLink>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field label={m.auth.password} hint={m.auth.passwordHint} error={state.fieldErrors?.password} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="password" type="password" autoComplete="new-password" required aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <Field label={m.auth.confirmPassword} error={state.fieldErrors?.confirmPassword} required>
        {({ id, describedBy, invalid }) => <Input id={id} name="confirmPassword" type="password" autoComplete="new-password" required aria-describedby={describedBy} invalid={invalid} />}
      </Field>
      <SubmitButton pendingLabel={m.common.saving} size="lg" className="w-full">{m.auth.resetSubmit}</SubmitButton>
    </form>
  );
}
