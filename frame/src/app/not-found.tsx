import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-8xl text-volt-300">404</p>
      <h1 className="mt-4 font-display text-4xl">Fora de quadro</h1>
      <p className="mt-2 max-w-md text-fog-400">Esta página não existe, foi removida ou é privada.</p>
      <ButtonLink href="/" className="mt-8">Voltar para a Inspiração</ButtonLink>
    </Container>
  );
}
