import { Suspense } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getViewer } from "@/server/session";
import { EXAMPLES, LEVEL_LABEL } from "@/lib/creative/examples";
import { dayIndex } from "@/lib/creative/daily";
import { StudioBar } from "@/components/studio/studio-bar";
import { DailyChallenge } from "@/components/studio/daily-challenge";
import { ExamplePreview } from "@/components/studio/example-preview";
import { IdeaGenerator } from "@/components/studio/idea-generator";
import { Container } from "@/components/ui/misc";
import { Sparkle } from "@/components/ui/sparkle";

export const metadata = {
  title: "Creative Studio",
  description: "Inspiração, técnicas, desafios e ideias para fotógrafos, videomakers, designers e editores.",
};

export default async function CreativeStudioPage() {
  const viewer = await getViewer();
  // Três exemplos em rotação diária, um de cada área diferente quando possível.
  const start = dayIndex() % EXAMPLES.length;
  const featured = [0, 5, 10].map((o) => EXAMPLES[(start + o) % EXAMPLES.length]!);

  return (
    <div className="overflow-x-clip bg-[radial-gradient(900px_420px_at_50%_-10%,rgb(39_52_240/0.22),transparent_70%)]">
      <Container className="space-y-14 py-10 sm:py-14">
        <header className="space-y-8 text-center">
          <div className="space-y-3">
            <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fog-300">
              <Sparkle className="size-3.5 text-volt-500" /> Creative Studio
            </p>
            <h1 className="mx-auto max-w-4xl font-display text-[clamp(2.8rem,8vw,6rem)] leading-[0.9] text-balance">
              Entre para publicar. <span className="text-volt-500">Saia com vontade de criar.</span>
            </h1>
          </div>
          <Suspense>
            <StudioBar />
          </Suspense>
        </header>

        <section id="ideia" aria-labelledby="ideia-titulo" className="scroll-mt-24 space-y-5 rounded-[var(--radius-xl)] bg-ink-900/80 p-5 ring-1 ring-inset ring-white/[0.06] sm:p-8">
          <div>
            <h2 id="ideia-titulo" className="font-display text-4xl sm:text-5xl">Me dê uma ideia</h2>
            <p className="mt-1 text-fog-400">Escolha o que quer criar e receba um ponto de partida completo — conceito, roteiro, paleta e legenda.</p>
          </div>
          <IdeaGenerator signedIn={!!viewer} />
        </section>

        <DailyChallenge signedIn={!!viewer} />

        <section aria-labelledby="lab-titulo" className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="lab-titulo" className="font-display text-4xl">Laboratório Criativo</h2>
              <p className="text-sm text-fog-400">Técnicas práticas para sair do bloqueio criativo. Abertas e gratuitas.</p>
            </div>
            <Link href="/laboratorio" className="inline-flex items-center gap-1 text-sm text-volt-500 hover:underline">
              Ver todos os exemplos <ArrowUpRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {featured.map((e) => (
              <li key={e.slug}>
                <Link href={`/laboratorio/${e.slug}`} className="group block overflow-hidden rounded-[var(--radius-lg)] bg-ink-850 ring-1 ring-inset ring-white/[0.06] transition-transform duration-500 hover:-translate-y-1">
                  <ExamplePreview kind={e.preview.kind} colors={e.preview.colors} className="aspect-[16/10]" />
                  <div className="space-y-1.5 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-fog-500">
                      {LEVEL_LABEL[e.level]} · {e.minutes} min
                    </p>
                    <h3 className="font-display text-2xl leading-tight">{e.title}</h3>
                    <p className="line-clamp-2 text-sm text-fog-400">{e.summary}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </Container>
    </div>
  );
}
