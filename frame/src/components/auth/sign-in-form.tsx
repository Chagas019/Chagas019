"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-redirect";

export function SignInForm({ next }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({ email: String(fd.get("email")), password: String(fd.get("password")) });
    setLoading(false);
    if (error) {
      setError(error.status === 429 ? "Muitas tentativas. Aguarde um minuto." : "E-mail ou senha incorretos.");
      return;
    }
    router.push(safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <Field label="E-mail" id="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Senha" id="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Entrar
      </Button>
      <p className="text-center text-sm">
        <Link href="/recuperar-senha" className="text-fog-400 underline-offset-4 hover:text-paper hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </form>
  );
}
