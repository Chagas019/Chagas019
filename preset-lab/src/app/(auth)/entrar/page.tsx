import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { SignInForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "@/components/auth/auth-heading";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

const ERRORS: Record<string, string> = {
  "link-invalido": "Este link expirou ou já foi usado. Entre com sua senha ou peça um novo link.",
  "sessao-expirada": "Sua sessão expirou. Entre novamente.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/lab");
  if (await getCurrentUser()) redirect(next);
  const error = sp.erro ? (ERRORS[sp.erro] ?? "Não foi possível concluir a ação. Tente novamente.") : null;

  return (
    <>
      <AuthHeading kicker="My Lab · Acesso" title={<>Entrar<span className="text-signal">.</span></>}>
        Sua biblioteca de presets, favoritos e compras em um só lugar.
      </AuthHeading>
      {error && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}
      <SignInForm next={next} />
      <p className="mt-8 border-t hairline pt-6 text-sm text-ash">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="inline-flex min-h-11 items-center font-medium text-bone underline decoration-signal underline-offset-4 hover:text-signal">
          Criar conta grátis
        </Link>
      </p>
    </>
  );
}
