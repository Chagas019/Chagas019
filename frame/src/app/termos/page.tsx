import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Termos e privacidade" };

export default function Page() {
  return (
    <Container className="max-w-3xl space-y-8 py-10 text-fog-300 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-paper [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
      <SectionTitle eyebrow="Rascunho para revisão jurídica" title="Termos de uso e privacidade" />
      <p className="rounded-[var(--radius-md)] bg-ember-400/10 p-4 text-sm text-ember-400">
        Este texto é um resumo operacional do que o FRAME faz hoje. Ele precisa ser revisado por um profissional jurídico antes do lançamento público.
      </p>
      <section className="space-y-3">
        <h2>Seu conteúdo é seu</h2>
        <ul>
          <li>Você mantém todos os direitos sobre o que publica. O FRAME só exibe o conteúdo conforme a visibilidade que você escolhe.</li>
          <li>Publique apenas o que você criou ou tem direito de compartilhar. Credite colaboradores.</li>
          <li>Denúncias de violação de direitos autorais podem ser feitas em qualquer publicação (“Denunciar → Violação de direitos autorais”).</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2>Dados que coletamos</h2>
        <ul>
          <li>Conta: nome, e-mail e senha (armazenada com hash).</li>
          <li>Perfil: as informações que você preencher. Localização é opcional e oculta por padrão.</li>
          <li>Fotos: removemos metadados EXIF, inclusive GPS, ao processar o envio.</li>
          <li>FRAME AI: registramos apenas quantidade de uso e custo estimado, não o conteúdo das conversas.</li>
        </ul>
      </section>
      <section className="space-y-3">
        <h2>Seus direitos (LGPD)</h2>
        <ul>
          <li>Exportar seus dados a qualquer momento em Configurações → Segurança e dados.</li>
          <li>Excluir sua conta definitivamente, com remoção dos arquivos.</li>
          <li>Controlar indexação por buscadores, notificações, bloqueios e silenciamentos.</li>
        </ul>
      </section>
    </Container>
  );
}
