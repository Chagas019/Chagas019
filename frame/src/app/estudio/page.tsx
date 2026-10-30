import Image from "next/image";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { Award, CheckCircle2, Circle, FilePen, FolderOpen, Lock } from "lucide-react";
import { db } from "@/server/db";
import { challenge, challengeSubmission, post } from "@/server/db/schema";
import { requireViewerPage } from "@/server/session";
import { achievements, dailyHistory, listIdeas, listProjects, savedExampleSlugs } from "@/server/services/studio";
import { listCards, listDrafts } from "@/server/services/posts";
import { listCollections } from "@/server/services/social";
import { EXAMPLES, getExample } from "@/lib/creative/examples";
import { PostGrid } from "@/components/post/post-card";
import { ExamplePreview } from "@/components/studio/example-preview";
import { IdeaCard } from "@/components/studio/idea-list";
import { NewProjectButton } from "@/components/studio/project-editor";
import { PROJECT_STATUS as STATUS } from "@/lib/creative/status";
import { IconStudio } from "@/components/studio/icons";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState } from "@/components/ui/misc";
import { cn, formatDate, mediaUrl, timeAgo } from "@/lib/utils";

export const metadata = { title: "Meu estúdio", robots: { index: false } };

const TABS = [
  { slug: "visao", label: "Visão geral" },
  { slug: "projetos", label: "Projetos" },
  { slug: "ideias", label: "Ideias" },
  { slug: "referencias", label: "Referências" },
  { slug: "rascunhos", label: "Rascunhos" },
  { slug: "tarefas", label: "Tarefas" },
  { slug: "conquistas", label: "Conquistas e desafios" },
] as const;

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const viewer = await requireViewerPage("/estudio");
  const sp = await searchParams;
  const aba = TABS.find((t) => t.slug === sp.aba)?.slug ?? "visao";
  const [projects, ideas, exampleSlugs, drafts] = await Promise.all([listProjects(viewer.id), listIdeas(viewer.id), savedExampleSlugs(viewer.id), listDrafts(viewer.id)]);
  const active = projects.filter((p) => p.status !== "pronto");
  const openTasks = projects.flatMap((p) => p.tasks.filter((t) => !t.done).map((t) => ({ ...t, projectId: p.id, projectTitle: p.title })));

  return (
    <Container className="space-y-8 py-8 sm:py-10">
      <header className="flex flex-wrap items-center gap-5">
        <span className="btn-3d grid size-16 shrink-0 place-items-center">
          <IconStudio className="size-10" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fog-400">Só você vê</p>
          <h1 className="font-display text-5xl leading-none">Meu estúdio</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/estudio-criativo#ideia" variant="secondary">Me dê uma ideia</ButtonLink>
          <NewProjectButton />
        </div>
      </header>

      <nav aria-label="Seções do estúdio" className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto border-b border-ink-700 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link key={t.slug} href={t.slug === "visao" ? "/estudio" : `/estudio?aba=${t.slug}`} aria-current={aba === t.slug ? "page" : undefined} className={cn("-mb-px shrink-0 border-b-2 px-4 py-3 text-sm transition-colors", aba === t.slug ? "border-volt-500 text-paper" : "border-transparent text-fog-500 hover:text-paper")}>
            {t.label}
          </Link>
        ))}
      </nav>

      {aba === "visao" ? (
        <div className="space-y-10">
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Projetos em andamento", value: active.length, href: "/estudio?aba=projetos" },
              { label: "Tarefas abertas", value: openTasks.length, href: "/estudio?aba=tarefas" },
              { label: "Ideias guardadas", value: ideas.length, href: "/estudio?aba=ideias" },
              { label: "Rascunhos", value: drafts.length, href: "/estudio?aba=rascunhos" },
            ].map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="block rounded-[var(--radius-md)] bg-ink-850 p-5 ring-1 ring-inset ring-white/[0.06] hover:ring-volt-500/50">
                  <p className="font-display text-5xl">{s.value}</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-fog-400">{s.label}</p>
                </Link>
              </li>
            ))}
          </ul>
          <ProjectList projects={active.slice(0, 6)} empty="Nenhum projeto em andamento. Comece por uma ideia ou um exemplo do Laboratório." />
        </div>
      ) : null}

      {aba === "projetos" ? <ProjectList projects={projects} empty="Seus projetos aparecem aqui. Crie um do zero, a partir de uma ideia ou de um exemplo." /> : null}

      {aba === "ideias" ? (
        ideas.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((i) => (
              <li key={i.id}>
                <IdeaCard id={i.id} title={i.title} proposal={i.proposal} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma ideia guardada" action={<ButtonLink href="/estudio-criativo#ideia">Me dê uma ideia</ButtonLink>}>
            Gere propostas criativas e salve as que quiser produzir depois.
          </EmptyState>
        )
      ) : null}

      {aba === "referencias" ? <References userId={viewer.id} exampleSlugs={exampleSlugs} /> : null}

      {aba === "rascunhos" ? (
        drafts.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {drafts.map((d) => (
              <li key={d.id}>
                <Link href={`/p/${d.id}/editar`} className="block overflow-hidden rounded-[var(--radius-md)] bg-ink-850 ring-1 ring-inset ring-white/[0.06] hover:ring-volt-500/60">
                  <div className="relative aspect-[4/3] bg-ink-800">
                    {d.coverId && d.coverKind === "image" ? <Image src={mediaUrl(d.coverId, "thumb")} alt="" fill unoptimized className="object-cover" /> : <FilePen className="absolute inset-0 m-auto size-8 text-fog-500" aria-hidden />}
                  </div>
                  <div className="p-3">
                    <p className="truncate font-medium">{d.title}</p>
                    <p className="text-xs text-fog-500">Editado {timeAgo(d.updatedAt)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhum rascunho" action={<ButtonLink href="/publicar">Criar publicação</ButtonLink>}>
            Use “Salvar rascunho” ao publicar para terminar depois.
          </EmptyState>
        )
      ) : null}

      {aba === "tarefas" ? (
        openTasks.length ? (
          <ul className="divide-y divide-ink-700 rounded-[var(--radius-md)] bg-ink-850">
            {openTasks.map((t) => (
              <li key={`${t.projectId}-${t.id}`}>
                <Link href={`/estudio/projetos/${t.projectId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02]">
                  <Circle className="size-4 shrink-0 text-fog-500" aria-hidden />
                  <span className="flex-1 text-sm">{t.text}</span>
                  <span className="truncate text-xs text-fog-500">{t.projectTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<CheckCircle2 className="size-6" />} title="Nenhuma tarefa aberta">As tarefas dos seus projetos aparecem aqui, todas juntas.</EmptyState>
        )
      ) : null}

      {aba === "conquistas" ? <Achievements userId={viewer.id} /> : null}
    </Container>
  );
}

function ProjectList({ projects, empty }: { projects: Awaited<ReturnType<typeof listProjects>>; empty: string }) {
  if (!projects.length)
    return (
      <EmptyState icon={<FolderOpen className="size-6" />} title="Nada por aqui ainda" action={<ButtonLink href="/laboratorio">Ver exemplos</ButtonLink>}>
        {empty}
      </EmptyState>
    );
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const done = p.tasks.filter((t) => t.done).length;
        return (
          <li key={p.id}>
            <Link href={`/estudio/projetos/${p.id}`} className="flex h-full flex-col gap-3 rounded-[var(--radius-lg)] bg-ink-850 p-5 ring-1 ring-inset ring-white/[0.06] transition-transform duration-300 hover:-translate-y-0.5 hover:ring-volt-500/50">
              <div className="flex items-center justify-between gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", p.status === "pronto" ? "bg-volt-500 text-ink-950" : "bg-cobalt-500/20 text-cobalt-400")}>{STATUS.find((s) => s.v === p.status)?.l}</span>
                <span className="text-xs text-fog-500">{timeAgo(p.updatedAt)}</span>
              </div>
              <h3 className="font-display text-2xl leading-tight">{p.title}</h3>
              {p.description ? <p className="line-clamp-2 text-sm text-fog-400">{p.description}</p> : null}
              {p.tasks.length ? (
                <div className="mt-auto space-y-1">
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-800" aria-hidden>
                    <div className="h-full rounded-full bg-volt-500" style={{ width: `${(done / p.tasks.length) * 100}%` }} />
                  </div>
                  <p className="text-xs text-fog-500">
                    {done}/{p.tasks.length} tarefas
                  </p>
                </div>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

async function References({ userId, exampleSlugs }: { userId: string; exampleSlugs: string[] }) {
  const [cards, collections] = await Promise.all([
    listCards(userId, sql`exists (select 1 from saved_item s where s.post_id = ${post.id} and s.user_id = ${userId})`, 24),
    listCollections(userId, false),
  ]);
  const examples = exampleSlugs.map(getExample).filter((e): e is (typeof EXAMPLES)[number] => !!e);
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-3xl">Coleções</h2>
          <Link href="/salvos" className="text-sm text-fog-400 hover:text-paper">Gerenciar</Link>
        </div>
        {collections.length ? (
          <ul className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <li key={c.id}>
                <Link href={`/colecoes/${c.id}`} className="inline-flex items-center gap-2 rounded-full bg-ink-850 px-4 py-2 text-sm ring-1 ring-inset ring-white/[0.06] hover:ring-volt-500/60">
                  {c.isPublic ? null : <Lock className="size-3.5 text-fog-500" aria-label="privada" />} {c.name} <span className="text-fog-500">{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fog-500">Crie pastas de inspiração em <Link href="/salvos" className="text-paper underline underline-offset-4">Salvos e coleções</Link>.</p>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-3xl">Exemplos do Laboratório salvos</h2>
        {examples.length ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {examples.map((e) => (
              <li key={e.slug}>
                <Link href={`/laboratorio/${e.slug}`} className="block overflow-hidden rounded-[var(--radius-md)] bg-ink-850 hover:ring-1 hover:ring-volt-500/60">
                  <ExamplePreview kind={e.preview.kind} colors={e.preview.colors} className="aspect-[16/10]" />
                  <p className="p-3 text-sm font-medium">{e.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fog-500">Use “Salvar inspiração” nos exemplos do <Link href="/laboratorio" className="text-paper underline underline-offset-4">Laboratório Criativo</Link>.</p>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-3xl">Trabalhos salvos da comunidade</h2>
        {cards.length ? <PostGrid cards={cards} signedIn viewerId={userId} /> : <p className="text-sm text-fog-500">Salve trabalhos no feed para usar como referência.</p>}
      </section>
    </div>
  );
}

async function Achievements({ userId }: { userId: string }) {
  const [list, daily, battles] = await Promise.all([
    achievements(userId),
    dailyHistory(userId),
    db
      .select({ title: challenge.title, slug: challenge.slug, at: challengeSubmission.createdAt })
      .from(challengeSubmission)
      .innerJoin(challenge, eq(challenge.id, challengeSubmission.challengeId))
      .where(eq(challengeSubmission.userId, userId))
      .orderBy(desc(challengeSubmission.createdAt))
      .limit(30),
  ]);
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="font-display text-3xl">Conquistas</h2>
        <p className="-mt-2 text-sm text-fog-500">Marcos pessoais — não existe ranking entre pessoas.</p>
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {list.map((a) => (
            <li key={a.id} className={cn("rounded-[var(--radius-md)] p-4 ring-1 ring-inset", a.earned ? "bg-ink-850 ring-volt-500/50" : "bg-ink-900 ring-white/[0.06] opacity-70")}>
              <Award className={cn("size-6", a.earned ? "text-volt-500" : "text-fog-500")} aria-hidden />
              <p className="mt-2 font-semibold">{a.title}</p>
              <p className="text-xs text-fog-400">{a.description}</p>
              <p className="mt-2 text-xs text-fog-500">{a.earned ? "Conquistada" : a.progress}</p>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="font-display text-3xl">Desafios do dia</h2>
          {daily.length ? (
            <ul className="divide-y divide-ink-700 rounded-[var(--radius-md)] bg-ink-850">
              {daily.map((d) => (
                <li key={d.id}>
                  <Link href={`/p/${d.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/[0.02]">
                    <span className="truncate">{d.title}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-fog-500">
                      {d.visibility !== "public" ? <Lock className="size-3.5" aria-label="privado" /> : null}
                      {formatDate(d.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fog-500">Participe do <Link href="/estudio-criativo" className="text-paper underline underline-offset-4">desafio do dia</Link> — pode ser em modo “Só eu”.</p>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="font-display text-3xl">Creative Battles</h2>
          {battles.length ? (
            <ul className="divide-y divide-ink-700 rounded-[var(--radius-md)] bg-ink-850">
              {battles.map((b) => (
                <li key={b.slug}>
                  <Link href={`/desafios/${b.slug}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-white/[0.02]">
                    <span className="truncate">{b.title}</span>
                    <span className="shrink-0 text-xs text-fog-500">{formatDate(b.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-fog-500">Você ainda não participou. <Link href="/desafios" className="text-paper underline underline-offset-4">Ver desafios</Link>.</p>
          )}
        </div>
      </section>
    </div>
  );
}
