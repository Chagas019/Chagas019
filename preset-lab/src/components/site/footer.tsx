import Link from "next/link";
import { Logo } from "./logo";

const COLS = [
  { title: "Explorar", links: [{ href: "/presets", label: "Todos os presets" }, { href: "/presets?acesso=free", label: "Gratuitos" }, { href: "/presets?acesso=premium", label: "Premium" }, { href: "/presets?ordem=popular", label: "Mais baixados" }] },
  { title: "Estúdio", links: [{ href: "/estilos", label: "Style Explorer" }, { href: "/inspiracao", label: "Inspiration" }, { href: "/premium", label: "Premium Club" }, { href: "/colecoes", label: "Coleções" }] },
  { title: "Conta", links: [{ href: "/lab", label: "My Lab" }, { href: "/lab/favoritos", label: "Favoritos" }, { href: "/lab/compras", label: "Compras" }, { href: "/ajuda", label: "Como instalar presets" }] },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 overflow-hidden border-t hairline bg-graphite">
      <div className="container-lab grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 font-serif text-2xl italic leading-snug text-ash">Your creative space for photo editing.</p>
          <p className="mt-4 text-sm leading-relaxed text-smoke">Presets para Lightroom pensados como peças de estúdio. Preços em reais, pagamento via Mercado Pago (PIX e cartão).</p>
        </div>
        {COLS.map((c) => (
          <div key={c.title}>
            <h2 className="lab-label text-smoke">{c.title}</h2>
            <ul className="mt-4 space-y-3">
              {c.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="link-underline text-sm text-bone/80 hover:text-bone">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div aria-hidden className="display pointer-events-none select-none whitespace-nowrap px-2 text-center text-[19vw] leading-[0.78] text-bone/[0.04]">
        Preset Lab
      </div>
      <div className="border-t hairline">
        <div className="container-lab flex flex-col gap-2 py-6 text-xs text-smoke md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} PRESET LAB. Todos os direitos reservados.</p>
          <p className="lab-label">Feito no Brasil · BRL</p>
        </div>
      </div>
    </footer>
  );
}
