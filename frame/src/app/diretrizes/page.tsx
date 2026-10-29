import { LegalPage } from "@/components/legal/legal-page";

export const metadata = { title: "Diretrizes da comunidade" };

export default function Page() {
  return (
    <LegalPage title="Diretrizes da comunidade" updated="29 de outubro de 2026" current="/diretrizes">
      <p>O FRAME existe para criadores mostrarem o trabalho, aprenderem uns com os outros e criarem juntos. Estas regras protegem esse espaço.</p>
      <section>
        <h2>Crie e credite</h2>
        <ul>
          <li>Publique trabalhos seus ou que você tem direito de compartilhar.</li>
          <li>Credite modelos, assistentes, coloristas, editores e todos que participaram.</li>
          <li>Presets, LUTs e técnicas de terceiros: diga de onde vieram.</li>
          <li>Inspiração é bem-vinda; cópia não. Recriações de referências devem citar a obra original.</li>
        </ul>
      </section>
      <section>
        <h2>Feedback com respeito</h2>
        <ul>
          <li>Critique o trabalho, nunca a pessoa. Seja específico: luz, cor, enquadramento, ritmo.</li>
          <li>Iniciantes são parte da comunidade. Ninguém precisa “merecer” estar aqui.</li>
          <li>Assédio, ameaças, discurso de ódio e discriminação não são tolerados.</li>
        </ul>
      </section>
      <section>
        <h2>Pessoas retratadas</h2>
        <ul>
          <li>Tenha o consentimento de quem aparece no seu trabalho, especialmente em retratos íntimos, eventos privados e com menores.</li>
          <li>Nudez artística é permitida apenas com consentimento comprovável das pessoas retratadas e nunca envolvendo menores.</li>
          <li>Não publique dados pessoais de terceiros (endereço, telefone, documentos).</li>
        </ul>
      </section>
      <section>
        <h2>Collab e oportunidades</h2>
        <ul>
          <li>Seja claro sobre remuneração, prazos e entregáveis. Trabalho voluntário deve ser declarado como tal.</li>
          <li>Proibido cobrar para participar de vagas, pedir documentos pessoais ou fazer propostas abusivas.</li>
        </ul>
      </section>
      <section>
        <h2>Desafios e votação</h2>
        <ul>
          <li>Envie trabalhos feitos para o tema do desafio, respeitando as regras publicadas.</li>
          <li>Não crie contas extras nem combine votos. Isso desclassifica o trabalho e pode encerrar as contas envolvidas.</li>
        </ul>
      </section>
      <section>
        <h2>Spam e golpes</h2>
        <p>Nada de mensagens em massa, links enganosos, sorteios falsos, venda de seguidores ou curtidas.</p>
      </section>
      <section>
        <h2>O que acontece quando alguém quebra as regras</h2>
        <p>
          Qualquer pessoa pode denunciar uma publicação, comentário, perfil, comunidade ou oportunidade. A moderação analisa cada denúncia; o conteúdo
          pode ser removido e, em casos graves ou repetidos, a conta pode ser suspensa. Você também pode bloquear ou silenciar alguém a qualquer
          momento.
        </p>
      </section>
    </LegalPage>
  );
}
