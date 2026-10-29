"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-4xl">Algo saiu do foco</h1>
      <p className="mt-2 max-w-md text-fog-400">Tivemos um problema ao carregar esta página. Tente de novo — se continuar, avise a equipe.</p>
      <Button className="mt-8" onClick={reset}>Tentar novamente</Button>
    </Container>
  );
}
