import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, Terminal } from "lucide-react";
import { AuthHeading } from "@/components/auth/auth-heading";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirme seu e-mail" };

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  const shownEmail = typeof email === "string" && email.length <= 254 ? email : null;
  const local = config.backend === "local";
  return (
    <>
      <AuthHeading kicker="Quase lá" title={<>Confirme seu <span className="serif-accent text-signal">e-mail</span></>} />
      <div className="rounded-[22px] border hairline bg-graphite p-6">
        <MailCheck className="size-7 text-signal" aria-hidden />
        <p className="mt-4 text-[16px] leading-relaxed text-ash">
          Enviamos um link de confirmação para {shownEmail ? <strong className="break-all font-medium text-bone">{shownEmail}</strong> : "o seu e-mail"}. Clique nele para ativar sua conta e entrar no My Lab.
        </p>
        <p className="mt-3 text-sm text-smoke">Não chegou? Confira a caixa de spam ou promoções. O link vale por 24 horas.</p>
      </div>
      {local && (
        <div className="mt-4 rounded-[22px] border border-signal/40 bg-signal/10 p-5 text-sm">
          <p className="lab-label flex items-center gap-2 text-signal">
            <Terminal className="size-3.5" aria-hidden /> Modo local de desenvolvimento
          </p>
          <p className="mt-2 leading-relaxed text-ash">Neste ambiente nenhum e-mail real é enviado. A mensagem fica na caixa de saída local.</p>
          <Link href="/dev/emails" className="mt-3 inline-flex min-h-11 items-center font-medium text-bone underline decoration-signal underline-offset-4 hover:text-signal">
            Abrir caixa de saída local
          </Link>
        </div>
      )}
      <p className="mt-8 text-sm text-ash">
        Já confirmou?{" "}
        <Link href="/entrar" className="inline-flex min-h-11 items-center font-medium text-bone underline decoration-signal underline-offset-4 hover:text-signal">
          Entrar
        </Link>
      </p>
    </>
  );
}
