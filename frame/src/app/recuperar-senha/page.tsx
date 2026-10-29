import Link from "next/link";
import { AuthCard } from "@/components/auth/auth-card";
import { RequestResetForm } from "@/components/auth/password-forms";
import { features } from "@/server/features";

export const metadata = { title: "Recuperar senha" };

export default function Page() {
  const { mail, contactEmail } = features();
  return (
    <AuthCard title="Recuperar senha" subtitle={mail ? "Enviaremos um link para o e-mail da sua conta." : undefined}>
      {mail ? (
        <RequestResetForm />
      ) : (
        <div className="space-y-4 rounded-[var(--radius-md)] bg-ink-850 p-5 text-sm text-fog-300">
          <p>A recuperação de senha por e-mail ainda não está disponível.</p>
          <p>
            {contactEmail ? (
              <>
                Escreva para <span className="select-all font-medium text-paper">{contactEmail}</span> a partir do e-mail da sua conta e ajudamos você a recuperar o acesso.
              </>
            ) : (
              "Fale com a equipe do FRAME para recuperar o acesso."
            )}
          </p>
          <Link href="/entrar" className="inline-block text-paper underline underline-offset-4">
            Voltar para o login
          </Link>
        </div>
      )}
    </AuthCard>
  );
}
