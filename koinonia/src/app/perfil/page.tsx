import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { localizedName } from "@/i18n/format";
import { requireSession } from "@/features/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCatalog } from "@/services/catalog";
import { ProfileEditor, type SkillGroup } from "@/features/profiles/components/profile-editor";
import { Container, PageHeader } from "@/components/layout/page-header";
import { Alert, ButtonLink } from "@/components/ui";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { sortedCountries, sortedLanguages } from "@/lib/geo";
import type { PortfolioItem, ProfilePrivate } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.profile.editTitle };
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ m, locale }, sp] = await Promise.all([getI18n(), searchParams]);
  const session = await requireSession("/perfil");
  const supabase = await createClient();
  if (!supabase || !session.profile) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;

  const [catalog, priv, skills, portfolio] = await Promise.all([
    getCatalog(supabase),
    supabase.from("profile_private").select("*").eq("user_id", session.userId).maybeSingle<ProfilePrivate>(),
    supabase.from("profile_skills").select("skill_id").eq("profile_id", session.userId),
    supabase.from("portfolio_items").select("*").eq("profile_id", session.userId).order("created_at", { ascending: false }),
  ]);
  const skillGroups: SkillGroup[] = catalog.categories.map((c) => ({
    category: localizedName(c.names, locale),
    skills: catalog.skills.filter((s) => s.category_id === c.id).map((s) => ({ id: s.id, name: localizedName(s.names, locale) })),
  }));

  return (
    <Container size="md" className="py-12">
      <PageHeader title={m.profile.editTitle} subtitle={m.profile.editSubtitle}
        actions={<ButtonLink href={`/voluntarios/${session.userId}`} variant="outline" size="sm">{m.profile.viewPublic}</ButtonLink>} />
      {sp["bem-vindo"] ? <Alert tone="success" className="mb-6" live="polite">{m.profile.skillsHint}</Alert> : null}
      <ProfileEditor
        m={m}
        profile={session.profile}
        priv={priv.data ?? null}
        countries={sortedCountries(locale)}
        languages={sortedLanguages(locale)}
        skillGroups={skillGroups}
        mySkills={(skills.data ?? []).map((s) => s.skill_id as number)}
        portfolio={(portfolio.data ?? []) as PortfolioItem[]}
      />
    </Container>
  );
}
