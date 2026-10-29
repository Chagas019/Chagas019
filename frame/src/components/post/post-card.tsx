"use client";

import Image from "next/image";
import Link from "next/link";
import { Layers, MessageCircle, Play, SplitSquareHorizontal, GraduationCap, Sparkles, Lock, Users } from "lucide-react";
import type { PostCard as Card } from "@/server/services/posts";
import { Avatar } from "@/components/ui/misc";
import { LikeButton } from "./like-button";
import { compactNumber, mediaUrl } from "@/lib/utils";
import { labelOf, LAB_TOPICS, LEVELS } from "@/lib/taxonomy";

function Tag({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-paper backdrop-blur-md">
      <Icon className="size-3" />
      {children}
    </span>
  );
}

export function PostCard({ card, signedIn, priority }: { card: Card; signedIn: boolean; priority?: boolean }) {
  const ratio = card.coverWidth && card.coverHeight ? card.coverWidth / card.coverHeight : card.kind === "tutorial" ? 4 / 3 : 4 / 5;
  const clamped = Math.min(Math.max(ratio, 0.6), 1.8);
  return (
    <article className="group mb-4 break-inside-avoid sm:mb-5">
      <Link href={`/p/${card.id}`} className="block overflow-hidden rounded-[var(--radius-md)] bg-ink-850 shadow-[var(--shadow-card)]" aria-label={`${card.title}, por ${card.authorName}`}>
        <div className="relative w-full" style={{ aspectRatio: String(clamped) }}>
          {card.coverId && card.coverKind === "image" ? (
            <Image
              src={mediaUrl(card.coverId, "thumb")}
              alt={card.coverAlt || card.title}
              fill
              unoptimized
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-[1.03]"
            />
          ) : card.coverId && card.coverKind === "video" ? (
            <video src={mediaUrl(card.coverId)} muted playsInline preload="metadata" className="absolute inset-0 size-full object-cover" aria-label={card.title} />
          ) : (
            <div className="absolute inset-0 flex flex-col justify-end bg-[radial-gradient(400px_300px_at_20%_10%,rgb(213_255_64/0.16),transparent_70%),linear-gradient(160deg,var(--color-ink-800),var(--color-ink-900))] p-4">
              {card.kind === "tutorial" && card.tutorialTopic ? (
                <span className="mb-2 text-xs uppercase tracking-[0.16em] text-volt-300">{labelOf(LAB_TOPICS, card.tutorialTopic)}</span>
              ) : null}
              <span className="font-display text-2xl leading-tight text-paper">{card.title}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-2.5">
            {card.kind === "showcase" ? <Tag icon={Sparkles}>Showcase</Tag> : null}
            {card.hasBefore || card.format === "before_after" ? <Tag icon={SplitSquareHorizontal}>Antes/depois</Tag> : null}
            {card.kind === "tutorial" ? (
              <Tag icon={GraduationCap}>
                {card.tutorialLevel ? labelOf(LEVELS, card.tutorialLevel) : "Tutorial"}
                {card.tutorialMinutes ? ` · ${card.tutorialMinutes} min` : ""}
              </Tag>
            ) : null}
            {card.coverKind === "video" ? <Tag icon={Play}>Vídeo</Tag> : null}
            {card.mediaCount > 1 ? <Tag icon={Layers}>{card.mediaCount}</Tag> : null}
            {card.isCollaborative ? <Tag icon={Users}>Colab</Tag> : null}
            {card.visibility !== "public" ? <Tag icon={Lock}>{card.visibility === "followers" ? "Seguidores" : "Privado"}</Tag> : null}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 pt-12 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
            <p className="line-clamp-2 text-sm font-medium text-paper">{card.title}</p>
          </div>
        </div>
      </Link>
      <div className="mt-2 flex items-center gap-2 px-0.5">
        <Link href={`/u/${card.authorHandle}`} className="flex min-w-0 flex-1 items-center gap-2 text-sm text-fog-300 hover:text-paper">
          <Avatar mediaId={card.authorAvatar} name={card.authorName} size={22} />
          <span className="truncate">{card.authorName}</span>
        </Link>
        <LikeButton postId={card.id} initialLiked={card.liked} initialCount={card.likeCount} signedIn={signedIn} compact />
        {card.commentCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm text-fog-500" aria-label={`${card.commentCount} comentários`}>
            <MessageCircle className="size-4" aria-hidden />
            {compactNumber(card.commentCount)}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function PostGrid({ cards, signedIn }: { cards: Card[]; signedIn: boolean }) {
  return (
    <div className="columns-2 gap-4 sm:gap-5 md:columns-3 xl:columns-4 2xl:columns-5">
      {cards.map((c, i) => (
        <PostCard key={c.id} card={c} signedIn={signedIn} priority={i < 4} />
      ))}
    </div>
  );
}

export function PostGridSkeleton({ count = 12 }: { count?: number }) {
  const heights = [280, 360, 220, 320, 260, 400, 240, 300];
  return (
    <div className="columns-2 gap-4 sm:gap-5 md:columns-3 xl:columns-4 2xl:columns-5" aria-busy="true" aria-label="Carregando trabalhos">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="mb-5 break-inside-avoid">
          <div className="skeleton rounded-[var(--radius-md)]" style={{ height: heights[i % heights.length] }} />
          <div className="skeleton mt-2 h-4 w-2/3 rounded-full" />
        </div>
      ))}
    </div>
  );
}
