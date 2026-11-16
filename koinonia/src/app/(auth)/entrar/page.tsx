import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/features/auth/session";
import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";
import { Alert } from "@/components/ui";
import { safeRedirectPath } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.nav.login };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const [{ m }, sp, session] = await Promise.all([getI18n(), searchParams, getSession()]);
  const next = safeRedirectPath(sp.next);
  if (session) redirect(next);
  return (
    <AuthCard
      title={m.auth.loginTitle}
      subtitle={m.auth.loginSubtitle}
      footer={<>{m.auth.noAccount} <Link href="/cadastro" className="font-semibold text-accent-ink underline-offset-4 hover:underline">{m.nav.signup}</Link></>}
    >
      {sp.erro === "link" ? <Alert tone="warning" className="mb-5">{m.auth.linkInvalid}</Alert> : null}
      <LoginForm m={m} next={next} />
    </AuthCard>
  );
}
