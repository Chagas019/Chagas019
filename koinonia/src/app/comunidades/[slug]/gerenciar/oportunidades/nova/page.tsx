import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { localizedName } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { loadManagedCommunity } from "@/services/community-admin";
import { getCatalog } from "@/services/catalog";
import { OpportunityForm } from "@/features/opportunities/components/opportunity-form";
import { Container, PageHeader } from "@/components/layout/page-header";
import { StatePanel } from "@/components/ui";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { sortedCountries, sortedLanguages } from "@/lib/geo";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.opportunities.createTitle, robots: { index: false } };
}

export default async function NewOpportunityPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, { m, locale }] = await Promise.all([params, getI18n()]);
  const session = await requireSession(`/comunidades/${slug}/gerenciar/oportunidades/nova`);
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const { community, canManage } = await loadManagedCommunity(supabase, slug, session);
  if (!canManage) return <Container className="py-16"><StatePanel variant="forbidden" title={m.states.forbiddenTitle} headingLevel={1}><p>{m.states.forbiddenBody}</p></StatePanel></Container>;
  const catalog = await getCatalog(supabase);
  const skillGroups = catalog.categories.map((c) => ({
    category: localizedName(c.names, locale),
    skills: catalog.skills.filter((s) => s.category_id === c.id).map((s) => ({ id: s.id, name: localizedName(s.names, locale) })),
  }));
  return (
    <Container size="sm" className="py-12">
      <PageHeader eyebrow={community.name} title={m.opportunities.createTitle} />
      <OpportunityForm m={m} communityId={community.id} slug={community.slug} verified={community.status === "verified"}
        countries={sortedCountries(locale)} languages={sortedLanguages(locale)} skillGroups={skillGroups} defaultCountry={community.country_code} />
    </Container>
  );
}
