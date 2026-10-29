import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { Globe, Lock, Mail, MessageCircle, Plus, Users } from "lucide-react";
import { getViewer, isModerator } from "@/server/session";
import { getCommunityBySlug, listMembers } from "@/server/services/communities";
import { canReadCommunityContent, communityAccessFor } from "@/server/services/access";
import { listCards } from "@/server/services/posts";
import { db } from "@/server/db";
import { communityMember, post } from "@/server/db/schema";
import { PostGrid } from "@/components/post/post-card";
import { InviteLink, JoinButton, MemberControls, NotifyToggle, RemovePostButton } from "@/components/community/community-actions";
import { ReportButton } from "@/components/social/report-dialog";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Badge, Container, EmptyState } from "@/components/ui/misc";
import { cn, timeAgo } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ aba?: string; convite?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunityBySlug(slug);
  if (!c || c.access === "invite" || c.status === "removed") return { title: "Comunidade", robots: { index: false } };
  return { title: c.name, description: c.description.slice(0, 160) };
}

function codeMatches(given: string | undefined, actual: string) {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(actual);
  return a.length === b.length && timingSafeEqual(a, b);
}

const ACCESS = { public: { label: "Pública", icon: Globe }, private: { label: "Privada", icon: Lock }, invite: { label: "Por convite", icon: Mail } } as const;

export default async function CommunityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { aba = "publicacoes", convite } = await searchParams;
  const c = await getCommunityBySlug(slug);
  if (!c) notFound();
  const viewer = await getViewer();
  const mod = isModerator(viewer);
  const access = (await communityAccessFor(c.id, viewer?.id ?? null))!;
  const validInvite = codeMatches(convite, c.inviteCode);
  if (c.status === "removed" && !mod) notFound();
  // Comunidades por convite ficam ocultas para quem não é membro e não tem o link.
  if (c.access === "invite" && access.memberStatus !== "active" && !validInvite && !mod) notFound();

  const canRead = canReadCommunityContent(access, mod);
  const isAdmin = access.memberStatus === "active" && (access.role === "owner" || access.role === "admin");
  const isMember = access.memberStatus === "active";
  const A = ACCESS[c.access];

  const [works, discussions, members, myMembership] = await Promise.all([
    canRead && aba === "publicacoes" ? listCards(viewer?.id ?? null, and(eq(post.communityId, c.id), eq(post.status, "published")), 60).then((r) => r.filter((x) => x.kind !== "discussion")) : Promise.resolve([]),
    canRead && aba === "discussoes" ? listCards(viewer?.id ?? null, and(eq(post.communityId, c.id), eq(post.kind, "discussion")), 60) : Promise.resolve([]),
    canRead && aba === "membros" ? listMembers(c.id, isAdmin || mod) : isAdmin ? listMembers(c.id, true) : Promise.resolve([]),
    viewer ? db.select({ notify: communityMember.notify }).from(communityMember).where(and(eq(communityMember.communityId, c.id), eq(communityMember.userId, viewer.id))).limit(1) : Promise.resolve([]),
  ]);
  const pending = members.filter((m) => m.status === "pending");
  const tabs = [
    { slug: "publicacoes", label: "Publicações" },
    { slug: "discussoes", label: "Discussões" },
    { slug: "membros", label: "Participantes" },
    { slug: "sobre", label: "Sobre e regras" },
  ];

  return (
    <div>
      <div className="relative overflow-hidden border-b border-ink-700">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(600px_300px_at_10%_0%,rgb(124_58_237/0.25),transparent_70%),radial-gradient(500px_300px_at_100%_100%,rgb(59_130_246/0.15),transparent_70%)]" />
        <Container className="relative space-y-5 py-12">
          <div className="flex flex-wrap gap-2">
            <Badge>
              <A.icon className="size-3" aria-hidden /> {A.label}
            </Badge>
            <Badge>
              <Users className="size-3" aria-hidden /> {c.memberCount} participantes
            </Badge>
            {c.status === "removed" ? <Badge tone="danger">Removida pela moderação</Badge> : null}
          </div>
          <h1 className="max-w-3xl font-display text-5xl leading-[1] text-balance sm:text-6xl">{c.name}</h1>
          {c.description ? <p className="max-w-2xl text-pretty text-lg text-fog-300">{c.description}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <JoinButton communityId={c.id} slug={c.slug} status={access.memberStatus} access={c.access} inviteCode={validInvite ? convite : undefined} signedIn={!!viewer} />
            {isMember ? (
              <>
                <ButtonLink href={`/publicar?comunidade=${c.slug}`} variant="secondary">
                  <Plus className="size-4" aria-hidden /> Publicar
                </ButtonLink>
                <ButtonLink href={`/publicar?comunidade=${c.slug}&tipo=discussion`} variant="ghost">
                  <MessageCircle className="size-4" aria-hidden /> Iniciar discussão
                </ButtonLink>
                <NotifyToggle communityId={c.id} slug={c.slug} notify={myMembership[0]?.notify ?? true} />
              </>
            ) : null}
            {viewer && !isAdmin ? <ReportButton targetType="community" targetId={c.id} /> : null}
          </div>
        </Container>
      </div>

      <Container className="py-8">
        {isAdmin ? (
          <section className="mb-10 grid gap-6 rounded-[var(--radius-lg)] bg-ink-850 p-5 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Administração</h2>
              {c.access !== "public" ? <InviteLink communityId={c.id} slug={c.slug} code={c.inviteCode} /> : <p className="text-sm text-fog-500">Comunidade pública: qualquer pessoa pode entrar.</p>}
            </div>
            <div>
              <h3 className="mb-3 text-sm font-medium text-fog-200">Pedidos de entrada ({pending.length})</h3>
              {pending.length ? (
                <ul className="space-y-2">
                  {pending.map((m) => (
                    <li key={m.userId} className="flex items-center justify-between gap-3">
                      <Link href={`/u/${m.handle}`} className="flex items-center gap-2 text-sm">
                        <Avatar mediaId={m.avatar} name={m.displayName} size={28} /> {m.displayName}
                      </Link>
                      <MemberControls communityId={c.id} slug={c.slug} userId={m.userId} status={m.status} role={m.role} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fog-500">Nenhum pedido pendente.</p>
              )}
            </div>
          </section>
        ) : null}

        <nav aria-label="Seções da comunidade" className="mb-8 flex gap-1 overflow-x-auto border-b border-ink-700">
          {tabs.map((t) => (
            <Link
              key={t.slug}
              href={`/comunidades/${c.slug}${t.slug === "publicacoes" ? "" : `?aba=${t.slug}`}`}
              aria-current={aba === t.slug ? "page" : undefined}
              className={cn("-mb-px shrink-0 border-b-2 px-4 py-3 text-sm", aba === t.slug ? "border-paper text-paper" : "border-transparent text-fog-500 hover:text-paper")}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {aba === "sobre" ? (
          <div className="max-w-2xl space-y-4">
            <h2 className="font-display text-3xl">Regras</h2>
            {c.rules ? (
              <ol className="list-decimal space-y-2 pl-5 text-fog-300">
                {c.rules
                  .split("\n")
                  .map((r) => r.trim())
                  .filter(Boolean)
                  .map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
              </ol>
            ) : (
              <p className="text-fog-500">Esta comunidade segue as diretrizes gerais do FRAME.</p>
            )}
          </div>
        ) : !canRead ? (
          <EmptyState icon={<Lock className="size-6" />} title="Conteúdo para participantes">
            {access.memberStatus === "pending" ? "Seu pedido está em análise pela administração." : "Entre na comunidade para ver as publicações e discussões."}
          </EmptyState>
        ) : aba === "discussoes" ? (
          discussions.length ? (
            <ul className="divide-y divide-ink-700">
              {discussions.map((d) => (
                <li key={d.id} className="flex items-start gap-4 py-5">
                  <Avatar mediaId={d.authorAvatar} name={d.authorName} size={36} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/p/${d.id}`} className="font-medium text-paper hover:underline">
                      {d.title}
                    </Link>
                    {d.body ? <p className="mt-1 line-clamp-2 text-sm text-fog-400">{d.body}</p> : null}
                    <p className="mt-1.5 text-xs text-fog-500">
                      {d.authorName} · {timeAgo(new Date(d.createdAt))} · {d.commentCount} respostas
                    </p>
                  </div>
                  {isAdmin || mod ? <RemovePostButton communityId={c.id} slug={c.slug} postId={d.id} /> : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhuma discussão ainda" action={isMember ? <ButtonLink href={`/publicar?comunidade=${c.slug}&tipo=discussion`}>Começar uma conversa</ButtonLink> : undefined}>
              Faça uma pergunta, peça feedback ou compartilhe uma referência.
            </EmptyState>
          )
        ) : aba === "membros" ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {members
              .filter((m) => m.status === "active")
              .map((m) => (
                <li key={m.userId} className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-ink-850 p-3">
                  <Link href={`/u/${m.handle}`} className="flex min-w-0 items-center gap-3">
                    <Avatar mediaId={m.avatar} name={m.displayName} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{m.displayName}</span>
                      <span className="text-xs text-fog-500">{m.role === "owner" ? "Criador(a)" : m.role === "admin" ? "Administração" : "Participante"}</span>
                    </span>
                  </Link>
                  {isAdmin ? <MemberControls communityId={c.id} slug={c.slug} userId={m.userId} status={m.status} role={m.role} /> : null}
                </li>
              ))}
          </ul>
        ) : works.length ? (
          <PostGrid cards={works} signedIn={!!viewer} />
        ) : (
          <EmptyState title="Nenhuma publicação ainda" action={isMember ? <ButtonLink href={`/publicar?comunidade=${c.slug}`}>Publicar aqui</ButtonLink> : undefined}>
            Trabalhos, Showcases e tutoriais publicados na comunidade aparecem aqui.
          </EmptyState>
        )}
      </Container>
    </div>
  );
}
