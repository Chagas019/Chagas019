import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { LegalPage } from "@/components/layout/legal-page";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.legal.privacyTitle };
}

export default async function PrivacyPage() {
  const { m } = await getI18n();
  return (
    <LegalPage title={m.legal.privacyTitle} notice={m.legal.draftNotice} updated="v2026-11">
      <p>Tratamos seus dados com base no consentimento e na execução do serviço, em conformidade com a LGPD (Brasil) e o GDPR (União Europeia).</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Conta: e-mail e senha (armazenada apenas como hash pelo provedor de autenticação).</li>
        <li>Perfil: nome, biografia, país, cidade, idiomas, disponibilidade, talentos e portfólio — você escolhe se o perfil é público, visível apenas a membros ou privado.</li>
        <li>Contatos privados (telefone e e-mail de contato): visíveis somente para você; nunca são exibidos a terceiros.</li>
        <li>Atividade: candidaturas, mensagens, avaliações e denúncias necessárias ao funcionamento do serviço.</li>
      </ul>
      <h2>Como protegemos</h2>
      <ul>
        <li>Controle de acesso por linha no banco de dados (Row Level Security) para cada tabela.</li>
        <li>Criptografia em trânsito (HTTPS) e cabeçalhos de segurança no site.</li>
        <li>Registro de auditoria para ações administrativas.</li>
      </ul>
      <h2>Seus direitos</h2>
      <p>Você pode acessar, corrigir, exportar ou excluir seus dados e revogar o consentimento a qualquer momento nas configurações do perfil ou pelo canal oficial de contato da KOINONIA.</p>
      <h2>Compartilhamento</h2>
      <p>Não vendemos dados e não exibimos anúncios. Dados só são compartilhados com os provedores de infraestrutura necessários (hospedagem e banco de dados).</p>
    </LegalPage>
  );
}
