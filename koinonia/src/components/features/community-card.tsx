import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { countryName } from "@/lib/geo";
import type { Messages } from "@/i18n/types";
import type { Community, Locale } from "@/types/database";

export function CommunityCard({ c, m, locale }: { c: Pick<Community, "slug" | "name" | "kind" | "city" | "country_code" | "status"> & { description?: string }; m: Messages; locale: Locale }) {
  return (
    <Card interactive className="relative flex h-full flex-col p-5 sm:p-6">
      <div className="mb-3 flex items-center gap-2">
        <Badge tone="brand">{m.enums.communityKind[c.kind]}</Badge>
        {c.status === "verified" ? (
          <Badge tone="success"><BadgeCheck aria-hidden />{m.communities.verifiedBadge}</Badge>
        ) : (
          <Badge tone="warning">{m.enums.communityStatus[c.status]}</Badge>
        )}
      </div>
      <h3 className="font-display text-lg leading-snug font-semibold text-ink">
        <Link href={`/comunidades/${c.slug}`} className="after:absolute after:inset-0 after:rounded-xl">{c.name}</Link>
      </h3>
      {c.description ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted">{c.description}</p> : null}
      <p className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-medium text-ink-subtle">
        <MapPin aria-hidden className="size-4" />
        {c.city}, {countryName(c.country_code, locale)}
      </p>
    </Card>
  );
}
