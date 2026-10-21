import { useContent } from '@/hooks/useData';
import { useSeo } from '@/hooks/useSeo';
import { openCookiePreferences } from '@/components/layout/CookieConsent';

/** Política de privacidade (LGPD) e termos de uso. Dados da imobiliária vêm do painel (Conteúdo → Contato). */
export default function LegalPage({ doc }: { doc: 'privacidade' | 'termos' }) {
  const { data } = useContent();
  const c = data?.contact;
  const controller = c?.legalName ? `${c.legalName}${c.cnpj ? `, CNPJ ${c.cnpj}` : ''}` : 'a imobiliária responsável por este site (razão social e CNPJ a configurar no painel)';
  const email = c?.email || 'o e-mail de contato informado no rodapé';
  const title = doc === 'privacidade' ? 'Política de privacidade' : 'Termos de uso';
  useSeo({ title: `${title} | NEXORA Real Estate`, description: title, path: `/${doc}` });

  return (
    <div className="theme-light min-h-screen bg-bg pb-section pt-[calc(var(--header-h)+2.5rem)] text-fg">
      <article className="container max-w-3xl [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-medium [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_p]:text-[15.5px] [&_ul]:space-y-1.5 [&_ul]:text-[15px]">
        <p className="eyebrow mb-3">Documento</p>
        <h1 className="text-display-lg font-medium">{title}</h1>
        <p className="mt-3 text-sm text-muted">Versão de 21 de outubro de 2026. Modelo de referência: revise com sua assessoria jurídica antes de publicar.</p>
        {doc === 'privacidade' ? (
          <>
            <h2>1. Quem trata seus dados</h2>
            <p>O controlador dos dados pessoais é {controller}. Dúvidas e pedidos sobre seus dados podem ser enviados para {email}.</p>
            <h2>2. Quais dados coletamos e por quê</h2>
            <ul>
              <li><strong>Formulários de contato e de visita</strong>: nome, e-mail, telefone (opcional), mensagem, imóvel de interesse e data desejada — para responder à sua solicitação e agendar a visita (art. 7º, I e V, da LGPD).</li>
              <li><strong>Conta (opcional)</strong>: e-mail e nome, para guardar seus favoritos na conta.</li>
              <li><strong>Armazenamento no navegador</strong>: favoritos, comparação, preferências de acessibilidade e, se você permitir, o histórico de imóveis vistos. Ficam no seu aparelho.</li>
            </ul>
            <p>Não usamos cookies de publicidade, não vendemos dados e não fazemos rastreamento entre sites.</p>
            <h2>3. Com quem compartilhamos</h2>
            <ul>
              <li>Provedor de banco de dados e autenticação (Supabase), como operador, para guardar as solicitações com segurança.</li>
              <li>OpenStreetMap, apenas se você clicar para abrir o mapa de um imóvel.</li>
              <li>WhatsApp, apenas se você escolher conversar por lá.</li>
            </ul>
            <h2>4. Por quanto tempo</h2>
            <p>As solicitações ficam guardadas pelo tempo do atendimento e por até 24 meses depois, salvo obrigação legal. Você pode pedir a exclusão antes disso.</p>
            <h2>5. Seus direitos</h2>
            <p>Você pode confirmar se tratamos seus dados, acessá-los, corrigi-los, pedir anonimização, portabilidade ou exclusão e revogar o consentimento (art. 18 da LGPD), escrevendo para {email}.</p>
            <h2>6. Preferências</h2>
            <p><button type="button" onClick={openCookiePreferences} className="text-signal underline-offset-4 hover:underline">Alterar preferências de armazenamento</button></p>
            <h2>7. Endereço dos imóveis</h2>
            <p>Para proteger proprietários e moradores, os anúncios mostram somente a região aproximada. O endereço é informado pelo consultor ao confirmar a visita.</p>
          </>
        ) : (
          <>
            <h2>1. Uso do site</h2>
            <p>O site apresenta imóveis para venda e locação e permite solicitar informações e visitas. Ao usá-lo, você concorda com estes termos.</p>
            <h2>2. Informações dos anúncios</h2>
            <p>Valores, áreas e características são informados pelos proprietários e podem mudar sem aviso. Imagens, plantas, modelos 3D e panoramas marcados como ilustrativos ou demonstrativos não representam o estado real do imóvel. Confirme tudo com um consultor antes de qualquer decisão.</p>
            <h2>3. Imóveis de demonstração</h2>
            <p>Os anúncios marcados como “Demonstração” são fictícios e existem apenas para apresentar os recursos da plataforma.</p>
            <h2>4. Conta</h2>
            <p>Você é responsável pela senha da sua conta. Contas da equipe têm acesso ao painel administrativo conforme o papel atribuído.</p>
            <h2>5. Propriedade intelectual</h2>
            <p>Marca, textos, imagens e modelos 3D pertencem aos respectivos titulares e não podem ser reproduzidos sem autorização.</p>
            <h2>6. Contato</h2>
            <p>Dúvidas sobre estes termos: {email}.</p>
          </>
        )}
      </article>
    </div>
  );
}
