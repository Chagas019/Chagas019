import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Send, Wrench } from "lucide-react";
import { getViewer } from "@/server/session";
import { savedExampleSlugs } from "@/server/services/studio";
import { EXAMPLE_AREAS, EXAMPLES, LEVEL_LABEL, getExample } from "@/lib/creative/examples";
import { ExamplePreview } from "@/components/studio/example-preview";
import { CreateVersionButton, SaveExampleButton } from "@/components/studio/example-actions";
import { ShareButton } from "@/components/post/post-actions";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Container } from "@/components/ui/misc";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return EXAMPLES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props) {
  const e = getExample((await params).slug);
  return e ? { title: `${e.title} — Laboratório Criativo`, description: e.summary } : { title: "Exemplo" };
}

export default async function ExamplePage({ params }: Props) {
  const e = getExample((await params).slug);
  if (!e) notFound();
  const viewer = await getViewer();
  const saved = viewer ? (await savedExampleSlugs(viewer.id)).includes(e.slug) : false;
  const publishHref = `/publicar?titulo=${encodeURIComponent(e.title)}&categoria=${e.category}&texto=${encodeURIComponent(`Minha versão do exemplo “${e.title}” do Laboratório Criativo.`)}`;

  return (
    <Container className="max-w-5xl space-y-10 py-8">
      <Link href="/laboratorio" className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper">
        <ArrowLeft className="size-4" aria-hidden /> Laboratório Criativo
      </Link>
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div className="relative overflow-hidden rounded-[var(--radius-xl)] ring-1 ring-white/[0.08]">
          <ExamplePreview kind={e.preview.kind} colors={e.preview.colors} className="aspect-[4/3]" />
          <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium backdrop-blur">Exemplo FRAME · ilustração</span>
        </div>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="cobalt">{EXAMPLE_AREAS.find((a) => a.slug === e.area)?.label}</Badge>
            <Badge>{LEVEL_LABEL[e.level]}</Badge>
            <Badge>
              <Clock className="size-3" aria-hidden /> {e.minutes} min
            </Badge>
          </div>
          <h1 className="font-display text-5xl leading-[0.95] text-balance">{e.title}</h1>
          <p className="text-lg text-fog-300">{e.summary}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            <CreateVersionButton slug={e.slug} title={e.title} steps={e.steps} signedIn={!!viewer} />
            <SaveExampleButton slug={e.slug} initial={saved} signedIn={!!viewer} />
            <ShareButton title={e.title} path={`/laboratorio/${e.slug}`} />
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">O conceito</h2>
        <p className="max-w-3xl text-pretty leading-relaxed text-fog-200">{e.concept}</p>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-3xl">Passo a passo</h2>
        <ol className="space-y-4">
          {e.steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-volt-500 font-semibold text-ink-950">{i + 1}</span>
              <p className="pt-1.5 text-pretty text-fog-200">{s}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-[var(--radius-lg)] bg-ink-850 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">
          <Wrench className="size-4" aria-hidden /> Ferramentas recomendadas
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {e.tools.map((t) => (
            <li key={t}>
              <Badge>{t}</Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4 rounded-[var(--radius-lg)] bg-ink-900 p-6 ring-1 ring-volt-500/30 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl text-volt-500">Fez a sua versão?</h2>
          <p className="text-fog-300">Publique o resultado na comunidade — de preferência mostrando o antes e depois.</p>
        </div>
        <ButtonLink href={viewer ? publishHref : `/entrar?next=${encodeURIComponent(publishHref)}`}>
          <Send className="size-4" aria-hidden /> Publicar resultado
        </ButtonLink>
      </section>
    </Container>
  );
}
