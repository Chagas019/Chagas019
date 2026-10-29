import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { features } from "@/server/features";
import { getViewer } from "@/server/session";

export const metadata = { title: "Criar conta" };

export default async function Page() {
  if (await getViewer()) redirect("/");
  return (
    <AuthCard
      title="Crie seu FRAME"
      subtitle={features().mail ? "Digite seu e-mail e receba seu link de acesso. Depois você escolhe seu nome de usuário e interesses." : "Leva menos de um minuto. Depois você escolhe seus interesses."}
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/entrar" className="text-paper underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      {features().mail ? (
        <div className="space-y-6">
          <MagicLinkForm mode="signup" />
          <details className="rounded-[var(--radius-md)] bg-ink-900/60 p-4 ring-1 ring-white/[0.06]">
            <summary className="cursor-pointer text-sm text-fog-400 hover:text-paper">Prefiro criar com senha</summary>
            <div className="mt-4">
              <SignUpForm />
            </div>
          </details>
        </div>
      ) : (
        <SignUpForm />
      )}
    </AuthCard>
  );
}
