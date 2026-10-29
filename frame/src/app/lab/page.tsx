import Link from "next/link";
import { ArrowUpRight, BookOpen, GraduationCap, Lightbulb } from "lucide-react";
import { getViewer } from "@/server/session";
import { labParticipantCounts } from "@/server/services/studio";
import { LAB_CHALLENGES, labTag } from "@/lib/creative/lab-challenges";
import { IdeaLauncher } from "@/components/studio/idea-launcher";
import { Container } from "@/components/ui/misc";

export const metadata = { title: "LAB", description: "Missões criativas para transformar inspiração em projetos concretos." };

export default async function LabPage() {
  const viewer = await getViewer();
  const counts = await labParticipantCounts(LAB_CHALLENGES.map((c) => labTag(c.slug)));

  return (
    <Container className="space-y-12 py-6 sm:py-10">
      <header className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-volt-500">FRAME / LAB</p>
          <h1 className="mt-3 font-display text-[clamp(3.4rem,12vw,9rem)] leading-[0.82]">
            LAB<span className="text-volt-500">.</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-lg text-fog-300">Missões curtas com regras claras. Aceite uma, produza no seu estúdio e publique o resultado na comunidade.</p>
        </div>
        <div className="flex flex-col gap-2 rounded-[28px] bg-ink-900 p-4 ring-1 ring-white/[0.06]">
          <IdeaLauncher signedIn={!!viewer} variant="sheet" />
          <Link href="/laboratorio" className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 hover:bg-white/[0.05]">
            <Lightbulb className="size-5 text-volt-500" aria-hidden /> <span className="flex-1">Técnicas passo a passo</span> <ArrowUpRight className="size-4 text-fog-500" aria-hidden />
          </Link>
          <Link href="/lab/tutoriais" className="flex items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 hover:bg-white/[0.05]">
            <GraduationCap className="size-5 text-volt-500" aria-hidden /> <span className="flex-1">Tutoriais da comunidade</span> <ArrowUpRight className="size-4 text-fog-500" aria-hidden />
          </Link>
        </div>
      </header>

      <section aria-labelledby="missoes" className="space-y-5">
        <h2 id="missoes" className="font-mono text-xs uppercase tracking-[0.3em] text-fog-400">
          Missões abertas · {LAB_CHALLENGES.length}
        </h2>
        <ol className="grid gap-4 md:grid-cols-2">
          {LAB_CHALLENGES.map((c, i) => {
            const n = counts[labTag(c.slug)] ?? 0;
            return (
              <li key={c.slug}>
                <Link href={`/lab/${c.slug}`} className="group relative flex h-full overflow-hidden rounded-[24px] bg-ink-900 ring-1 ring-white/[0.07] transition-transform duration-500 hover:-translate-y-1">
                  {/* Canhoto do "ingresso": número da missão e cor */}
                  <span className="relative flex w-16 shrink-0 flex-col items-center justify-between border-r border-dashed border-white/15 py-5 sm:w-20" style={{ background: `linear-gradient(180deg, ${c.accent}26, transparent)` }}>
                    <span className="font-display text-3xl" style={{ color: c.accent }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog-500 [writing-mode:vertical-rl]">{c.categoryLabel}</span>
                  </span>
                  <span className="flex flex-1 flex-col gap-3 p-5">
                    <span className="flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-fog-400">
                      <span>{c.level}</span>·<span>~{c.minutes} min</span>
                      {c.suggestedDays ? <>·<span>prazo {c.suggestedDays}d</span></> : null}
                    </span>
                    <span className="font-display text-3xl leading-[0.95]">{c.title}</span>
                    <span className="line-clamp-2 text-sm text-fog-400">{c.description}</span>
                    <span className="mt-auto flex items-center justify-between pt-2 text-sm">
                      <span className="text-fog-500">{n > 0 ? `${n} ${n === 1 ? "pessoa publicou" : "pessoas publicaram"}` : "Ninguém publicou ainda"}</span>
                      <span className="inline-flex items-center gap-1 text-volt-500">
                        Abrir missão <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </section>

      <p className="flex items-center gap-2 text-sm text-fog-500">
        <BookOpen className="size-4" aria-hidden /> Os Creative Battles com votação e prazo da comunidade continuam em <Link href="/desafios" className="text-paper underline underline-offset-4">Desafios</Link>.
      </p>
    </Container>
  );
}
