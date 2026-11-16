"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { FormMessage, prev, SubmitButton } from "@/components/ui/form";
import { StatePanel } from "@/components/ui/state-panel";
import type { Messages } from "@/i18n/types";

function withLink(template: string, token: string, href: string, label: string) {
  const [before, after] = template.split(token);
  return (
    <>
      {before}
      <Link href={href} target="_blank" className="font-semibold text-accent-ink underline underline-offset-2">{label}</Link>
      {after}
    </>
  );
}

export function SignupForm({ m }: { m: Messages }) {
  const [state, action] = useActionState(signupAction, idleState);
  if (state.status === "success") {
    return <StatePanel variant="success" title={m.auth.checkEmailTitle} className="border-none px-0 py-4"><p>{state.message}</p></StatePanel>;
  }
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field label={m.auth.displayName} error={state.fieldErrors?.displayName} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="displayName" autoComplete="name" required maxLength={80} defaultValue={prev(state, "displayName")} aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>
      <Field label={m.auth.email} error={state.fieldErrors?.email} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={prev(state, "email")} aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>
      <Field label={m.auth.password} hint={m.auth.passwordHint} error={state.fieldErrors?.password} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="password" type="password" autoComplete="new-password" minLength={10} required aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>
      <Field label={m.auth.confirmPassword} error={state.fieldErrors?.confirmPassword} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="confirmPassword" type="password" autoComplete="new-password" required aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>
      <div className="flex flex-col gap-3">
        <Checkbox name="acceptTerms" error={state.fieldErrors?.acceptTerms} label={withLink(m.auth.acceptTerms, "{terms}", "/termos", m.auth.termsLink)} />
        <Checkbox name="acceptPrivacy" error={state.fieldErrors?.acceptPrivacy} label={withLink(m.auth.acceptPrivacy, "{privacy}", "/privacidade", m.auth.privacyLink)} />
      </div>
      <SubmitButton pendingLabel={m.common.loading} size="lg" className="w-full">{m.auth.submitSignup}</SubmitButton>
    </form>
  );
}
