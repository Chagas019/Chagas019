import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { CreatePasswordForm } from "@/components/auth/create-password-form";
import { getViewer } from "@/server/session";
import { hasPassword } from "@/server/services/profiles";

export const metadata = { title: "Criar senha", robots: { index: false } };

/** Destino do link do e-mail para contas novas: e-mail já confirmado, falta só a senha. */
export default async function CreatePasswordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?link=invalido");
  const next = viewer.onboarded ? "/" : "/onboarding";
  if (await hasPassword(viewer.id)) redirect(next);
  return (
    <AuthCard title="Crie sua senha" subtitle="Seu e-mail está confirmado. Agora defina a senha que você vai usar para entrar na FRAME.">
      <CreatePasswordForm email={viewer.email} next={next} />
    </AuthCard>
  );
}
