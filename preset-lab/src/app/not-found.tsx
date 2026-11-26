import Link from "next/link";

export default function NotFound() {
  return (
    <section className="container-lab grid min-h-[60vh] content-center py-20">
      <p className="lab-label text-signal">Erro 404</p>
      <h1 className="display mt-4 text-[clamp(4rem,16vw,14rem)]">Fora de foco.</h1>
      <p className="mt-4 max-w-md text-lg text-ash">Essa página não existe ou foi movida.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/presets" className="inline-flex h-12 items-center rounded-full bg-signal px-6 text-sm font-medium text-signal-ink">
          Ver presets
        </Link>
        <Link href="/" className="inline-flex h-12 items-center rounded-full border border-bone/25 px-6 text-sm">
          Início
        </Link>
      </div>
    </section>
  );
}
