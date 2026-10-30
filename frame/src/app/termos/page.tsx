import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/legal/legal-page";
import { features } from "@/server/features";

export const metadata = { title: "Termos de uso" };

export default function Page() {
  const { contactEmail } = features();
  return (
    <LegalPage title="Termos de uso" updated="29 de outubro de 2026" current="/termos">
      <section>
        <h2>1. O que é o FRAME</h2>
        <p>
          O FRAME é uma rede social para fotógrafos, videomakers, editores, designers e criadores visuais publicarem trabalhos, mostrarem o processo,
          aprenderem, participarem de desafios, formarem comunidades e encontrarem parceiros. Ao criar uma conta você concorda com estes termos, com a{" "}
          <Link href="/privacidade" className="text-volt-400 underline underline-offset-4">Política de privacidade</Link> e com as{" "}
          <Link href="/diretrizes" className="text-volt-400 underline underline-offset-4">Diretrizes da comunidade</Link>.
        </p>
      </section>
      <section>
        <h2>2. Sua conta</h2>
        <ul>
          <li>Você precisa ter pelo menos 13 anos. Menores de 18 anos devem usar o FRAME com autorização dos responsáveis.</li>
          <li>As informações do cadastro devem ser verdadeiras. Não se passe por outra pessoa ou marca.</li>
          <li>Você é responsável pela segurança da sua senha e pelo que acontece na sua conta.</li>
          <li>Você pode excluir sua conta a qualquer momento em Configurações → Segurança e dados.</li>
        </ul>
      </section>
      <section>
        <h2>3. Seu conteúdo continua sendo seu</h2>
        <ul>
          <li>Você mantém todos os direitos autorais sobre fotos, vídeos, textos e demais materiais que publica.</li>
          <li>
            Para o FRAME funcionar, você nos concede uma licença não exclusiva, gratuita e mundial para hospedar, armazenar, reproduzir, adaptar
            tecnicamente (por exemplo, gerar miniaturas e converter formatos) e exibir o seu conteúdo, apenas para operar e divulgar o serviço e
            sempre respeitando a visibilidade que você escolheu (público, seguidores aprovados ou só você).
          </li>
          <li>Essa licença termina quando você apaga o conteúdo ou a conta, exceto por cópias que outras pessoas já salvaram ou compartilharam legitimamente dentro do FRAME.</li>
          <li>O FRAME não vende o seu conteúdo nem o usa para treinar modelos de inteligência artificial.</li>
        </ul>
      </section>
      <section>
        <h2>4. O que você pode publicar</h2>
        <ul>
          <li>Publique apenas o que você criou ou tem autorização para compartilhar, e credite as pessoas envolvidas.</li>
          <li>Retratos de terceiros exigem o consentimento das pessoas fotografadas ou filmadas, especialmente de menores de idade.</li>
          <li>Conteúdo que viole a lei ou as Diretrizes da comunidade pode ser removido, e a conta pode ser suspensa.</li>
        </ul>
      </section>
      <section>
        <h2>5. Direitos autorais</h2>
        <p>
          Se você encontrar uma obra sua publicada sem autorização, use “Denunciar → Violação de direitos autorais” na publicação, informando onde a
          obra original foi publicada e sua relação com ela. Avaliamos cada pedido e removemos o conteúdo quando a violação é confirmada.
          Contas com violações repetidas podem ser encerradas.
        </p>
      </section>
      <section>
        <h2>6. Collab, desafios e mensagens</h2>
        <ul>
          <li>As oportunidades do Collab são publicadas pelos próprios usuários. O FRAME não é parte dos acordos, pagamentos ou contratos combinados entre as pessoas.</li>
          <li>Nunca pague para participar de um trabalho e não envie documentos pessoais por mensagem. Denuncie ofertas suspeitas.</li>
          <li>Nos desafios, as regras de votação ficam publicadas na página de cada desafio. Votos de contas falsas ou combinadas são descartados.</li>
        </ul>
      </section>
      <section>
        <h2>7. Moderação e encerramento</h2>
        <p>
          Podemos remover conteúdo, limitar funções ou encerrar contas que violem estes termos ou as diretrizes. Quando um conteúdo seu é removido,
          ele continua visível para você com um aviso, e você pode exportar seus dados.
        </p>
      </section>
      <section>
        <h2>8. Disponibilidade e responsabilidade</h2>
        <p>
          Trabalhamos para manter o FRAME estável e seguro, mas o serviço é oferecido “como está” e pode passar por interrupções e mudanças.
          Mantenha cópias dos seus arquivos originais. Na extensão permitida pela lei, o FRAME não responde por acordos entre usuários nem por
          conteúdo publicado por terceiros.
        </p>
      </section>
      <section>
        <h2>9. Mudanças e contato</h2>
        <p>
          Podemos atualizar estes termos; mudanças relevantes serão avisadas no site antes de entrarem em vigor. Dúvidas: fale com a equipe do FRAME{" "}
          <ContactLine email={contactEmail} />. Estes termos seguem as leis do Brasil.
        </p>
      </section>
    </LegalPage>
  );
}
