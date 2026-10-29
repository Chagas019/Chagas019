import { redirect } from "next/navigation";
import { requireViewerPage } from "@/server/session";
import { hasPassword } from "@/server/services/profiles";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Boas-vindas" };

export default async function Page() {
  const viewer = await requireViewerPage("/onboarding");
  if (viewer.onboarded) redirect("/");
  // Conta criada pelo link do e-mail: primeiro a pessoa cria a senha.
  if (!(await hasPassword(viewer.id))) redirect("/criar-senha");
  return (
    <Container className="max-w-3xl py-12">
      <SectionTitle eyebrow="Boas-vindas ao FRAME" title={`Vamos montar seu espaço, ${viewer.displayName.split(" ")[0]}.`}>
        Três passos rápidos para o FRAME mostrar o que importa para você.
      </SectionTitle>
      <div className="mt-10">
        <OnboardingForm defaults={{ handle: viewer.handle, displayName: viewer.displayName }} />
      </div>
    </Container>
  );
}
