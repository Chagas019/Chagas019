"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Play, Share2, Sparkles, SplitSquareHorizontal } from "lucide-react";
import type { PostCard as Card } from "@/server/services/posts";
import { Avatar } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { CATEGORIES, labelOf } from "@/lib/taxonomy";
import { cn, compactNumber, mediaUrl } from "@/lib/utils";
import { CardMenu } from "./card-menu";
import { LikeButton, SaveButton } from "./like-button";

/**
 * Ritmo editorial do feed: um bloco de 7 posições que se repete, misturando destaque grande,
 * vertical, quadrados e panorâmico. No celular vira uma coluna com alturas variadas.
 */
const SLOTS = [
  { shape: "feature", grid: "sm:col-span-2 lg:col-span-7 lg:row-span-5", aspect: "aspect-[4/5]" },
  { shape: "tall", grid: "lg:col-span-5 lg:row-span-5", aspect: "aspect-[4/5]" },
  { shape: "square", grid: "lg:col-span-4 lg:row-span-4", aspect: "aspect-square" },
  { shape: "square", grid: "lg:col-span-4 lg:row-span-4", aspect: "aspect-square" },
  { shape: "square", grid: "lg:col-span-4 lg:row-span-4", aspect: "aspect-[4/5]" },
  { shape: "wide", grid: "sm:col-span-2 lg:col-span-8 lg:row-span-4", aspect: "aspect-[16/10]" },
  { shape: "compact", grid: "lg:col-span-4 lg:row-span-4", aspect: "aspect-[4/5]" },
] as const;

function ShareMini({ id, title }: { id: string; title: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      aria-label="Compartilhar"
      onClick={async () => {
        const url = `${window.location.origin}/p/${id}`;
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* cancelado: copia */
          }
        }
        await navigator.clipboard.writeText(url).catch(() => {});
        toast.show("Link copiado.");
      }}
      className="rounded-full p-2 text-fog-300 transition-colors hover:bg-white/5 hover:text-paper"
    >
      <Share2 className="size-[18px]" aria-hidden />
    </button>
  );
}

export function EditorialCard({ card, slot, signedIn, viewerId, onHide, priority }: { card: Card; slot: (typeof SLOTS)[number]; signedIn: boolean; viewerId?: string | null; onHide?: (id: string) => void; priority?: boolean }) {
  const cat = card.categories[0];
  const big = slot.shape === "feature" || slot.shape === "wide";
  return (
    <article className={cn("group flex min-w-0 flex-col", slot.grid)}>
      <Link href={`/p/${card.id}`} aria-label={`${card.title}, por ${card.authorName}`} className={cn("relative block overflow-hidden rounded-[22px] bg-ink-850 lg:min-h-0 lg:flex-1", slot.aspect, "lg:aspect-auto")}>
        {card.coverId && card.coverKind === "image" ? (
          <Image
            src={mediaUrl(card.coverId, big ? "display" : "thumb")}
            alt={card.coverAlt || card.title}
            fill
            unoptimized
            priority={priority}
            sizes={big ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 1024px) 100vw, 33vw"}
            className="img-fade object-cover transition-transform duration-[900ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
          />
        ) : card.coverId && card.coverKind === "video" ? (
          <video src={mediaUrl(card.coverId)} muted playsInline loop preload="metadata" className="absolute inset-0 size-full object-cover" onMouseEnter={(e) => void e.currentTarget.play().catch(() => {})} onMouseLeave={(e) => e.currentTarget.pause()} />
        ) : (
          <div className="absolute inset-0 flex items-end bg-[radial-gradient(400px_300px_at_20%_10%,rgb(212_255_54/0.14),transparent_70%),linear-gradient(160deg,var(--color-ink-800),var(--color-ink-900))] p-5">
            <span className="font-display text-3xl leading-tight">{card.title}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {cat ? <span className="rounded-full bg-ink-950/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-paper backdrop-blur">{labelOf(CATEGORIES, cat)}</span> : <span />}
          <span className="flex gap-1">
            {card.kind === "showcase" ? <span className="grid size-7 place-items-center rounded-full bg-ink-950/70 backdrop-blur" title="Projeto com processo"><Sparkles className="size-3.5 text-volt-500" aria-label="Projeto" /></span> : null}
            {card.hasBefore ? <span className="grid size-7 place-items-center rounded-full bg-ink-950/70 backdrop-blur" title="Antes e depois"><SplitSquareHorizontal className="size-3.5" aria-label="Antes e depois" /></span> : null}
            {card.coverKind === "video" ? <span className="grid size-7 place-items-center rounded-full bg-ink-950/70 backdrop-blur"><Play className="size-3.5" aria-label="Vídeo" /></span> : null}
          </span>
        </div>
        {big ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent p-5 pt-24">
            <p className="line-clamp-2 font-display text-3xl leading-[0.95] text-paper sm:text-4xl">{card.title}</p>
          </div>
        ) : null}
      </Link>
      <div className="flex items-center gap-1 pt-2.5">
        <Link href={`/u/${card.authorHandle}`} className="flex min-w-0 flex-1 items-center gap-2">
          <Avatar mediaId={card.authorAvatar} name={card.authorName} size={26} />
          <span className="min-w-0">
            {big ? null : <span className="block truncate text-sm font-medium text-paper">{card.title}</span>}
            <span className={cn("block truncate text-fog-400 hover:text-paper", big ? "text-sm" : "text-xs")}>{card.authorName}</span>
          </span>
        </Link>
        <LikeButton postId={card.id} initialLiked={card.liked} initialCount={card.likeCount} signedIn={signedIn} compact />
        <Link href={`/p/${card.id}#comentarios`} className="inline-flex items-center gap-1 rounded-full p-2 text-sm text-fog-400 hover:text-paper" aria-label={`${card.commentCount} comentários`}>
          <MessageCircle className="size-[18px]" aria-hidden />
          {card.commentCount ? compactNumber(card.commentCount) : null}
        </Link>
        <span className="hidden sm:inline-flex">
          <SaveButton postId={card.id} initialSaved={card.saved} signedIn={signedIn} compact />
        </span>
        <span className="hidden sm:inline-flex">
          <ShareMini id={card.id} title={card.title} />
        </span>
        <CardMenu postId={card.id} postTitle={card.title} authorId={card.authorId} authorHandle={card.authorHandle} signedIn={signedIn} isOwn={!!viewerId && viewerId === card.authorId} onHide={onHide} />
      </div>
    </article>
  );
}

export function EditorialGrid({ cards, signedIn, viewerId, onHide }: { cards: Card[]; signedIn: boolean; viewerId?: string | null; onHide?: (authorId: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:auto-rows-[5.25rem] lg:grid-cols-12 lg:gap-y-6">
      {cards.map((c, i) => {
        const slot = SLOTS[i % SLOTS.length]!;
        return <EditorialCard key={c.id} card={c} slot={slot} signedIn={signedIn} viewerId={viewerId} onHide={onHide} priority={i < 2} />;
      })}
    </div>
  );
}

export function EditorialSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:auto-rows-[5.25rem] lg:grid-cols-12" aria-busy="true" aria-label="Carregando trabalhos">
      {SLOTS.slice(0, 5).map((s, i) => (
        <div key={i} className={cn("skeleton rounded-[22px]", s.grid, s.aspect, "lg:aspect-auto")} />
      ))}
    </div>
  );
}
