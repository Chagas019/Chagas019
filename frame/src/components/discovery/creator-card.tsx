import Image from "next/image";
import Link from "next/link";
import type { CreatorCard as C } from "@/server/services/discovery";
import { Avatar, Badge } from "@/components/ui/misc";
import { FollowButton } from "@/components/social/follow-button";
import { compactNumber, mediaUrl } from "@/lib/utils";

export function CreatorCard({ c, signedIn }: { c: C; signedIn: boolean }) {
  return (
    <article className="overflow-hidden rounded-[var(--radius-lg)] bg-ink-850 shadow-[var(--shadow-card)]">
      <Link href={`/u/${c.handle}`} className="grid grid-cols-3 gap-0.5" tabIndex={-1} aria-hidden>
        {[0, 1, 2].map((i) =>
          c.previews[i] ? (
            <div key={i} className="relative aspect-square bg-ink-800">
              <Image src={mediaUrl(c.previews[i]!, "thumb")} alt="" fill unoptimized sizes="120px" className="object-cover" />
            </div>
          ) : (
            <div key={i} className="aspect-square bg-ink-800" />
          ),
        )}
      </Link>
      <div className="flex items-center gap-3 p-4">
        <Avatar mediaId={c.avatarMediaId} name={c.displayName} size={40} />
        <div className="min-w-0 flex-1">
          <Link href={`/u/${c.handle}`} className="block truncate font-medium text-paper hover:underline">
            {c.displayName}
          </Link>
          <p className="truncate text-xs text-fog-500">
            {c.specialties.slice(0, 2).join(" · ") || `@${c.handle}`} · {compactNumber(c.followerCount)} seguidores
          </p>
        </div>
        <FollowButton targetId={c.userId} initial={c.following} signedIn={signedIn} />
      </div>
      {c.isNew || c.availableForWork ? (
        <div className="flex gap-1.5 px-4 pb-4">
          {c.isNew ? <Badge tone="volt">Novo talento</Badge> : null}
          {c.availableForWork ? <Badge tone="mint">Disponível para trabalhos</Badge> : null}
        </div>
      ) : null}
    </article>
  );
}
