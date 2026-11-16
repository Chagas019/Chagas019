import type { Metadata } from "next";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { localizedName } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { getCatalog } from "@/services/catalog";
import { PAGE_SIZE, parsePage, sanitizeSearch } from "@/services/pagination";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Avatar, Badge, Card, Input, Select, StatePanel } from "@/components/ui";
import { Pagination } from "@/components/features/pagination";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { countryName, isCountryCode, isLanguageCode, languageName, sortedCountries, sortedLanguages } from "@/lib/geo";
import { availabilityValues } from "@/schemas/common";
import type { AvailabilitySlot, VolunteerSearchRow } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.talents.title, description: m.talents.subtitle };
}

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function TalentsPage({ searchParams }: { searchParams: SP }) {
  const [{ m, locale }, sp] = await Promise.all([getI18n(), searchParams]);
  const q = sanitizeSearch(sp.q);
  const countryRaw = one(sp.pais).toUpperCase();
  const country = isCountryCode(countryRaw) ? countryRaw : undefined;
  const lang = isLanguageCode(one(sp.idioma)) ? one(sp.idioma) : undefined;
  const availRaw = one(sp.disponibilidade);
  const availability = (availabilityValues as readonly string[]).includes(availRaw) ? (availRaw as AvailabilitySlot) : undefined;
  const cat = Number(one(sp.area));
  const category = Number.isInteger(cat) && cat > 0 ? cat : undefined;
  const page = parsePage(sp.pagina);
  const supabase = await createClient();

  let body: React.ReactNode;
  let categories: Array<{ id: number; name: string }> = [];
  if (!supabase) body = <BackendUnavailable m={m} />;
  else {
    const [catalog, res] = await Promise.all([
      getCatalog(supabase),
      supabase.rpc("search_volunteers", {
        p_query: q || null, p_category: category ?? null, p_skill: null, p_languages: lang ? [lang] : null,
        p_country: country ?? null, p_availability: availability ? [availability] : null,
        p_limit: PAGE_SIZE + 1, p_offset: (page - 1) * PAGE_SIZE,
      }),
    ]);
    categories = catalog.categories.map((c) => ({ id: c.id, name: localizedName(c.names, locale) }));
    const rows = (res.data ?? []) as VolunteerSearchRow[];
    const hasNext = rows.length > PAGE_SIZE;
    if (res.error) body = <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>;
    else if (rows.length === 0) body = <StatePanel variant="empty" title={m.states.emptyTitle}><p>{m.talents.empty}</p></StatePanel>;
    else body = (
      <>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.slice(0, PAGE_SIZE).map((v) => (
            <li key={v.id}>
              <Card interactive className="relative flex h-full flex-col gap-4 p-5">
                <div className="flex items-center gap-3">
                  <Avatar name={v.display_name} src={v.avatar_url} />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-semibold"><Link href={`/voluntarios/${v.id}`} className="after:absolute after:inset-0 after:rounded-xl">{v.display_name}</Link></h2>
                    {v.country_code ? <p className="flex items-center gap-1 text-xs text-ink-subtle"><MapPin aria-hidden className="size-3.5" />{[v.city, countryName(v.country_code, locale)].filter(Boolean).join(", ")}</p> : null}
                  </div>
                </div>
                {v.bio ? <p className="line-clamp-2 text-sm text-ink-muted">{v.bio}</p> : null}
                <ul className="mt-auto flex flex-wrap gap-1.5">
                  {v.skill_names.slice(0, 4).map((s) => <li key={s["pt-BR"]}><Badge tone="gold">{localizedName(s, locale)}</Badge></li>)}
                  {v.languages.slice(0, 3).map((l) => <li key={l}><Badge>{languageName(l, locale)}</Badge></li>)}
                </ul>
              </Card>
            </li>
          ))}
        </ul>
        <Pagination page={page} pages={hasNext ? page + 1 : page} basePath="/talentos" params={{ q, pais: country, idioma: lang, disponibilidade: availability, area: category?.toString() }} m={m} />
      </>
    );
  }

  return (
    <Container className="py-12">
      <PageHeader title={m.talents.title} subtitle={m.talents.subtitle} />
      <form role="search" aria-label={m.talents.searchLabel} className="mb-4 grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft md:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
        <label className="sr-only" htmlFor="t-q">{m.talents.searchLabel}</label>
        <Input id="t-q" name="q" type="search" defaultValue={q} placeholder={m.talents.searchPlaceholder} />
        <label className="sr-only" htmlFor="t-area">{m.opportunities.category}</label>
        <Select id="t-area" name="area" defaultValue={category?.toString() ?? ""}>
          <option value="">{m.opportunities.category}: {m.common.anyOption}</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <label className="sr-only" htmlFor="t-idioma">{m.profile.languages}</label>
        <Select id="t-idioma" name="idioma" defaultValue={lang ?? ""}>
          <option value="">{m.profile.languages}: {m.common.anyOption}</option>
          {sortedLanguages(locale).map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
        </Select>
        <label className="sr-only" htmlFor="t-pais">{m.opportunities.country}</label>
        <Select id="t-pais" name="pais" defaultValue={country ?? ""}>
          <option value="">{m.opportunities.country}: {m.common.anyOption}</option>
          {sortedCountries(locale).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </Select>
        <label className="sr-only" htmlFor="t-disp">{m.profile.availability}</label>
        <Select id="t-disp" name="disponibilidade" defaultValue={availability ?? ""}>
          <option value="">{m.profile.availability}: {m.common.anyOption}</option>
          {availabilityValues.map((a) => <option key={a} value={a}>{m.enums.availability[a]}</option>)}
        </Select>
        <button type="submit" className="h-11 rounded-full bg-lime-400 px-6 font-semibold text-night-950 hover:bg-lime-300">{m.common.search}</button>
      </form>
      <p className="mb-8 text-xs text-ink-muted">{m.talents.privacyNote}</p>
      {body}
    </Container>
  );
}
