import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { localizedName } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { listOpportunities } from "@/services/opportunities";
import { getCatalog } from "@/services/catalog";
import { attempt } from "@/lib/attempt";
import { parsePage, sanitizeSearch } from "@/services/pagination";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Input, Select, StatePanel } from "@/components/ui";
import { OpportunityCard } from "@/components/features/opportunity-card";
import { Pagination } from "@/components/features/pagination";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { isCountryCode, sortedCountries } from "@/lib/geo";
import { opportunityModeValues } from "@/schemas/common";
import type { OpportunityMode } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.opportunities.title, description: m.opportunities.subtitle };
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function OpportunitiesPage({ searchParams }: { searchParams: SP }) {
  const [{ m, locale }, sp] = await Promise.all([getI18n(), searchParams]);
  const q = sanitizeSearch(sp.q);
  const modeRaw = one(sp.modalidade);
  const mode = (opportunityModeValues as readonly string[]).includes(modeRaw) ? (modeRaw as OpportunityMode) : undefined;
  const countryRaw = one(sp.pais).toUpperCase();
  const country = isCountryCode(countryRaw) ? countryRaw : undefined;
  const categoryNum = Number(one(sp.area));
  const category = Number.isInteger(categoryNum) && categoryNum > 0 ? categoryNum : undefined;
  const page = parsePage(sp.pagina);
  const supabase = await createClient();

  let body: React.ReactNode;
  let categories: Array<{ id: number; name: string }> = [];
  if (!supabase) body = <BackendUnavailable m={m} />;
  else {
    const res = await attempt(() => Promise.all([listOpportunities(supabase, { q: q || undefined, mode, country, category, page }), getCatalog(supabase)]));
    if (!res.ok) body = <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>;
    else {
      const [list, catalog] = res.data;
      categories = catalog.categories.map((c) => ({ id: c.id, name: localizedName(c.names, locale) }));
      body = list.items.length === 0
        ? <StatePanel variant="empty" title={m.states.emptyTitle}><p>{m.opportunities.empty}</p></StatePanel>
        : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.items.map((o) => <li key={o.id}><OpportunityCard o={o} m={m} locale={locale} /></li>)}</ul>
            <Pagination page={list.page} pages={list.pages} basePath="/oportunidades" params={{ q, modalidade: mode, pais: country, area: category?.toString() }} m={m} />
          </>
        );
    }
  }

  return (
    <Container className="py-12">
      <PageHeader title={m.opportunities.title} subtitle={m.opportunities.subtitle} />
      <form role="search" aria-label={m.opportunities.searchLabel} className="mb-8 grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="o-q">{m.opportunities.searchLabel}</label>
        <Input id="o-q" name="q" type="search" defaultValue={q} placeholder={m.opportunities.searchPlaceholder} />
        <label className="sr-only" htmlFor="o-mode">{m.opportunities.mode}</label>
        <Select id="o-mode" name="modalidade" defaultValue={mode ?? ""}>
          <option value="">{m.opportunities.mode}: {m.common.anyOption}</option>
          {opportunityModeValues.map((v) => <option key={v} value={v}>{m.enums.opportunityMode[v]}</option>)}
        </Select>
        <label className="sr-only" htmlFor="o-area">{m.opportunities.category}</label>
        <Select id="o-area" name="area" defaultValue={category?.toString() ?? ""}>
          <option value="">{m.opportunities.category}: {m.common.anyOption}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <label className="sr-only" htmlFor="o-pais">{m.opportunities.country}</label>
        <Select id="o-pais" name="pais" defaultValue={country ?? ""}>
          <option value="">{m.opportunities.country}: {m.common.anyOption}</option>
          {sortedCountries(locale).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <button type="submit" className="h-11 rounded-full bg-navy-900 px-6 font-semibold text-white hover:bg-navy-800">{m.common.search}</button>
      </form>
      {body}
    </Container>
  );
}
