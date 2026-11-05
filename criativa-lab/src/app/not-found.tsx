import Link from "next/link";

export default function NotFound() {
  return (
    <main className="hairline-grid grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="label mb-6">Erro 404</p>
        <h1 className="display text-[clamp(4rem,14vw,11rem)]">
          Página <span className="accent-serif text-lime">em branco.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md text-fog">Toda página em branco é um convite — mas esta aqui não existe. Que tal voltar ao lab?</p>
        <Link href="/inicio" className="mt-10 inline-flex h-12 items-center rounded-full bg-lime px-6 font-medium text-ink">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
