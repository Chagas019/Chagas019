import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { LegalPage } from "@/components/layout/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.legal.termsTitle };
}

export default async function TermsPage() {
  const { m } = await getI18n();
  return (
    <LegalPage title={m.legal.termsTitle} notice={m.legal.draftNotice} updated="v2026-11">
      <p>A KOINONIA é uma plataforma gratuita que conecta voluntários, paróquias, comunidades e movimentos católicos para colaboração, partilha de talentos e de recursos.</p>
      <h2>1. Uso da plataforma</h2>
      <ul>
        <li>Você deve fornecer informações verdadeiras e manter sua senha em sigilo.</li>
        <li>Comunidades só publicam oportunidades depois de verificadas pela equipe da KOINONIA.</li>
        <li>É proibido usar a plataforma para fins comerciais, políticos-partidários, spam, assédio ou qualquer atividade ilegal.</li>
      </ul>
      <h2>2. Voluntariado</h2>
      <p>As colaborações são acordadas diretamente entre voluntários e comunidades. A KOINONIA não é empregadora nem intermediária financeira e não cobra por nenhum serviço.</p>
      <h2>3. Conteúdo e moderação</h2>
      <p>Qualquer pessoa pode denunciar perfis, comunidades ou oportunidades. A moderação pode remover conteúdo e suspender contas que violem estes termos.</p>
      <h2>4. Encerramento</h2>
      <p>Você pode solicitar a exclusão da sua conta a qualquer momento; seus dados serão removidos conforme a Política de Privacidade.</p>
    </LegalPage>
  );
}
