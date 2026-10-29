"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createPasswordAction } from "@/server/actions/profile";

export function CreatePasswordForm({ email, next }: { email: string; next: string }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const r = await createPasswordAction(String(fd.get("password") ?? ""), String(fd.get("confirm") ?? ""));
          if (!r.ok) {
            setErrors({ ...(r.fields ?? {}), form: r.fields ? "" : r.error });
            return;
          }
          toast.show(r.message ?? "Senha criada.");
          router.push(next);
          router.refresh();
        });
      }}
    >
      <Field label="E-mail confirmado" id="cp-email">
        <Input id="cp-email" value={email} readOnly autoComplete="username" className="opacity-80" />
      </Field>
      <Field label="Crie sua senha" id="password" error={errors.password} hint="Mínimo de 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required invalid={!!errors.password} />
      </Field>
      <Field label="Repita a senha" id="confirm" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required invalid={!!errors.confirm} />
      </Field>
      {errors.form ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" loading={pending}>
        Criar senha e entrar
      </Button>
    </form>
  );
}
