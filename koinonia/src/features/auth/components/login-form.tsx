"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui/field";
import { FormMessage, prev, SubmitButton } from "@/components/ui/form";
import type { Messages } from "@/i18n/types";

export function LoginForm({ m, next }: { m: Messages; next: string }) {
  const [state, action] = useActionState(loginAction, idleState);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next} />
      <Field label={m.auth.email} error={state.fieldErrors?.email} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={prev(state, "email")} aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>
      <Field label={m.auth.password} error={state.fieldErrors?.password} required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} name="password" type="password" autoComplete="current-password" required aria-describedby={describedBy} invalid={invalid} />
        )}
      </Field>
      <div className="-mt-2 text-right text-sm">
        <Link href="/recuperar-senha" className="font-medium text-accent-ink underline-offset-4 hover:underline">{m.auth.forgot}</Link>
      </div>
      <SubmitButton pendingLabel={m.common.loading} size="lg" className="w-full">{m.auth.submitLogin}</SubmitButton>
    </form>
  );
}
