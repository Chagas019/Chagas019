import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getViewer } from "@/server/session";
import { safeNext } from "@/lib/safe-redirect";

export const metadata = { title: "Entrar" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; redefinida?: string }> }) {
  const sp = await searchParams;
  if (await getViewer()) redirect(safeNext(sp.next));
  return (
    <AuthCard
      title="Bem-vindo de volta"
      subtitle={sp.redefinida ? "Senha redefinida. Entre com a nova senha." : "Entre para continuar criando."}
      footer={
        <>
          Novo no FRAME?{" "}
          <Link href="/cadastro" className="text-paper underline underline-offset-4">
            Crie sua conta
          </Link>
        </>
      }
    >
      <SignInForm next={sp.next} />
    </AuthCard>
  );
}
