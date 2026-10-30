import { notFound } from "next/navigation";
import { isModerator, requireViewerPage } from "@/server/session";
import { CreateChallengeForm } from "@/components/challenge/create-form";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Novo desafio", robots: { index: false } };

export default async function Page() {
  const viewer = await requireViewerPage("/desafios/novo");
  if (!isModerator(viewer)) notFound();
  return (
    <Container className="max-w-2xl py-10">
      <SectionTitle eyebrow="Creative Battles" title="Novo desafio" />
      <div className="mt-8"><CreateChallengeForm /></div>
    </Container>
  );
}
