import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getViewer } from "@/server/session";

export const metadata = { title: "Criar conta" };

export default async function Page() {
  if (await getViewer()) redirect("/");
  return (
    <AuthCard
      title="Crie seu FRAME"
      subtitle="Leva menos de um minuto. Depois você escolhe seus interesses."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/entrar" className="text-paper underline underline-offset-4">
            Entrar
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
