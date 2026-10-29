import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Clock, ExternalLink, FilePen, GitBranch, GraduationCap, Lock, Sparkles } from "lucide-react";
import { RichText } from "@/components/ui/rich-text";
import { ButtonLink } from "@/components/ui/button";
import { getViewer } from "@/server/session";
import { getPostDetail, listComments, remixRelations } from "@/server/services/posts";
import { PostGrid } from "@/components/post/post-card";
import { relationshipState } from "@/server/services/relations";
import { BeforeAfter } from "@/components/post/before-after";
import { Comments } from "@/components/post/comments";
import { LikeButton, SaveButton } from "@/components/post/like-button";
import { MediaViewer } from "@/components/post/media-viewer";
import { HelpfulRating, OwnerControls, ShareButton } from "@/components/post/post-actions";
import { FollowButton } from "@/components/social/follow-button";
import { ReportButton } from "@/components/social/report-dialog";
import { CollectionPicker } from "@/components/social/collection-picker";
import { listCollections } from "@/server/services/social";
import { Avatar, Badge, Container } from "@/components/ui/misc";
import { CATEGORIES, LAB_TOPICS, LEVELS, POST_FORMATS, labelOf } from "@/lib/taxonomy";
import { formatDate, mediaUrl, timeAgo } from "@/lib/utils";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPostDetail(null, id);
  if (!detail) return { title: "Publicação", robots: { index: false } };
  const cover = detail.media.find((m) => m.kind === "image");
  return {
    title: `${detail.post.title} — ${detail.author.displayName}`,
    description: detail.post.body.slice(0, 160) || `Trabalho de ${detail.author.displayName} no FRAME.`,
    robots: { index: detail.author.isIndexable, follow: detail.author.isIndexable },
    openGraph: cover ? { images: [{ url: mediaUrl(cover.id), width: cover.width ?? undefined, height: cover.height ?? undefined }] } : undefined,
  };
}

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const viewer = await getViewer();
  const detail = await getPostDetail(viewer, id);
  if (!detail) notFound();
  const { post, author, showcase, tutorial } = detail;
  const [comments, collections, remix] = await Promise.all([
    listComments(viewer, post.id),
    viewer ? listCollections(viewer.id, false) : Promise.resolve([]),
    remixRelations(viewer?.id ?? null, post),
  ]);
  const info = post.projectInfo;
  const infoRows = ([
    ["Objetivo", info.goal],
    ["Técnicas", info.techniques],
    ["Resultado", info.result],
    ["Referências", info.references],
  ] as const).filter(([, v]) => v);
  const isOwner = viewer?.id === post.authorId;
  const rel = viewer && !isOwner ? await relationshipState(viewer.id, author.id) : null;
  const after = detail.media[0];
  const showTech = showcase && (!showcase.hideTechnical || isOwner);
  const techRows = showcase
    ? ([
        ["Câmera", showcase.camera],
        ["Lente", showcase.lens],
        ["Iluminação", showcase.lighting],
        ["Edição", showcase.software.join(", ")],
        ["Preset / LUT", showcase.presetName],
      ] as const).filter(([, v]) => v)
    : [];

  return (
    <Container className="max-w-6xl py-8">
      {post.status === "removed" ? (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-[var(--radius-md)] bg-danger-500/10 p-4 text-sm text-danger-400">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          Esta publicação foi removida pela moderação por violar as diretrizes. Só você e a moderação conseguem vê-la.
        </div>
      ) : null}
      {post.status === "draft" ? (
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-cobalt-500/15 p-4 text-sm text-paper">
          <span className="flex items-center gap-2">
            <FilePen className="size-4 shrink-0 text-volt-500" aria-hidden /> Rascunho — só você vê esta publicação.
          </span>
          <ButtonLink href={`/p/${post.id}/editar`} size="sm">
            Revisar e publicar
          </ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-8">
          {detail.before && after && after.kind === "image" ? (
            <BeforeAfter beforeId={detail.before.id} afterId={after.id} alt={post.title} ratio={after.width && after.height ? after.width / after.height : 4 / 3} />
          ) : null}
          {detail.media.length > (detail.before ? 1 : 0) ? <MediaViewer media={detail.before && after?.kind === "image" ? detail.media.slice(1) : detail.media} title={post.title} /> : null}

          <header className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {post.kind === "showcase" ? (
                <Badge tone="volt">
                  <Sparkles className="size-3" aria-hidden /> Showcase
                </Badge>
              ) : null}
              {post.kind === "tutorial" && tutorial ? (
                <>
                  <Badge tone="cobalt">
                    <GraduationCap className="size-3" aria-hidden /> {labelOf(LAB_TOPICS, tutorial.topic)}
                  </Badge>
                  <Badge>{labelOf(LEVELS, tutorial.level)}</Badge>
                  <Badge>
                    <Clock className="size-3" aria-hidden /> {tutorial.durationMinutes} min
                  </Badge>
                </>
              ) : null}
              {post.kind === "work" ? <Badge>{labelOf(POST_FORMATS, post.format)}</Badge> : null}
              {post.visibility !== "public" ? (
                <Badge tone="ember">
                  <Lock className="size-3" aria-hidden /> {post.visibility === "followers" ? "Seguidores aprovados" : "Privado"}
                </Badge>
              ) : null}
              {detail.community ? (
                <Link href={`/comunidades/${detail.community.slug}`}>
                  <Badge tone="mint">{detail.community.name}</Badge>
                </Link>
              ) : null}
            </div>
            {remix.original ? (
              <Link href={`/p/${remix.original.id}`} className="inline-flex items-center gap-2 rounded-full bg-volt-500/10 px-3 py-1.5 text-sm text-volt-500 ring-1 ring-inset ring-volt-500/40 hover:bg-volt-500/15">
                <GitBranch className="size-4" aria-hidden /> Remix de “{remix.original.title}” · @{remix.original.authorHandle}
              </Link>
            ) : post.remixOfId ? (
              <p className="inline-flex items-center gap-2 text-sm text-fog-500"><GitBranch className="size-4" aria-hidden /> Remix de uma publicação que não está mais disponível</p>
            ) : null}
            <h1 className="font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{post.title}</h1>
            {post.body ? <RichText text={post.body} className="max-w-3xl text-pretty text-lg leading-relaxed text-fog-300" /> : null}
            {post.tags.length ? (
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm" aria-label="Hashtags">
                {post.tags.map((t) => (
                  <li key={t}>
                    <Link href={`/descobrir?q=${encodeURIComponent("#" + t)}`} className="text-cobalt-400 hover:text-volt-500">
                      #{t}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-center gap-1 border-y border-ink-700 py-2">
              <LikeButton postId={post.id} initialLiked={detail.liked} initialCount={post.likeCount} signedIn={!!viewer} />
              <SaveButton postId={post.id} initialSaved={detail.saved} signedIn={!!viewer} />
              {viewer ? <CollectionPicker postId={post.id} collections={collections} /> : null}
              <ShareButton title={post.title} path={`/p/${post.id}`} />
              {post.allowRemix && post.status === "published" && !isOwner ? (
                <Link href={viewer ? `/publicar?remix=${post.id}` : `/entrar?next=${encodeURIComponent(`/publicar?remix=${post.id}`)}`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-volt-500 hover:bg-volt-500/10">
                  <GitBranch className="size-[18px]" aria-hidden /> Remixar
                </Link>
              ) : null}
              <div className="ml-auto">{isOwner ? <OwnerControls postId={post.id} visibility={post.visibility} pinned={!!post.pinnedAt} canPin={post.status === "published" && post.visibility === "public" && post.kind !== "discussion"} /> : viewer ? <ReportButton targetType="post" targetId={post.id} /> : null}</div>
            </div>
          </header>

          {infoRows.length ? (
            <section className="grid gap-4 rounded-[24px] bg-ink-900 p-5 ring-1 ring-white/[0.06] sm:grid-cols-2 sm:p-6">
              <h2 className="font-display text-3xl sm:col-span-2">Sobre o projeto</h2>
              {infoRows.map(([k, v]) => (
                <div key={k}>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.25em] text-volt-500">{k}</h3>
                  <p className="mt-1 whitespace-pre-line text-pretty text-fog-200">{v}</p>
                </div>
              ))}
            </section>
          ) : null}

          {showcase && showcase.process ? (
            <section className="space-y-3">
              <h2 className="font-display text-3xl">O processo</h2>
              <p className="max-w-3xl whitespace-pre-line text-pretty leading-relaxed text-fog-300">{showcase.process}</p>
            </section>
          ) : null}

          {tutorial ? (
            <section className="space-y-6">
              <h2 className="font-display text-3xl">Passo a passo</h2>
              <ol className="space-y-6">
                {tutorial.steps.map((s, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-volt-500/15 font-semibold text-volt-300">{i + 1}</span>
                    <div className="space-y-1.5 pt-1">
                      <h3 className="font-medium text-paper">{s.title}</h3>
                      {s.body ? <p className="whitespace-pre-line text-pretty leading-relaxed text-fog-300">{s.body}</p> : null}
                    </div>
                  </li>
                ))}
              </ol>
              {tutorial.resources.length ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Materiais complementares</h3>
                  <ul className="space-y-1">
                    {tutorial.resources.map((r, i) => (
                      <li key={i}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 text-cobalt-400 hover:underline">
                          {r.label} <ExternalLink className="size-3.5" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <p className="rounded-[var(--radius-md)] bg-ink-900 p-4 text-sm text-fog-400">
                Técnicas dependem do material de origem. Teste em uma cópia, adapte ao seu contexto e compartilhe nos comentários o que funcionou para você.
              </p>
              <HelpfulRating postId={post.id} initial={detail.helpfulVote} count={tutorial.helpfulCount} canRate={!!viewer && !isOwner} />
            </section>
          ) : null}

          {remix.remixes.length ? (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 font-display text-3xl">
                <GitBranch className="size-6 text-volt-500" aria-hidden /> Outras versões ({remix.remixes.length})
              </h2>
              <PostGrid cards={remix.remixes} signedIn={!!viewer} viewerId={viewer?.id ?? null} />
            </section>
          ) : null}

          <Comments postId={post.id} comments={comments} viewerId={viewer?.id ?? null} postAuthorId={post.authorId} enabled={post.commentsEnabled && post.status === "published"} />
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-lg)] bg-ink-850 p-5">
            <div className="flex items-center gap-3">
              <Link href={`/u/${author.handle}`}>
                <Avatar mediaId={author.avatarMediaId} name={author.displayName} size={48} />
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/u/${author.handle}`} className="block truncate font-medium hover:underline">
                  {author.displayName}
                </Link>
                <p className="truncate text-xs text-fog-500">{author.specialties.slice(0, 2).join(" · ") || `@${author.handle}`}</p>
              </div>
            </div>
            {!isOwner ? (
              <div className="mt-4">
                <FollowButton targetId={author.id} initial={rel?.following ?? false} signedIn={!!viewer} size="md" />
              </div>
            ) : null}
            <p className="mt-4 text-xs text-fog-500" title={formatDate(post.createdAt)}>
              Publicado {timeAgo(post.createdAt)}
            </p>
          </div>

          {showTech && (techRows.length || showcase?.editParams) ? (
            <div className="rounded-[var(--radius-lg)] bg-ink-850 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Ficha técnica</h2>
              {showcase?.hideTechnical && isOwner ? <p className="mt-1 text-xs text-ember-400">Oculta para o público — só você vê.</p> : null}
              <dl className="mt-3 space-y-2.5">
                {techRows.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[96px_1fr] gap-3 text-sm">
                    <dt className="text-fog-500">{k}</dt>
                    <dd className="text-fog-200">{v}</dd>
                  </div>
                ))}
              </dl>
              {showcase?.editParams ? (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-fog-300 hover:text-paper">Parâmetros de edição</summary>
                  <p className="mt-2 whitespace-pre-line font-mono text-xs leading-relaxed text-fog-400">{showcase.editParams}</p>
                </details>
              ) : null}
            </div>
          ) : null}

          {post.credits.length ? (
            <div className="rounded-[var(--radius-lg)] bg-ink-850 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Quem fez</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {post.credits.map((c, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    {c.handle ? (
                      <Link href={`/u/${c.handle}`} className="font-medium text-paper hover:text-volt-500">
                        {c.name} <span className="text-xs text-volt-500">@{c.handle}</span>
                      </Link>
                    ) : (
                      <span className="text-fog-200">{c.name}</span>
                    )}
                    <span className="shrink-0 text-xs uppercase tracking-[0.1em] text-fog-500">{c.role}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {showcase && (showcase.credits.length || showcase.portfolioUrl) ? (
            <div className="rounded-[var(--radius-lg)] bg-ink-850 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-fog-400">Créditos</h2>
              <ul className="mt-3 space-y-1.5 text-sm">
                {showcase.credits.map((c, i) => (
                  <li key={i}>
                    <span className="text-fog-200">{c.name}</span> <span className="text-fog-500">— {c.role}</span>
                  </li>
                ))}
              </ul>
              {showcase.portfolioUrl ? (
                <a href={showcase.portfolioUrl} target="_blank" rel="noopener noreferrer nofollow ugc" className="mt-3 inline-flex items-center gap-1.5 text-sm text-cobalt-400 hover:underline">
                  Portfólio do criador <ExternalLink className="size-3.5" aria-hidden />
                </a>
              ) : null}
            </div>
          ) : null}

          {post.categories.length || post.tools.length ? (
            <div className="space-y-3 rounded-[var(--radius-lg)] bg-ink-850 p-5">
              {post.categories.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {post.categories.map((c) => (
                    <Link key={c} href={`/?f=${c}`}>
                      <Badge>{labelOf(CATEGORIES, c)}</Badge>
                    </Link>
                  ))}
                </div>
              ) : null}
              {post.tools.length ? <p className="text-xs text-fog-500">Ferramentas: {post.tools.join(", ")}</p> : null}
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  );
}
