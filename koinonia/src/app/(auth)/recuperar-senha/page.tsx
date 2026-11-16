import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/password-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.auth.forgotTitle };
}

export default async function ForgotPage() {
  const { m } = await getI18n();
  return (
    <AuthCard title={m.auth.forgotTitle} subtitle={m.auth.forgotSubtitle} footer={<Link href="/entrar" className="font-semibold text-accent-ink underline-offset-4 hover:underline">{m.common.back}</Link>}>
      <ForgotPasswordForm m={m} />
    </AuthCard>
  );
}
