import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/features/auth/session";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.nav.signup };
}

export default async function SignupPage() {
  const [{ m }, session] = await Promise.all([getI18n(), getSession()]);
  if (session) redirect("/painel");
  return (
    <AuthCard
      title={m.auth.signupTitle}
      subtitle={m.auth.signupSubtitle}
      footer={<>{m.auth.hasAccount} <Link href="/entrar" className="font-semibold text-accent-ink underline-offset-4 hover:underline">{m.nav.login}</Link></>}
    >
      <SignupForm m={m} />
    </AuthCard>
  );
}
