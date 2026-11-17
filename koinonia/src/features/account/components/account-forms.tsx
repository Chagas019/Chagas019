"use client";

import { useActionState } from "react";
import { deleteAccountAction, uploadAvatarAction } from "../actions";
import { idleState } from "@/lib/action-state";
import { Field, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import type { Messages } from "@/i18n/types";

export function AvatarForm({ m }: { m: Messages }) {
  const [state, action] = useActionState(uploadAvatarAction, idleState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label={m.account.avatar} hint={m.account.avatarHint}>
        {({ id, describedBy }) => <Input id={id} name="avatar" type="file" accept="image/png,image/jpeg,image/webp" required aria-describedby={describedBy} className="h-auto py-2" />}
      </Field>
      <SubmitButton pendingLabel={m.common.saving} variant="outline" size="sm" className="self-start">{m.account.avatarSubmit}</SubmitButton>
    </form>
  );
}

export function DeleteAccountForm({ m }: { m: Messages }) {
  const [state, action] = useActionState(deleteAccountAction, idleState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <Field label={m.account.deleteConfirm} required>
        {({ id }) => <Input id={id} name="confirm" autoComplete="off" required pattern="EXCLUIR" />}
      </Field>
      <SubmitButton pendingLabel={m.common.loading} variant="danger" className="self-start">{m.account.deleteSubmit}</SubmitButton>
    </form>
  );
}
