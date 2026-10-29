"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/safe-redirect";

/**
 * Acesso sem senha: a pessoa digita o e-mail e recebe um link de acesso.
 * No cadastro, o mesmo link cria a conta (com aceite dos termos antes do envio).
 */
export function MagicLinkForm({ mode, next }: { mode: "signin" | "signup"; next?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const name = String(fd.get("name") ?? "").trim().slice(0, 60);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Digite um e-mail válido.");
    if (mode === "signup" && !fd.get("terms")) return setError("É preciso aceitar os termos para continuar.");
    setLoading(true);
    const { error } = await authClient.signIn.magicLink({
      email,
      name: name || undefined,
      callbackURL: safeNext(next),
      newUserCallbackURL: "/onboarding",
      errorCallbackURL: "/entrar?link=invalido",
    });
    setLoading(false);
    if (error) {
      setError(error.status === 429 ? "Muitos pedidos seguidos. Aguarde alguns minutos." : "Não foi possível enviar o link agora. Tente de novo em instantes.");
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div role="status" className="space-y-4 rounded-[24px] bg-ink-900 p-6 ring-1 ring-volt-500/30">
        <MailCheck className="size-8 text-volt-500" aria-hidden />
        <p className="text-xl font-medium text-paper">Confira seu e-mail</p>
        <p className="text-fog-300">
          Mandamos um link de acesso para <span className="chip-mono">{sentTo}</span>. Toque nele para {mode === "signup" ? "criar sua conta e entrar" : "entrar"}. Ele vale por 15 minutos.
        </p>
        <p className="text-sm text-fog-500">Não chegou? Olhe a caixa de spam ou promoções.</p>
        <button type="button" onClick={() => setSentTo(null)} className="text-sm text-volt-500 underline underline-offset-4">
          Usar outro e-mail ou enviar de novo
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {mode === "signup" ? (
        <Field label="Seu nome" id="ml-name" optional>
          <Input id="ml-name" name="name" autoComplete="name" maxLength={60} />
        </Field>
      ) : null}
      <Field label="E-mail" id="ml-email">
        <Input id="ml-email" name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      {mode === "signup" ? (
        <label className="flex items-start gap-3 text-sm text-fog-400">
          <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-[var(--color-volt-500)]" />
          <span>
            Li e aceito os <Link href="/termos" className="text-paper underline underline-offset-4">termos de uso</Link>, a <Link href="/privacidade" className="text-paper underline underline-offset-4">política de privacidade</Link> e as <Link href="/diretrizes" className="text-paper underline underline-offset-4">diretrizes</Link>.
          </span>
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </p>
      ) : null}
      <Button type="submit" className="w-full" size="lg" loading={loading}>
        {mode === "signup" ? "Receber link de acesso" : "Enviar link para entrar"}
      </Button>
      <p className="text-center text-xs text-fog-500">Sem senha: você recebe um link no e-mail e entra com um toque.</p>
    </form>
  );
}
