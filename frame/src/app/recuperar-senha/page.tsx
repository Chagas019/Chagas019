import { AuthCard } from "@/components/auth/auth-card";
import { RequestResetForm } from "@/components/auth/password-forms";

export const metadata = { title: "Recuperar senha" };

export default function Page() {
  return (
    <AuthCard title="Recuperar senha" subtitle="Enviaremos um link para o e-mail da sua conta.">
      <RequestResetForm />
    </AuthCard>
  );
}
