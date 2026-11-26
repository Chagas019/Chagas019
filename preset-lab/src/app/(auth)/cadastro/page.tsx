import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignUpForm } from "@/components/auth/auth-forms";
import { AuthHeading } from "@/components/auth/auth-heading";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/lab");
  return (
    <>
      <AuthHeading kicker="My Lab · Nova conta" title={<>Criar <span className="serif-accent text-signal">conta</span></>}>
        Baixe presets gratuitos, salve favoritos e guarde suas compras numa biblioteca só sua.
      </AuthHeading>
      <SignUpForm />
      <p className="mt-8 border-t hairline pt-6 text-sm text-ash">
        Já tem conta?{" "}
        <Link href="/entrar" className="inline-flex min-h-11 items-center font-medium text-bone underline decoration-signal underline-offset-4 hover:text-signal">
          Entrar
        </Link>
      </p>
    </>
  );
}
