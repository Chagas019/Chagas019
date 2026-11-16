import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { getOpportunitiesByIds } from "@/services/opportunities";
import { scoreMatch } from "@/features/matching/score";
import { matchReasons } from "@/features/matching/reasons";
import { Container, PageHeader } from "@/components/layout/page-header";
import { ButtonLink, StatePanel } from "@/components/ui";
import { OpportunityCard } from "@/components/features/opportunity-card";
import { BackendUnavailable } from "@/components/features/backend-unavailable";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.match.title };
}

export default async function MatchPage() {
  const { m, locale } = await getI18n();
  const session = await requireSession("/match");
  const supabase = await createClient();
  if (!supabase || !session.profile) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;

  const [{ data: matches, error }, { data: mySkills }] = await Promise.all([
    supabase.rpc("match_opportunities_for_me", { p_limit: 12 }),
    supabase.from("profile_skills").select("skill_id").eq("profile_id", session.userId),
  ]);
  const rows = (matches ?? []) as Array<{ opportunity_id: string; score: number }>;
  const opps = error ? [] : await getOpportunitiesByIds(supabase, rows.map((r) => r.opportunity_id));
  const p = session.profile;
  const volunteer = { skills: (mySkills ?? []).map((s) => s.skill_id as number), languages: p.languages, country: p.country_code, city: p.city, availability: p.availability };

  return (
    <Container className="py-12">
      <PageHeader title={m.match.title} subtitle={m.match.subtitle} />
      {error ? <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>
        : rows.length === 0 ? (
          <StatePanel variant="empty" title={m.states.emptyTitle} action={<ButtonLink href="/perfil">{m.profile.editTitle}</ButtonLink>}><p>{m.match.empty}</p></StatePanel>
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rows.map((r) => {
              const o = opps.find((x) => x.id === r.opportunity_id);
              if (!o) return null;
              const result = scoreMatch(volunteer, {
                skills: o.opportunity_skills.map((s) => s.skill_id), languages: o.languages, mode: o.mode,
                country: o.country_code, city: o.city, availability: o.availability,
              });
              return (
                <li key={o.id} className="flex flex-col gap-3">
                  <OpportunityCard o={o} m={m} locale={locale} score={Number(r.score)} />
                  <details className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                    <summary className="cursor-pointer font-semibold">{m.match.why}</summary>
                    <ul className="mt-3 space-y-1.5">
                      {matchReasons(result, m).map((reason) => (
                        <li key={reason.text} className="flex items-center gap-2">
                          {reason.positive ? <Check aria-hidden className="size-4 text-success" /> : <Minus aria-hidden className="size-4 text-ink-subtle" />}
                          {reason.text}
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
    </Container>
  );
}
