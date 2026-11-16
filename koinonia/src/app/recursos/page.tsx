import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { listResources, type ResourceKind } from "@/services/resources";
import { parsePage, sanitizeSearch } from "@/services/pagination";
import { attempt } from "@/lib/attempt";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Input, Select, StatePanel } from "@/components/ui";
import { ResourceCard } from "@/components/features/resource-card";
import { Pagination } from "@/components/features/pagination";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { isCountryCode, sortedCountries } from "@/lib/geo";
import { resourceKindValues } from "@/schemas/resource";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.resources.title, description: m.resources.subtitle };
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function ResourcesPage({ searchParams }: { searchParams: SP }) {
  const [{ m, locale }, sp] = await Promise.all([getI18n(), searchParams]);
  await requireSession("/recursos");
  const q = sanitizeSearch(sp.q);
  const kindRaw = one(sp.tipo);
  const kind = (resourceKindValues as readonly string[]).includes(kindRaw) ? (kindRaw as ResourceKind) : undefined;
  const countryRaw = one(sp.pais).toUpperCase();
  const country = isCountryCode(countryRaw) ? countryRaw : undefined;
  const page = parsePage(sp.pagina);
  const supabase = await createClient();

  let body: React.ReactNode;
  if (!supabase) body = <BackendUnavailable m={m} />;
  else {
    const res = await attempt(() => listResources(supabase, { q: q || undefined, kind, country, page }));
    if (!res.ok) body = <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>;
    else if (res.data.items.length === 0) body = <StatePanel variant="empty" title={m.states.emptyTitle}><p>{m.resources.empty}</p></StatePanel>;
    else body = (
      <>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{res.data.items.map((r) => <li key={r.id}><ResourceCard r={r} m={m} locale={locale} /></li>)}</ul>
        <Pagination page={res.data.page} pages={res.data.pages} basePath="/recursos" params={{ q, tipo: kind, pais: country }} m={m} />
      </>
    );
  }

  return (
    <Container className="py-12">
      <PageHeader title={m.resources.title} subtitle={m.resources.subtitle} />
      <form role="search" aria-label={m.resources.searchLabel} className="mb-8 grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft md:grid-cols-[1.5fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="r-q">{m.resources.searchLabel}</label>
        <Input id="r-q" name="q" type="search" defaultValue={q} placeholder={m.resources.searchLabel} />
        <label className="sr-only" htmlFor="r-tipo">{m.resources.kind}</label>
        <Select id="r-tipo" name="tipo" defaultValue={kind ?? ""}>
          <option value="">{m.resources.kind}: {m.common.anyOption}</option>
          {resourceKindValues.map((k) => <option key={k} value={k}>{m.resources.kinds[k]}</option>)}
        </Select>
        <label className="sr-only" htmlFor="r-pais">{m.opportunities.country}</label>
        <Select id="r-pais" name="pais" defaultValue={country ?? ""}>
          <option value="">{m.opportunities.country}: {m.common.anyOption}</option>
          {sortedCountries(locale).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <button type="submit" className="h-11 rounded-full bg-lime-400 px-6 font-semibold text-night-950 hover:bg-lime-300">{m.common.search}</button>
      </form>
      {body}
    </Container>
  );
}
