import Link from "next/link";
import { BadgeCheck, MapPin } from "lucide-react";
import { Badge, Card, Tooltip } from "@/components/ui";
import { countryName } from "@/lib/geo";
import { initials } from "@/lib/utils";
import type { Messages } from "@/i18n/types";
import type { Community, Locale } from "@/types/database";

type CardCommunity = Pick<Community, "slug" | "name" | "kind" | "city" | "country_code" | "status"> &
  Partial<Pick<Community, "description" | "logo_url" | "diocese" | "focus_categories">>;

export function CommunityLogo({ name, src, className = "size-14" }: { name: string; src?: string | null; className?: string }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold-400/30 bg-night-700 font-display text-lg text-gold-300 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logotipos pequenos vindos do Storage */}
      {src ? <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" /> : <span aria-hidden>{initials(name)}</span>}
    </span>
  );
}

export function CommunityCard({ c, m, locale, categoryNames = {} }: { c: CardCommunity; m: Messages; locale: Locale; categoryNames?: Record<number, string> }) {
  const areas = (c.focus_categories ?? []).map((id) => categoryNames[id]).filter(Boolean).slice(0, 3);
  return (
    <Card interactive className="relative flex h-full flex-col p-6">
      <div className="flex items-start gap-4">
        <CommunityLogo name={c.name} src={c.logo_url} />
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge tone="brand">{m.enums.communityKind[c.kind]}</Badge>
            {c.status === "verified" ? (
              <Tooltip content={m.home.communitiesP1}><Badge tone="success"><BadgeCheck aria-hidden />{m.communities.verifiedBadge}</Badge></Tooltip>
            ) : <Badge tone="warning">{m.enums.communityStatus[c.status]}</Badge>}
          </div>
          <h3 className="font-display text-xl leading-snug text-white">
            <Link href={`/comunidades/${c.slug}`} className="after:absolute after:inset-0 after:rounded-xl">{c.name}</Link>
          </h3>
        </div>
      </div>
      {c.description ? <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink-muted">{c.description}</p> : null}
      {areas.length ? <ul aria-label={m.communities.focusAreas} className="mt-4 flex flex-wrap gap-1.5">{areas.map((a) => <li key={a}><Badge tone="gold">{a}</Badge></li>)}</ul> : null}
      <p className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-medium text-ink-subtle">
        <MapPin aria-hidden className="size-4" />
        {c.city}, {countryName(c.country_code, locale)}{c.diocese ? ` · ${c.diocese}` : ""}
      </p>
    </Card>
  );
}
