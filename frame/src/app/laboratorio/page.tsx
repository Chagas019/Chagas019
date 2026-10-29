import Link from "next/link";
import { BookmarkCheck } from "lucide-react";
import { getViewer } from "@/server/session";
import { savedExampleSlugs } from "@/server/services/studio";
import { EXAMPLE_AREAS, EXAMPLES, LEVEL_LABEL, type ExampleArea } from "@/lib/creative/examples";
import { ExamplePreview } from "@/components/studio/example-preview";
import { PageHero } from "@/components/ui/page-hero";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/misc";
import { cn } from "@/lib/utils";

export const metadata = { title: "Laboratório Criativo", description: "Exemplos práticos de fotografia, vídeo, design e edição para sair do bloqueio criativo." };

export default async function LabPage({ searchParams }: { searchParams: Promise<{ area?: string; nivel?: string }> }) {
  const sp = await searchParams;
  const area = EXAMPLE_AREAS.find((a) => a.slug === sp.area)?.slug ?? null;
  const level = (["iniciante", "intermediario", "avancado"] as const).find((l) => l === sp.nivel) ?? null;
  const viewer = await getViewer();
  const saved = new Set(viewer ? await savedExampleSlugs(viewer.id) : []);
  const list = EXAMPLES.filter((e) => (!area || e.area === area) && (!level || e.level === level));
  const href = (a: ExampleArea | null, l: string | null) => {
    const p = new URLSearchParams();
    if (a) p.set("area", a);
    if (l) p.set("nivel", l);
    return `/laboratorio${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHero eyebrow="Recursos abertos" title="Laboratório Criativo" action={<ButtonLink href="/estudio-criativo#ideia">Me dê uma ideia</ButtonLink>}>
        Exemplos práticos escritos pela equipe FRAME: conceito, passo a passo e ferramentas. Salve, crie a sua versão e publique o resultado na comunidade.
      </PageHero>
      <Container className="space-y-8 py-10">
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label="Áreas" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {[{ slug: null, label: "Tudo" }, ...EXAMPLE_AREAS].map((a) => (
              <Link key={a.label} href={href(a.slug as ExampleArea | null, level)} aria-current={area === a.slug ? "page" : undefined} className={cn("shrink-0 rounded-full px-4 py-2 text-sm", area === a.slug ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-300 hover:text-paper")}>
                {a.label}
              </Link>
            ))}
          </nav>
          <nav aria-label="Nível" className="flex gap-1.5 sm:ml-auto">
            {(["iniciante", "intermediario", "avancado"] as const).map((l) => (
              <Link key={l} href={href(area, level === l ? null : l)} aria-current={level === l ? "page" : undefined} className={cn("rounded-full px-3 py-1.5 text-xs ring-1 ring-inset", level === l ? "bg-paper text-ink-950 ring-paper" : "text-fog-400 ring-white/10 hover:text-paper")}>
                {LEVEL_LABEL[l]}
              </Link>
            ))}
          </nav>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => (
            <li key={e.slug}>
              <Link href={`/laboratorio/${e.slug}`} className="group block h-full overflow-hidden rounded-[var(--radius-lg)] bg-ink-850 ring-1 ring-inset ring-white/[0.06] transition-[transform,box-shadow] duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-pop)]">
                <div className="relative">
                  <ExamplePreview kind={e.preview.kind} colors={e.preview.colors} className="aspect-[16/10] transition-transform duration-700 group-hover:scale-[1.03]" />
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-medium text-paper backdrop-blur">Exemplo FRAME</span>
                  {saved.has(e.slug) ? <BookmarkCheck className="absolute right-3 top-3 size-5 text-volt-500" aria-label="Salvo" /> : null}
                </div>
                <div className="space-y-2 p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-fog-500">
                    {EXAMPLE_AREAS.find((a) => a.slug === e.area)?.label} · {LEVEL_LABEL[e.level]} · {e.minutes} min
                  </p>
                  <h2 className="font-display text-2xl leading-tight">{e.title}</h2>
                  <p className="text-sm text-fog-400">{e.summary}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {list.length === 0 ? <p className="text-fog-400">Nenhum exemplo com esses filtros.</p> : null}
        <p className="text-sm text-fog-500">
          Quer ver técnicas ensinadas por criadores da comunidade? Visite o <Link href="/lab" className="text-paper underline underline-offset-4">FRAME LAB</Link>.
        </p>
      </Container>
    </>
  );
}
