import Link from "next/link";
import { Globe2, MapPin } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { countryName } from "@/lib/geo";
import { t } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import type { Locale } from "@/types/database";
import type { OpportunityWithCommunity } from "@/services/opportunities";

export function OpportunityCard({ o, m, locale, score }: { o: OpportunityWithCommunity; m: Messages; locale: Locale; score?: number }) {
  const place = o.mode === "remote" ? m.common.remote : [o.city, countryName(o.country_code, locale)].filter(Boolean).join(", ");
  return (
    <Card interactive className="group relative flex h-full flex-col p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={o.mode === "remote" ? "info" : o.mode === "hybrid" ? "gold" : "brand"}>{m.enums.opportunityMode[o.mode]}</Badge>
        {o.status !== "open" ? <Badge>{m.enums.opportunityStatus[o.status]}</Badge> : null}
        {typeof score === "number" ? <Badge tone="success" className="ml-auto">{t(m.match.score, { score: Math.round(score) })}</Badge> : null}
      </div>
      <h3 className="font-display text-lg leading-snug font-semibold text-ink">
        <Link href={`/oportunidades/${o.id}`} className="after:absolute after:inset-0 after:rounded-xl">{o.title}</Link>
      </h3>
      {o.community ? <p className="mt-1 text-sm text-accent-ink">{t(m.opportunities.by, { community: o.community.name })}</p> : null}
      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-ink-muted">{o.description}</p>
      <p className="mt-auto flex items-center gap-1.5 pt-5 text-xs font-medium text-ink-subtle">
        {o.mode === "remote" ? <Globe2 aria-hidden className="size-4" /> : <MapPin aria-hidden className="size-4" />}
        {place}
      </p>
    </Card>
  );
}
