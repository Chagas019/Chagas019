import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { Briefcase, ExternalLink, Mail, MapPin, Settings } from "lucide-react";
import { db } from "@/server/db";
import { post, user } from "@/server/db/schema";
import { getViewer } from "@/server/session";
import { getProfileByHandle } from "@/server/services/profiles";
import { listCards } from "@/server/services/posts";
import { listCollections } from "@/server/services/social";
import { isBlockedEitherWay, isFollowing, relationshipState } from "@/server/services/relations";
import { canMessage } from "@/server/services/messages";
import { PostGrid } from "@/components/post/post-card";
import { UserSafetyMenu, ShareButton } from "@/components/post/post-actions";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar, Badge, Container, EmptyState } from "@/components/ui/misc";
import { ButtonLink } from "@/components/ui/button";
import { RichText } from "@/components/ui/rich-text";
import { Sparkle } from "@/components/ui/sparkle";
import { CATEGORIES, labelOf } from "@/lib/taxonomy";
import { cn, compactNumber, mediaUrl } from "@/lib/utils";

type Props = { params: Promise<{ handle: string }>; searchParams: Promise<{ aba?: string; cat?: string }> };

const ACCENTS = {
  violet: "from-volt-700/60",
  blue: "from-cobalt-500/50",
  ember: "from-ember-400/40",
  mint: "from-mint-400/40",
} as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProfileByHandle(decodeURIComponent(handle));
  if (!p) return { title: "Perfil", robots: { index: false } };
  return {
    title: `${p.displayName} (@${p.handle})`,
    description: p.bio.slice(0, 160) || `Portfólio de ${p.displayName} no FRAME.`,
    robots: { index: p.isIndexable, follow: p.isIndexable },
    alternates: { canonical: `/u/${p.handle}` },
    openGraph: p.coverMediaId ? { images: [mediaUrl(p.coverMediaId)] } : undefined,
  };
}

export default async function ProfilePage({ params, searchParams }: Props) {
  const { handle } = await params;
  const { aba = "trabalhos", cat } = await searchParams;
  const p = await getProfileByHandle(decodeURIComponent(handle));
  if (!p) notFound();
  const viewer = await getViewer();
  const isOwner = viewer?.id === p.userId;

  if (viewer && !isOwner && (await isBlockedEitherWay(viewer.id, p.userId))) {
    const rel = await relationshipState(viewer.id, p.userId);
    return (
      <Container className="py-16">
        <EmptyState title="Perfil indisponível">
          {rel.blocked ? (
            <span className="flex flex-col items-center gap-4">
              Você bloqueou @{p.handle}.
              <UserSafetyMenu userId={p.userId} handle={p.handle} muted={rel.muted} blocked />
            </span>
          ) : (
            "Este perfil não está disponível para você."
          )}
        </EmptyState>
      </Container>
    );
  }

  const rel = viewer && !isOwner ? await relationshipState(viewer.id, p.userId) : null;
  const viewerFollowedByOwner = viewer && !isOwner ? await isFollowing(p.userId, viewer.id) : false;
  const canSeeContact =
    !!p.contactEmail && (isOwner || (viewer && (p.contactVisibility === "members" || (p.contactVisibility === "following" && viewerFollowedByOwner))));

  const kindFilter =
    aba === "showcases"
      ? eq(post.kind, "showcase")
      : aba === "tutoriais"
        ? eq(post.kind, "tutorial")
        : aba === "videos"
          ? sql`exists (select 1 from media m where m.post_id = ${post.id} and m.purpose = 'post' and m.kind = 'video')`
          : undefined;
  // Curtidas são privadas: só a própria pessoa vê o que curtiu.
  const showLikes = aba === "curtidas" && isOwner;
  const catFilter = cat && CATEGORIES.some((c) => c.slug === cat) ? sql`${post.categories} @> array[${cat}]::text[]` : undefined;
  const [cards, collections, [counts], pinned] = await Promise.all([
    aba === "colecoes" || (aba === "curtidas" && !isOwner)
      ? Promise.resolve([])
      : showLikes
        ? listCards(viewer!.id, and(sql`exists (select 1 from reaction r where r.post_id = ${post.id} and r.user_id = ${p.userId})`, sql`${post.kind} <> 'discussion'`), 60)
        : listCards(viewer?.id ?? null, and(eq(post.authorId, p.userId), sql`${post.kind} <> 'discussion'`, kindFilter, catFilter), 60),
    aba === "colecoes" ? listCollections(p.userId, !isOwner) : Promise.resolve([]),
    db
      .select({
        works: sql<number>`(select count(*)::int from post where author_id = ${p.userId} and status = 'published' and visibility = 'public' and kind <> 'discussion')`,
        since: user.createdAt,
      })
      .from(user)
      .where(eq(user.id, p.userId)),
    aba === "trabalhos" && !cat ? listCards(viewer?.id ?? null, and(eq(post.authorId, p.userId), sql`${post.pinnedAt} is not null`), 6) : Promise.resolve([]),
  ]);
  const usedCats = CATEGORIES.filter((c) => cards.some((x) => x.categories.includes(c.slug)) || c.slug === cat);
  const tabs = [
    { slug: "trabalhos", label: "Trabalhos" },
    { slug: "videos", label: "Vídeos" },
    { slug: "showcases", label: "Showcases" },
    { slug: "tutoriais", label: "Tutoriais" },
    { slug: "colecoes", label: "Coleções" },
    ...(isOwner ? [{ slug: "curtidas", label: "Curtidas" }] : []),
  ];

  return (
    <div>
      <div className={cn("relative h-48 overflow-hidden bg-gradient-to-br to-ink-900 sm:h-72", ACCENTS[p.accentColor])}>
        {p.coverMediaId ? <Image src={mediaUrl(p.coverMediaId)} alt="" fill priority unoptimized className="object-cover" /> : null}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
      </div>
      <Container className="relative -mt-20 sm:-mt-24">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar mediaId={p.avatarMediaId} name={p.displayName} size={128} className="ring-4 ring-ink-950" />
            <div className="space-y-2 pb-1">
              <h1 className="font-display text-5xl leading-none sm:text-7xl">{p.displayName}</h1>
              <p className="text-fog-400">@{p.handle}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isOwner ? (
              <ButtonLink href="/configuracoes" variant="outline">
                <Settings className="size-4" aria-hidden /> Editar perfil
              </ButtonLink>
            ) : (
              <>
                <FollowButton targetId={p.userId} initial={rel?.following ?? false} signedIn={!!viewer} size="md" />
                {viewer && (await canMessage(viewer.id, p.userId)) ? (
                  <ButtonLink href={`/mensagens/nova?para=${p.handle}`} variant="outline">
                    Mensagem
                  </ButtonLink>
                ) : null}
              </>
            )}
            <ShareButton title={`${p.displayName} no FRAME`} path={`/u/${p.handle}`} />
            {viewer && !isOwner && rel ? <UserSafetyMenu userId={p.userId} handle={p.handle} muted={rel.muted} blocked={rel.blocked} /> : null}
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {p.bio ? <RichText text={p.bio} className="max-w-2xl text-pretty text-lg text-fog-200" /> : isOwner ? <p className="text-fog-500">Conte um pouco sobre você e seu trabalho em Configurações.</p> : null}
            <div className="flex flex-wrap gap-2">
              {p.availableForWork ? (
                <Badge tone="mint">
                  <Briefcase className="size-3" aria-hidden /> Disponível para trabalhos
                </Badge>
              ) : null}
              {p.specialties.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="sr-only">Seguidores</dt>
                <dd>
                  <span className="font-semibold text-paper">{compactNumber(p.followerCount)}</span> <span className="text-fog-500">seguidores</span>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Seguindo</dt>
                <dd>
                  <span className="font-semibold text-paper">{compactNumber(p.followingCount)}</span> <span className="text-fog-500">seguindo</span>
                </dd>
              </div>
              <div>
                <dt className="sr-only">Trabalhos</dt>
                <dd>
                  <span className="font-semibold text-paper">{counts?.works ?? 0}</span> <span className="text-fog-500">trabalhos públicos</span>
                </dd>
              </div>
            </dl>
          </div>
          <aside className="space-y-3 text-sm">
            {p.location && (p.showLocation || isOwner) ? (
              <p className="flex items-center gap-2 text-fog-300">
                <MapPin className="size-4 text-fog-500" aria-hidden /> {p.location}
                {!p.showLocation ? <span className="text-xs text-fog-500">(só você vê)</span> : null}
              </p>
            ) : null}
            {canSeeContact ? (
              <a href={`mailto:${p.contactEmail}`} className="flex items-center gap-2 text-cobalt-400 hover:underline">
                <Mail className="size-4" aria-hidden /> {p.contactEmail}
              </a>
            ) : p.availableForWork && !viewer ? (
              <p className="text-fog-500">
                <Link href={`/entrar?next=/u/${p.handle}`} className="text-paper underline underline-offset-4">
                  Entre
                </Link>{" "}
                para ver as formas de contato.
              </p>
            ) : null}
            {p.links.map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer nofollow ugc me" className="flex items-center gap-2 text-fog-300 hover:text-paper">
                <ExternalLink className="size-4 text-fog-500" aria-hidden /> {l.label}
              </a>
            ))}
            {p.gear || p.tools.length ? (
              <details className="rounded-[var(--radius-md)] bg-ink-850 p-3">
                <summary className="cursor-pointer text-fog-300">Equipamento e ferramentas</summary>
                {p.gear ? <p className="mt-2 whitespace-pre-line text-fog-400">{p.gear}</p> : null}
                {p.tools.length ? <p className="mt-2 text-fog-500">{p.tools.join(" · ")}</p> : null}
              </details>
            ) : null}
          </aside>
        </div>

        {pinned.length ? (
          <section aria-labelledby="portfolio" className="mt-10 space-y-4">
            <h2 id="portfolio" className="flex items-center gap-2 font-display text-3xl">
              <Sparkle className="size-5 text-volt-500" /> Portfólio
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {pinned
                .sort((a, b) => new Date(b.pinnedAt!).getTime() - new Date(a.pinnedAt!).getTime())
                .map((c) => (
                  <li key={c.id}>
                    <Link href={`/p/${c.id}`} className="group relative block aspect-[4/5] overflow-hidden rounded-[var(--radius-md)] bg-ink-850">
                      {c.coverId && c.coverKind === "image" ? (
                        <Image src={mediaUrl(c.coverId)} alt={c.coverAlt || c.title} fill unoptimized sizes="(max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      ) : c.coverId && c.coverKind === "video" ? (
                        <video src={mediaUrl(c.coverId)} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" />
                      ) : null}
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4 pt-16">
                        <span className="line-clamp-2 font-display text-xl leading-tight sm:text-2xl">{c.title}</span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ) : isOwner && aba === "trabalhos" ? (
          <p className="mt-10 rounded-[var(--radius-md)] bg-ink-850 p-4 text-sm text-fog-400">
            Dica: abra um trabalho e use <span className="text-paper">“Fixar no portfólio”</span> para montar uma vitrine com até 6 destaques no topo do perfil.
          </p>
        ) : null}

        <nav aria-label="Seções do portfólio" className="scrollbar-none mt-10 flex gap-1 overflow-x-auto border-b border-ink-700">
          {tabs.map((t) => (
            <Link
              key={t.slug}
              href={`/u/${p.handle}${t.slug === "trabalhos" ? "" : `?aba=${t.slug}`}`}
              aria-current={aba === t.slug ? "page" : undefined}
              className={cn("-mb-px shrink-0 border-b-2 px-4 py-3 text-sm transition-colors", aba === t.slug ? "border-volt-500 text-paper" : "border-transparent text-fog-500 hover:text-paper")}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        <div className="py-8">
          {aba === "trabalhos" && usedCats.length > 1 ? (
            <div className="scrollbar-none mb-6 flex gap-2 overflow-x-auto">
              <Link href={`/u/${p.handle}`} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm", !cat ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-400")}>
                Tudo
              </Link>
              {usedCats.map((c) => (
                <Link key={c.slug} href={`/u/${p.handle}?cat=${c.slug}`} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm", cat === c.slug ? "bg-volt-500 text-ink-950" : "bg-ink-850 text-fog-400")}>
                  {labelOf(CATEGORIES, c.slug)}
                </Link>
              ))}
            </div>
          ) : null}
          {aba === "colecoes" ? (
            collections.length ? (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {collections.map((c) => (
                  <li key={c.id}>
                    <Link href={`/colecoes/${c.id}`} className="block rounded-[var(--radius-md)] bg-ink-850 p-5 ring-1 ring-inset ring-white/[0.06] hover:ring-volt-500/60">
                      <p className="font-medium">{c.name}</p>
                      {c.description ? <p className="mt-1 line-clamp-2 text-sm text-fog-400">{c.description}</p> : null}
                      <p className="mt-2 text-xs text-fog-500">
                        {c.count} {c.count === 1 ? "item" : "itens"} · {c.isPublic ? "pública" : "privada"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nenhuma coleção pública">Coleções reúnem referências e inspirações.</EmptyState>
            )
          ) : cards.length ? (
            <PostGrid cards={cards} signedIn={!!viewer} viewerId={viewer?.id ?? null} />
          ) : aba === "curtidas" && !isOwner ? (
            <EmptyState title="Curtidas são privadas">Só a própria pessoa vê o que curtiu.</EmptyState>
          ) : (
            <EmptyState title={isOwner ? "Seu portfólio começa aqui" : "Nada publicado ainda"} action={isOwner ? <ButtonLink href="/publicar">Publicar trabalho</ButtonLink> : undefined}>
              {isOwner ? "Publique seu primeiro trabalho — ele aparece aqui e no feed de quem segue você." : `@${p.handle} ainda não publicou nesta seção.`}
            </EmptyState>
          )}
        </div>
      </Container>
    </div>
  );
}
