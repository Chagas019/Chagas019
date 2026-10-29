import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { GraduationCap, Plus } from "lucide-react";
import { getViewer } from "@/server/session";
import { listCards } from "@/server/services/posts";
import { post, tutorial } from "@/server/db/schema";
import { PostGrid } from "@/components/post/post-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { LAB_TOPICS, LEVELS } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

export const metadata = { title: "FRAME LAB — tutoriais de edição, fotografia e vídeo" };

export default async function Page({ searchParams }: { searchParams: Promise<{ area?: string; nivel?: string; salvos?: string }> }) {
  const sp = await searchParams;
  const viewer = await getViewer();
  const topic = LAB_TOPICS.find((t) => t.slug === sp.area)?.slug;
  const level = LEVELS.find((l) => l.slug === sp.nivel)?.slug;
  const onlySaved = sp.salvos === "1" && viewer;
  const where = and(
    eq(post.kind, "tutorial"),
    topic ? eq(tutorial.topic, topic) : undefined,
    level ? eq(tutorial.level, level) : undefined,
    onlySaved ? sql`exists (select 1 from saved_item s where s.post_id = ${post.id} and s.user_id = ${viewer!.id})` : undefined,
  );
  const cards = await listCards(viewer?.id ?? null, where, 60);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { area: topic, nivel: level, salvos: onlySaved ? "1" : undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/lab?${s}` : "/lab";
  };

  return (
    <Container className="space-y-10 py-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SectionTitle eyebrow="FRAME LAB" title="Aprenda com quem cria">
          Tutoriais com contexto: nível, tempo, app e etapas. Avalie o que foi útil e salve para praticar depois.
        </SectionTitle>
        {viewer ? (
          <ButtonLink href="/publicar?tipo=tutorial" size="lg">
            <Plus className="size-4" aria-hidden /> Ensinar algo
          </ButtonLink>
        ) : null}
      </div>

      <div className="space-y-3">
        <nav aria-label="Áreas" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          <Link href={qs({ area: undefined })} className={cn("shrink-0 rounded-full px-4 py-2 text-sm", !topic ? "bg-paper text-ink-950" : "bg-ink-850 text-fog-400 hover:text-paper")}>
            Todas as áreas
          </Link>
          {LAB_TOPICS.map((t) => (
            <Link key={t.slug} href={qs({ area: t.slug })} className={cn("shrink-0 rounded-full px-4 py-2 text-sm", topic === t.slug ? "bg-paper text-ink-950" : "bg-ink-850 text-fog-400 hover:text-paper")}>
              {t.label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Nível" className="flex flex-wrap gap-2">
          {[{ slug: undefined, label: "Todos os níveis" }, ...LEVELS].map((l) => (
            <Link key={l.label} href={qs({ nivel: l.slug })} className={cn("rounded-full px-3 py-1.5 text-xs", level === l.slug ? "bg-volt-500/20 text-volt-300" : "text-fog-500 ring-1 ring-ink-700 hover:text-paper")}>
              {l.label}
            </Link>
          ))}
          {viewer ? (
            <Link href={qs({ salvos: onlySaved ? undefined : "1" })} className={cn("rounded-full px-3 py-1.5 text-xs", onlySaved ? "bg-cobalt-500/20 text-cobalt-400" : "text-fog-500 ring-1 ring-ink-700 hover:text-paper")}>
              Meus tutoriais salvos
            </Link>
          ) : null}
        </nav>
      </div>

      {cards.length ? (
        <PostGrid cards={cards} signedIn={!!viewer} />
      ) : (
        <EmptyState icon={<GraduationCap className="size-6" />} title={onlySaved ? "Nenhum tutorial salvo" : "Nenhum tutorial aqui ainda"} action={viewer ? <ButtonLink href="/publicar?tipo=tutorial">Publicar um tutorial</ButtonLink> : undefined}>
          {onlySaved ? "Use o botão Salvar nos tutoriais para montar sua trilha de estudo." : "Compartilhe o que você sabe — o FRAME LAB cresce com a comunidade."}
        </EmptyState>
      )}
    </Container>
  );
}
