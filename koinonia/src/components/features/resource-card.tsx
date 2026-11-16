import Link from "next/link";
import { MapPin, Truck } from "lucide-react";
import { Badge, Card } from "@/components/ui";
import { countryName } from "@/lib/geo";
import { t } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import type { Locale } from "@/types/database";
import type { Resource } from "@/services/resources";

export function ResourceCard({ r, m, locale }: { r: Resource; m: Messages; locale: Locale }) {
  return (
    <Card interactive className="relative flex h-full flex-col p-5 sm:p-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{m.resources.kinds[r.kind]}</Badge>
        <Badge tone={r.status === "available" ? "success" : "neutral"}>{r.status === "available" ? m.resources.available : m.resources.unavailable}</Badge>
      </div>
      <h3 className="font-display text-lg leading-snug font-semibold">
        <Link href={`/recursos/${r.id}`} className="after:absolute after:inset-0 after:rounded-xl">{r.title}</Link>
      </h3>
      {r.community ? <p className="mt-1 text-sm text-accent-ink">{t(m.resources.ownedBy, { community: r.community.name })}</p> : null}
      {r.description ? <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{r.description}</p> : null}
      <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-5 text-xs font-medium text-ink-subtle">
        <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="size-4" />{r.city}, {countryName(r.country_code, locale)}</span>
        {r.ships_remotely ? <span className="inline-flex items-center gap-1.5"><Truck aria-hidden className="size-4" />{m.resources.shipsRemotely}</span> : null}
      </p>
    </Card>
  );
}
