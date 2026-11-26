"use client";
import { useActionState } from "react";
import { updateProfileAction } from "@/app/actions/library";
import { TextAreaField, TextField } from "@/components/auth/text-field";
import { FormMessage, type ActionState } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";

export function ProfileForm({ displayName, bio }: { displayName: string; bio: string }) {
  const [state, action] = useActionState<(NonNullable<ActionState> & { values?: { displayName: string; bio: string } }) | undefined, FormData>(async (prev, form) => {
    const res = await updateProfileAction(prev, form);
    return { ...res, values: { displayName: String(form.get("displayName") ?? ""), bio: String(form.get("bio") ?? "") } };
  }, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <TextField name="displayName" label="Nome de exibição" defaultValue={state?.values?.displayName ?? displayName} autoComplete="name" required maxLength={80} error={fe.displayName} />
      <TextAreaField name="bio" label="Bio" defaultValue={state?.values?.bio ?? bio} maxLength={500} rows={4} error={fe.bio} hint="Opcional. Até 500 caracteres — conte o que você fotografa." />
      <SubmitButton pendingLabel="Salvando…">Salvar perfil</SubmitButton>
    </form>
  );
}
