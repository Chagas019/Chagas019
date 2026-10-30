import { requireViewerPage } from "@/server/session";
import { CreateCommunityForm } from "@/components/community/create-form";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Criar comunidade" };

export default async function Page() {
  await requireViewerPage("/comunidades/nova");
  return (
    <Container className="max-w-2xl py-10">
      <SectionTitle eyebrow="Comunidades" title="Crie um espaço para sua turma" />
      <div className="mt-8">
        <CreateCommunityForm />
      </div>
    </Container>
  );
}
