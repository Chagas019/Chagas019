import { ContactLine, LegalPage } from "@/components/legal/legal-page";
import { features } from "@/server/features";

export const metadata = { title: "Política de privacidade" };

export default function Page() {
  const { contactEmail } = features();
  return (
    <LegalPage title="Política de privacidade" updated="29 de outubro de 2026" current="/privacidade">
      <p>Esta política explica quais dados pessoais o FRAME trata, por quê e quais são os seus direitos segundo a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
      <section>
        <h2>Dados que tratamos</h2>
        <ul>
          <li><strong>Conta:</strong> nome, e-mail e senha (guardada apenas como hash; ninguém da equipe consegue lê-la).</li>
          <li><strong>Perfil:</strong> identificador, biografia, especialidades, interesses, links, equipamento e, se você quiser, cidade e e-mail de contato.</li>
          <li><strong>Conteúdo:</strong> publicações, fotos, vídeos, comentários, mensagens, coleções, candidaturas e votos.</li>
          <li><strong>Uso e segurança:</strong> endereço IP e navegador da sessão, registros de acesso e contagens anti-abuso.</li>
          <li><strong>FRAME AI (quando ativo):</strong> registramos apenas quantidade de uso e custo estimado, não o conteúdo das conversas.</li>
        </ul>
      </section>
      <section>
        <h2>Para que usamos</h2>
        <ul>
          <li>Operar sua conta e exibir seu conteúdo conforme a visibilidade escolhida (execução do contrato).</li>
          <li>Montar o feed com base nos interesses que você informou e sugerir criadores, comunidades e desafios.</li>
          <li>Prevenir fraude, spam e abuso, e moderar denúncias (legítimo interesse e segurança dos usuários).</li>
          <li>Cumprir obrigações legais e atender pedidos de autoridades competentes.</li>
        </ul>
        <p className="mt-3">Não vendemos dados pessoais e não exibimos publicidade direcionada.</p>
      </section>
      <section>
        <h2>Fotos e localização</h2>
        <p>
          Ao enviar uma foto, removemos automaticamente os metadados EXIF, inclusive a localização GPS. Vídeos ainda são armazenados como enviados,
          com os metadados originais: se o seu vídeo tiver localização gravada, remova-a antes de enviar. A cidade no perfil é opcional e fica oculta
          por padrão.
        </p>
      </section>
      <section>
        <h2>Com quem compartilhamos</h2>
        <ul>
          <li>Com outros usuários, de acordo com a visibilidade de cada publicação e com as suas configurações de contato e mensagens.</li>
          <li>
            Com fornecedores que nos ajudam a operar o serviço, sob contrato: hospedagem e armazenamento de arquivos (Vercel), banco de dados (Neon)
            e, quando ativos, envio de e-mail e provedores de inteligência artificial. Alguns desses fornecedores processam dados fora do Brasil, com as
            salvaguardas previstas na LGPD.
          </li>
        </ul>
      </section>
      <section>
        <h2>Cookies</h2>
        <p>Usamos apenas cookies essenciais para manter você conectado com segurança. Não usamos cookies de publicidade ou de rastreamento de terceiros.</p>
      </section>
      <section>
        <h2>Por quanto tempo guardamos</h2>
        <ul>
          <li>Enquanto sua conta existir. Ao excluir a conta, apagamos perfil, publicações, arquivos, comentários, conexões e votos.</li>
          <li>Denúncias que você fez permanecem anonimizadas para o histórico de moderação.</li>
          <li>Arquivos enviados e não publicados são apagados automaticamente em até 24 horas.</li>
        </ul>
      </section>
      <section>
        <h2>Seus direitos</h2>
        <ul>
          <li><strong>Acesso e portabilidade:</strong> baixe todos os seus dados em Configurações → Segurança e dados → Baixar meus dados.</li>
          <li><strong>Correção:</strong> edite seu perfil a qualquer momento.</li>
          <li><strong>Exclusão:</strong> exclua sua conta em Configurações → Segurança e dados.</li>
          <li><strong>Controle:</strong> escolha quem vê cada publicação, quem pode mandar mensagem, se buscadores podem indexar seu portfólio e quais notificações receber.</li>
          <li>Você também pode pedir informações, revogar consentimentos ou apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</li>
        </ul>
      </section>
      <section>
        <h2>Segurança</h2>
        <p>
          Usamos conexão criptografada, senhas com hash, arquivos privados entregues apenas mediante verificação de permissão, limites contra
          tentativas repetidas e revisões de segurança do código. Nenhum sistema é 100% seguro; se identificarmos um incidente que possa afetar
          você, avisaremos conforme a lei.
        </p>
      </section>
      <section>
        <h2>Contato</h2>
        <p>
          Para exercer seus direitos ou tirar dúvidas sobre privacidade, fale com a equipe do FRAME <ContactLine email={contactEmail} />.
        </p>
      </section>
    </LegalPage>
  );
}
