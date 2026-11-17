import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/features/auth/session";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/password-forms";
import { ButtonLink, StatePanel } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.auth.resetTitle };
}

export default async function ResetPage() {
  const [{ m }, session] = await Promise.all([getI18n(), getSession()]);
  if (!session) {
    return (
      <StatePanel variant="forbidden" title={m.auth.resetTitle} headingLevel={1} action={<ButtonLink href="/recuperar-senha">{m.auth.forgotSubmit}</ButtonLink>}>
        <p>{m.auth.linkInvalid}</p>
      </StatePanel>
    );
  }
  return (
    <AuthCard title={m.auth.resetTitle}>
      <ResetPasswordForm m={m} />
    </AuthCard>
  );
}
