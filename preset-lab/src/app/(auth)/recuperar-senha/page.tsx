import type { Metadata } from "next";
import Link from "next/link";
import { ResetRequestForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "@/components/auth/auth-heading";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Recuperar senha" };

export default function ResetRequestPage() {
  return (
    <>
      <AuthHeading kicker="Acesso · Recuperação" title={<>Esqueci a <span className="serif-accent text-signal">senha</span></>}>
        Informe o e-mail da sua conta. Se ele estiver cadastrado, enviaremos um link para criar uma nova senha.
      </AuthHeading>
      <ResetRequestForm />
      {config.backend === "local" && (
        <p className="mt-4 text-sm text-smoke">
          Modo local: o link aparece na{" "}
          <Link href="/dev/emails" className="inline-flex min-h-11 items-center text-bone underline decoration-signal underline-offset-4">
            caixa de saída local
          </Link>
          .
        </p>
      )}
      <p className="mt-8 border-t hairline pt-6 text-sm text-ash">
        Lembrou?{" "}
        <Link href="/entrar" className="inline-flex min-h-11 items-center font-medium text-bone underline decoration-signal underline-offset-4 hover:text-signal">
          Voltar para o login
        </Link>
      </p>
    </>
  );
}
