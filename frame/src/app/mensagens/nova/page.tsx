import { requireViewerPage } from "@/server/session";
import { NewConversationForm } from "@/components/messages/new-conversation";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Nova mensagem", robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ para?: string }> }) {
  await requireViewerPage("/mensagens/nova");
  const { para } = await searchParams;
  return (
    <Container className="max-w-xl py-10">
      <SectionTitle eyebrow="Mensagens" title="Nova conversa">
        Só é possível escrever para quem aceita mensagens suas: por padrão, pessoas que seguem você ou com quem você tem uma colaboração aceita.
      </SectionTitle>
      <div className="mt-8">
        <NewConversationForm defaultTo={para ? `@${para.replace(/[^a-zA-Z0-9_.]/g, "")}` : ""} />
      </div>
    </Container>
  );
}
