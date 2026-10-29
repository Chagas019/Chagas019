import { notFound } from "next/navigation";
import { requireViewerPage } from "@/server/session";
import { AI_TOOLS, aiConfig, aiQuota } from "@/server/services/ai";
import { Assistant } from "@/components/ai/assistant";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "FRAME AI — assistente criativo" };

export default async function Page() {
  const viewer = await requireViewerPage("/ai");
  const cfg = aiConfig();
  if (!cfg.enabled) notFound();
  const tools = Object.entries(AI_TOOLS).map(([slug, t]) => ({ slug, label: t.label, hint: t.hint }));
  return (
    <Container className="space-y-8 py-10">
      <SectionTitle eyebrow="FRAME AI" title="Um assistente para pensar, não para criar por você">
        Ideias de ensaio, roteiros, shot lists, briefings e mais. Não editamos suas imagens com IA — o FRAME AI trabalha com texto.
      </SectionTitle>
      <Assistant tools={tools} quota={await aiQuota(viewer.id)} />
    </Container>
  );
}
