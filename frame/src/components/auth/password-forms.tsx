"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function RequestResetForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  if (sent)
    return (
      <p role="status" className="rounded-[var(--radius-md)] bg-ink-800 p-4 text-fog-300">
        Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha. Ele expira em 30 minutos.
      </p>
    );
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setLoading(true);
        const email = String(new FormData(e.currentTarget).get("email"));
        // A resposta é sempre a mesma para não revelar quais e-mails têm conta.
        await authClient.requestPasswordReset({ email, redirectTo: "/redefinir-senha" }).catch(() => null);
        setLoading(false);
        setSent(true);
      }}
    >
      <Field label="E-mail da conta" id="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Enviar link
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!token) return <p className="text-danger-400">Link inválido ou expirado. Peça um novo em “Esqueci minha senha”.</p>;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const pw = String(fd.get("password"));
        if (pw.length < 8) return setError("A senha precisa de pelo menos 8 caracteres.");
        if (pw !== String(fd.get("confirm"))) return setError("As senhas não coincidem.");
        setLoading(true);
        const { error } = await authClient.resetPassword({ newPassword: pw, token });
        setLoading(false);
        if (error) return setError("Link inválido ou expirado. Peça um novo.");
        router.push("/entrar?redefinida=1");
      }}
    >
      <Field label="Nova senha" id="password">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirme a nova senha" id="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      {error ? <p role="alert" className="text-sm text-danger-400">{error}</p> : null}
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        Salvar nova senha
      </Button>
    </form>
  );
}
