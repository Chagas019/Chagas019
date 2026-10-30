import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "drizzle-orm";
import { ArrowLeft, Clock, Gauge, Package, Send } from "lucide-react";
import { post } from "@/server/db/schema";
import { getViewer } from "@/server/session";
import { listCards } from "@/server/services/posts";
import { LAB_CHALLENGES, getLabChallenge, labTag } from "@/lib/creative/lab-challenges";
import { JoinLabButton } from "@/components/studio/lab-actions";
import { ShareButton } from "@/components/post/post-actions";
import { EditorialGrid } from "@/components/post/editorial-grid";
import { Container } from "@/components/ui/misc";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LAB_CHALLENGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props) {
  const c = getLabChallenge((await params).slug);
  return c ? { title: `${c.title} — LAB`, description: c.description } : { title: "LAB" };
}

export default async function LabChallengePage({ params }: Props) {
  const c = getLabChallenge((await params).slug);
  if (!c) notFound();
  const viewer = await getViewer();
  const tag = labTag(c.slug);
  const entries = await listCards(viewer?.id ?? null, sql`${post.tags} @> array[${tag}]::text[] and ${post.communityId} is null`, 24);
  const publish = `/publicar?titulo=${encodeURIComponent(c.title)}&categoria=${c.category}&texto=${encodeURIComponent(`Minha resposta à missão “${c.title}” do LAB.\n\n#${tag}`)}`;

  return (
    <Container className="max-w-6xl space-y-10 py-6 sm:py-10">
      <Link href="/lab" className="inline-flex items-center gap-1.5 text-sm text-fog-400 hover:text-paper">
        <ArrowLeft className="size-4" aria-hidden /> LAB
      </Link>

      <article className="overflow-hidden rounded-[32px] bg-ink-900 ring-1 ring-white/[0.07]">
        <div className="h-2" style={{ background: c.accent }} aria-hidden />
        <div className="grid gap-10 p-6 sm:p-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-fog-400">Missão · {c.categoryLabel}</p>
            <h1 className="font-display text-[clamp(2.6rem,7vw,5.5rem)] leading-[0.88]">{c.title}</h1>
            <p className="max-w-xl text-pretty text-lg text-fog-300">{c.description}</p>
            <ul className="flex flex-wrap gap-2 text-xs">
              <li className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5"><Gauge className="size-3.5" aria-hidden /> {c.level}</li>
              <li className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5"><Clock className="size-3.5" aria-hidden /> ~{c.minutes} min</li>
              {c.suggestedDays ? <li className="rounded-full bg-white/[0.06] px-3 py-1.5">Prazo sugerido: {c.suggestedDays} dias</li> : null}
              <li className="rounded-full bg-white/[0.06] px-3 py-1.5 font-mono">#{tag}</li>
            </ul>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <JoinLabButton slug={c.slug} title={c.title} steps={c.steps} days={c.suggestedDays} signedIn={!!viewer} />
              <Link href={viewer ? publish : `/entrar?next=${encodeURIComponent(publish)}`} className="inline-flex h-12 items-center gap-2 rounded-full px-5 ring-1 ring-inset ring-white/20 hover:bg-white/[0.05]">
                <Send className="size-4" aria-hidden /> Publicar resultado
              </Link>
              <ShareButton title={c.title} path={`/lab/${c.slug}`} />
            </div>
          </div>
          <div className="space-y-6">
            <section>
              <h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.3em] text-volt-500"><Package className="size-4" aria-hidden /> Materiais</h2>
              <ul className="mt-3 space-y-1.5 text-fog-200">
                {c.materials.map((m) => (
                  <li key={m}>— {m}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-volt-500">Etapas sugeridas</h2>
              <ol className="mt-3 space-y-3">
                {c.steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="font-display text-2xl leading-none" style={{ color: c.accent }}>{i + 1}</span>
                    <span className="text-fog-200">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </article>

      <section className="space-y-5">
        <h2 className="font-display text-4xl">Participantes</h2>
        {entries.length ? (
          <EditorialGrid cards={entries} signedIn={!!viewer} viewerId={viewer?.id ?? null} />
        ) : (
          <p className="rounded-[24px] border border-dashed border-white/15 p-8 text-center text-fog-400">Ainda não há publicações com #{tag}. A primeira pode ser a sua.</p>
        )}
      </section>
    </Container>
  );
}
