import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireSession } from "@/features/auth/session";
import { CommunityForm } from "@/features/communities/components/community-form";
import { Container, PageHeader } from "@/components/layout/page-header";
import { sortedCountries, sortedLanguages } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import { getCatalog } from "@/services/catalog";
import { localizedName } from "@/i18n/format";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.communities.createTitle };
}

export default async function NewCommunityPage() {
  const { m, locale } = await getI18n();
  await requireSession("/comunidades/nova");
  const supabase = await createClient();
  const catalog = supabase ? await getCatalog(supabase).catch(() => null) : null;
  const categories = (catalog?.categories ?? []).map((c) => ({ id: c.id, name: localizedName(c.names, locale) }));
  return (
    <Container size="sm" className="py-12">
      <PageHeader title={m.communities.createTitle} subtitle={m.communities.createSubtitle} />
      <CommunityForm m={m} categories={categories} countries={sortedCountries(locale)} languages={sortedLanguages(locale)} />
    </Container>
  );
}
