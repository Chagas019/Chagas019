import type { Metadata } from "next";
import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { TextField } from "@/components/auth/text-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { ProfileForm } from "@/components/lab/lab-forms";
import { LabSectionTitle } from "@/components/lab/lab-ui";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser("/lab/perfil");
  const p = user.profile;
  return (
    <div className="grid gap-12 lg:grid-cols-12">
      <section className="lg:col-span-7" aria-labelledby="perfil">
        <LabSectionTitle kicker="Dados públicos" title={<span id="perfil">Perfil</span>} />
        <div className="mt-8 max-w-xl">
          <ProfileForm displayName={p.display_name} bio={p.bio} />
        </div>
      </section>
      <aside className="space-y-4 lg:col-span-5" aria-label="Conta">
        <div className="rounded-[22px] border hairline bg-graphite p-6">
          <p className="lab-label text-smoke">Conta</p>
          <div className="mt-5">
            <TextField name="email" label="E-mail" value={user.email} readOnly aria-readonly className="cursor-default text-ash" hint="O e-mail de acesso não pode ser alterado por aqui." />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t hairline pt-5">
            <div>
              <dt className="lab-label text-smoke">Membro desde</dt>
              <dd className="mt-1.5 text-[15px]">{formatDate(p.created_at)}</dd>
            </div>
            <div>
              <dt className="lab-label text-smoke">Tipo de conta</dt>
              <dd className="mt-1.5 text-[15px]">{p.role === "admin" ? "Administrador" : "Fotógrafo"}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-[22px] border hairline bg-graphite p-6">
          <p className="lab-label text-smoke">Segurança</p>
          <p className="mt-3 text-sm leading-relaxed text-ash">Para trocar a senha, enviaremos um link para o seu e-mail.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/recuperar-senha" className="inline-flex h-11 items-center rounded-full border border-bone/25 px-5 text-sm hover:border-bone">
              Trocar senha
            </Link>
            <form action={signOutAction}>
              <SubmitButton variant="ghost" pendingLabel="Saindo…" data-testid="signout">
                Sair da conta
              </SubmitButton>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
}
