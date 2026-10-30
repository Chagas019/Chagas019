import Link from "next/link";
import { Container } from "@/components/ui/misc";

const DOCS = [
  { href: "/termos", label: "Termos de uso" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/diretrizes", label: "Diretrizes da comunidade" },
];

export function LegalPage({ title, updated, current, children }: { title: string; updated: string; current: string; children: React.ReactNode }) {
  return (
    <Container className="max-w-3xl py-12">
      <nav aria-label="Documentos" className="mb-8 flex flex-wrap gap-2">
        {DOCS.map((d) => (
          <Link
            key={d.href}
            href={d.href}
            aria-current={d.href === current ? "page" : undefined}
            className={d.href === current ? "rounded-[var(--radius-xs)] bg-volt-500 px-3 py-1.5 text-sm text-ink-950" : "rounded-[var(--radius-xs)] bg-ink-850 px-3 py-1.5 text-sm text-fog-400 hover:text-paper"}
          >
            {d.label}
          </Link>
        ))}
      </nav>
      <h1 className="font-display text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-2 text-sm text-fog-500">Atualizado em {updated}</p>
      <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-fog-300 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-paper [&_li]:mt-1.5 [&_strong]:text-paper [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </Container>
  );
}

export function ContactLine({ email }: { email: string | null }) {
  return email ? (
    <>
      pelo e-mail <span className="select-all font-medium text-paper">{email}</span>
    </>
  ) : (
    <>pelos canais de contato informados no site</>
  );
}
