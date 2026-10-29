"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function SignUpForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    const next: Record<string, string> = {};
    if (name.length < 2) next.name = "Informe seu nome.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) next.email = "Informe um e-mail válido.";
    if (password.length < 8) next.password = "A senha precisa de pelo menos 8 caracteres.";
    if (!fd.get("terms")) next.terms = "É preciso aceitar os termos para continuar.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      const msg =
        error.code === "USER_ALREADY_EXISTS" || error.status === 422
          ? "Já existe uma conta com este e-mail."
          : error.status === 429
            ? "Muitas tentativas. Aguarde alguns minutos."
            : "Não foi possível criar a conta. Tente novamente.";
      setErrors({ form: msg });
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="Nome" id="name" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" invalid={!!errors.name} required />
      </Field>
      <Field label="E-mail" id="email" error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" invalid={!!errors.email} required />
      </Field>
      <Field label="Senha" id="password" error={errors.password} hint="Mínimo de 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" invalid={!!errors.password} required />
      </Field>
      <label className="flex items-start gap-3 text-sm text-fog-400">
        <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--color-volt-500)]" />
        <span>
          Li e aceito os <Link href="/termos" className="text-paper underline underline-offset-4">termos de uso</Link>, a <Link href="/privacidade" className="text-paper underline underline-offset-4">política de privacidade</Link> e as <Link href="/diretrizes" className="text-paper underline underline-offset-4">diretrizes</Link>. Só publico o que tenho direito de compartilhar.
        </span>
      </label>
      {errors.terms ? <p className="text-sm text-danger-400">{errors.terms}</p> : null}
      {errors.form ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {errors.form}
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Criar minha conta
      </Button>
    </form>
  );
}
