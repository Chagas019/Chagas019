import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { listCommunities } from "@/services/communities";
import { attempt } from "@/lib/attempt";
import { parsePage, sanitizeSearch } from "@/services/pagination";
import { Container, PageHeader } from "@/components/layout/page-header";
import { ButtonLink, Input, Select, StatePanel } from "@/components/ui";
import { CommunityCard } from "@/components/features/community-card";
import { Pagination } from "@/components/features/pagination";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { isCountryCode, sortedCountries } from "@/lib/geo";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.communities.title, description: m.communities.subtitle };
}

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CommunitiesPage({ searchParams }: { searchParams: SP }) {
  const [{ m, locale }, sp] = await Promise.all([getI18n(), searchParams]);
  const q = sanitizeSearch(sp.q);
  const countryRaw = typeof sp.pais === "string" ? sp.pais.toUpperCase() : "";
  const country = isCountryCode(countryRaw) ? countryRaw : undefined;
  const page = parsePage(sp.pagina);
  const supabase = await createClient();

  let body: React.ReactNode;
  if (!supabase) body = <BackendUnavailable m={m} />;
  else {
    const res = await attempt(() => listCommunities(supabase, { q: q || undefined, country, page }));
    if (!res.ok) body = <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>;
    else if (res.data.items.length === 0) body = <StatePanel variant="empty" title={m.states.emptyTitle}><p>{m.communities.empty}</p></StatePanel>;
    else body = (
      <>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {res.data.items.map((c) => <li key={c.id}><CommunityCard c={c} m={m} locale={locale} /></li>)}
        </ul>
        <Pagination page={res.data.page} pages={res.data.pages} basePath="/comunidades" params={{ q, pais: country }} m={m} />
      </>
    );
  }

  return (
    <Container className="py-12">
      <PageHeader title={m.communities.title} subtitle={m.communities.subtitle} actions={<ButtonLink href="/comunidades/nova" variant="gold">{m.communities.createTitle}</ButtonLink>} />
      <form role="search" aria-label={m.communities.searchLabel} className="mb-8 grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft sm:grid-cols-[1fr_14rem_auto]">
        <label className="sr-only" htmlFor="c-q">{m.communities.searchLabel}</label>
        <Input id="c-q" name="q" type="search" defaultValue={q} placeholder={m.communities.searchPlaceholder} />
        <label className="sr-only" htmlFor="c-pais">{m.opportunities.country}</label>
        <Select id="c-pais" name="pais" defaultValue={country ?? ""}>
          <option value="">{m.opportunities.country}: {m.common.anyOption}</option>
          {sortedCountries(locale).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <button type="submit" className="h-11 rounded-full bg-lime-400 px-6 font-semibold text-night-950 hover:bg-lime-300">{m.common.search}</button>
      </form>
      {body}
    </Container>
  );
}
