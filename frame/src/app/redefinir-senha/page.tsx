import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/password-forms";

export const metadata = { title: "Nova senha", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthCard title="Crie uma nova senha">
      <ResetPasswordForm token={token ?? null} />
    </AuthCard>
  );
}
