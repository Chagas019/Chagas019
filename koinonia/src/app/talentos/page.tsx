import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Clock, Globe2, MapPin, Monitor } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { localizedName } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { getCatalog } from "@/services/catalog";
import { PAGE_SIZE, parsePage, sanitizeSearch } from "@/services/pagination";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Avatar, Badge, Card, Input, Select, StatePanel } from "@/components/ui";
import { Reveal } from "@/components/ui/reveal";
import { Pagination } from "@/components/features/pagination";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { TALENT_CHIPS } from "@/features/profiles/talent-chips";
import { countryName, isCountryCode, isLanguageCode, languageName, sortedCountries, sortedLanguages } from "@/lib/geo";
import { availabilityValues, opportunityModeValues } from "@/schemas/common";
import { cn } from "@/lib/utils";
import type { AvailabilitySlot, OpportunityMode, VolunteerSearchRow } from "@/types/database";

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
  const modeRaw = one(sp.modalidade);
  const mode = (opportunityModeValues as readonly string[]).includes(modeRaw) ? (modeRaw as OpportunityMode) : undefined;
  const talento = /^[a-z-]{2,60}$/.test(one(sp.talento)) ? one(sp.talento) : undefined;
  const cat = Number(one(sp.area));
  const page = parsePage(sp.pagina);
  const supabase = await createClient();

  let body: React.ReactNode;
  let categories: Array<{ id: number; name: string }> = [];
  if (!supabase) body = <BackendUnavailable m={m} />;
  else {
    const catalog = await getCatalog(supabase);
    categories = catalog.categories.map((c) => ({ id: c.id, name: localizedName(c.names, locale) }));
    // atalho de talento → id real do catálogo (talento ou área)
    const skillFromChip = talento ? catalog.skills.find((s) => s.slug === talento)?.id : undefined;
    const catFromChip = talento ? catalog.categories.find((c) => c.slug === talento)?.id : undefined;
    const category = catFromChip ?? (Number.isInteger(cat) && cat > 0 ? cat : undefined);
    const res = await supabase.rpc("search_volunteers", {
      p_query: q || null, p_category: category ?? null, p_skill: skillFromChip ?? null, p_languages: lang ? [lang] : null,
      p_country: country ?? null, p_availability: availability ? [availability] : null, p_modes: mode ? [mode] : null,
      p_limit: PAGE_SIZE + 1, p_offset: (page - 1) * PAGE_SIZE,
    });
    const rows = (res.data ?? []) as VolunteerSearchRow[];
    const hasNext = rows.length > PAGE_SIZE;
    if (res.error) body = <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>;
    else if (rows.length === 0) body = <StatePanel variant="empty" title={m.states.emptyTitle}><p>{m.talents.empty}</p></StatePanel>;
    else body = (
      <>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.slice(0, PAGE_SIZE).map((v, i) => (
            <Reveal as="li" key={v.id} index={i % 3}>
              <Card interactive className="flex h-full flex-col gap-4 p-6">
                <div className="flex items-center gap-4">
                  <Avatar name={v.display_name} src={v.avatar_url} size="lg" className="size-16" />
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-2xl text-white">{v.display_name}</h2>
                    {v.country_code ? <p className="flex items-center gap-1 text-xs text-ink-subtle"><MapPin aria-hidden className="size-3.5" />{[v.city, countryName(v.country_code, locale)].filter(Boolean).join(", ")}</p> : null}
                  </div>
                </div>
                {v.bio ? <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">{v.bio}</p> : null}
                {v.skill_names.length ? (
                  <ul aria-label={m.profile.skills} className="flex flex-wrap gap-1.5">
                    {v.skill_names.slice(0, 5).map((s) => <li key={s["pt-BR"]}><Badge tone="gold">{localizedName(s, locale)}</Badge></li>)}
                  </ul>
                ) : null}
                <dl className="mt-auto grid gap-1.5 border-t border-border pt-4 text-xs text-ink-muted">
                  {v.languages.length ? <div className="flex items-center gap-2"><Globe2 aria-hidden className="size-3.5 text-neon-400" /><dt className="sr-only">{m.profile.languages}</dt><dd>{v.languages.map((l) => languageName(l, locale)).join(" · ")}</dd></div> : null}
                  {v.availability.length ? <div className="flex items-center gap-2"><Clock aria-hidden className="size-3.5 text-neon-400" /><dt className="sr-only">{m.profile.availability}</dt><dd>{v.availability.map((a) => m.enums.availability[a]).join(" · ")}</dd></div> : null}
                  {v.service_modes.length ? <div className="flex items-center gap-2"><Monitor aria-hidden className="size-3.5 text-neon-400" /><dt className="sr-only">{m.talents.modes}</dt><dd>{v.service_modes.map((x) => m.enums.opportunityMode[x]).join(" · ")}</dd></div> : null}
                </dl>
                <Link href={`/voluntarios/${v.id}`} className="group inline-flex items-center gap-2 text-sm font-semibold text-neon-400 hover:text-neon-300">
                  {m.talents.viewProfile}<ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
                  <span className="sr-only">: {v.display_name}</span>
                </Link>
              </Card>
            </Reveal>
          ))}
        </ul>
        <Pagination page={page} pages={hasNext ? page + 1 : page} basePath="/talentos" params={{ q, pais: country, idioma: lang, disponibilidade: availability, modalidade: mode, talento, area: Number.isInteger(cat) && cat > 0 ? String(cat) : undefined }} m={m} />
      </>
    );
  }

  return (
    <Container className="py-12">
      <PageHeader title={m.talents.title} subtitle={m.talents.subtitle} />
      <nav aria-label={m.talents.title} className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex w-max gap-2">
          {TALENT_CHIPS.map((c) => {
            const active = (c.slug ?? undefined) === talento;
            return (
              <li key={c.key}>
                <Link href={c.slug ? `/talentos?talento=${c.slug}` : "/talentos"} aria-current={active ? "page" : undefined}
                  className={cn("inline-flex h-10 items-center rounded-full border px-4 text-sm transition-colors", active ? "border-neon-400 bg-neon-400 text-night-950" : "border-border text-ink hover:border-neon-400/60")}>
                  {m.talents.chips[c.key]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <form role="search" aria-label={m.talents.searchLabel} className="glass mb-4 grid gap-3 rounded-xl p-4 md:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_1fr_auto]">
        {talento ? <input type="hidden" name="talento" value={talento} /> : null}
        <label className="sr-only" htmlFor="t-q">{m.talents.searchLabel}</label>
        <Input id="t-q" name="q" type="search" defaultValue={q} placeholder={m.talents.searchPlaceholder} />
        <label className="sr-only" htmlFor="t-area">{m.opportunities.category}</label>
        <Select id="t-area" name="area" defaultValue={Number.isInteger(cat) && cat > 0 ? String(cat) : ""}>
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
        <label className="sr-only" htmlFor="t-mode">{m.talents.modes}</label>
        <Select id="t-mode" name="modalidade" defaultValue={mode ?? ""}>
          <option value="">{m.talents.modes}: {m.common.anyOption}</option>
          {opportunityModeValues.map((x) => <option key={x} value={x}>{m.enums.opportunityMode[x]}</option>)}
        </Select>
        <button type="submit" className="h-11 rounded-md bg-neon-400 px-6 text-sm font-semibold tracking-[0.12em] text-night-950 uppercase transition hover:bg-neon-300">{m.common.search}</button>
      </form>
      <p className="mb-8 text-xs text-ink-muted">{m.talents.privacyNote}</p>
      {body}
    </Container>
  );
}
