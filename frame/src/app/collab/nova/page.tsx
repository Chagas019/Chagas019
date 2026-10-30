import { requireViewerPage } from "@/server/session";
import { ListingForm } from "@/components/collab/listing-form";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Publicar oportunidade", robots: { index: false } };

export default async function Page() {
  await requireViewerPage("/collab/nova");
  return (
    <Container className="max-w-2xl py-10">
      <SectionTitle eyebrow="Collab" title="Publique uma oportunidade">
        Seja específico sobre o projeto, a remuneração e o prazo. Ofertas enganosas são removidas.
      </SectionTitle>
      <div className="mt-8">
        <ListingForm />
      </div>
    </Container>
  );
}
