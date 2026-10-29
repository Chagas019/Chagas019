import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { MagicLinkForm } from "@/components/auth/magic-link-form";
import { features } from "@/server/features";
import { getViewer } from "@/server/session";
import { safeNext } from "@/lib/safe-redirect";

export const metadata = { title: "Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; redefinida?: string; link?: string }> }) {
  const sp = await searchParams;
  if (await getViewer()) redirect(safeNext(sp.next));
  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle={sp.redefinida ? "Senha redefinida. Entre com a nova senha." : sp.link === "invalido" ? "Esse link expirou ou já foi usado. Peça um novo abaixo." : "Entre para continuar criando."}
      footer={
        <>
          Novo no FRAME?{" "}
          <Link href="/cadastro" className="text-paper underline underline-offset-4">
            Crie sua conta
          </Link>
        </>
      }
    >
      {features().mail ? (
        <div className="space-y-6">
          <MagicLinkForm mode="signin" next={sp.next} />
          <details className="group rounded-[var(--radius-md)] bg-ink-900/60 p-4 ring-1 ring-white/[0.06]">
            <summary className="cursor-pointer text-sm text-fog-400 hover:text-paper">Prefiro entrar com senha</summary>
            <div className="mt-4">
              <SignInForm next={sp.next} />
            </div>
          </details>
        </div>
      ) : (
        <SignInForm next={sp.next} />
      )}
    </AuthCard>
  );
}
