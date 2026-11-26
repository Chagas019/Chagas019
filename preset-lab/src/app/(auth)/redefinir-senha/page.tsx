import type { Metadata } from "next";
import Link from "next/link";
import { UpdatePasswordForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "@/components/auth/auth-heading";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Nova senha" };

export default async function UpdatePasswordPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <AuthHeading kicker="Acesso · Recuperação" title={<>Link <span className="serif-accent text-signal">expirado</span></>}>
          Para criar uma nova senha, abra o link de recuperação enviado ao seu e-mail. Se ele expirou ou já foi usado, peça outro.
        </AuthHeading>
        <Button asChild size="lg" className="w-full">
          <Link href="/recuperar-senha">Pedir novo link</Link>
        </Button>
      </>
    );
  }
  return (
    <>
      <AuthHeading kicker="Acesso · Nova senha" title={<>Nova <span className="serif-accent text-signal">senha</span></>}>
        Defina a nova senha da conta <strong className="break-all font-medium text-bone">{user.email}</strong>.
      </AuthHeading>
      <UpdatePasswordForm />
    </>
  );
}
