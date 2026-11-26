import Image from "next/image";

/** Telas de autenticação: imagem editorial à esquerda, formulário à direita (faixa curta no mobile). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-lab grid gap-8 py-6 md:py-10 lg:min-h-[calc(100dvh-72px)] lg:grid-cols-12 lg:gap-12 lg:py-10">
      <aside className="relative h-40 overflow-hidden rounded-[22px] bg-graphite grain sm:h-52 lg:col-span-6 lg:h-auto lg:min-h-[640px] lg:rounded-[28px]">
        <Image src="/demo/scenes/neon.webp" alt="" aria-hidden fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover object-[50%_35%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-ink/10" />
        <div className="absolute inset-x-0 bottom-0 p-5 md:p-8 lg:p-10">
          <p className="lab-label hidden text-bone/70 lg:block">Nº 004 — Bancada de cor</p>
          <p className="display mt-3 text-[clamp(1.9rem,4.6vw,4.25rem)]">
            A luz é sua.
            <span className="serif-accent block pt-1 text-[0.62em] leading-[1.05] text-bone/90 lg:pt-3">
              o laboratório guarda <span className="text-signal">o resto.</span>
            </span>
          </p>
        </div>
      </aside>
      <div className="flex items-center lg:col-span-6">
        <div className="mx-auto w-full max-w-[460px] pb-10 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
