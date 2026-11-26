"use client";
import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  return (
    <section className="container-lab grid min-h-[60vh] content-center py-20">
      <p className="lab-label text-signal">Algo deu errado</p>
      <h1 className="display mt-4 text-[clamp(3rem,11vw,9rem)]">Superexposto.</h1>
      <p className="mt-4 max-w-md text-ash">Não conseguimos carregar esta página agora.{error.digest ? ` Código: ${error.digest}` : ""}</p>
      <button onClick={reset} className="mt-8 inline-flex h-12 w-fit items-center rounded-full bg-bone px-6 text-sm font-medium text-ink">
        Tentar de novo
      </button>
    </section>
  );
}
