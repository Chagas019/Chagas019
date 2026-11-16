import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock, Globe2, MapPin, Star } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { localizedName, t } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/features/auth/session";
import { getCatalog } from "@/services/catalog";
import { uuidSchema } from "@/schemas/common";
import { Alert, Avatar, Badge, Button, Card, CardContent } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { ReportButton } from "@/features/moderation/components/report-button";
import { startConversationAction } from "@/features/messaging/actions";
import { countryName, formatDate, languageName } from "@/lib/geo";
import type { PortfolioItem, Profile } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!uuidSchema.safeParse(id).success) return null;
  const supabase = await createClient();
  if (!supabase) return { supabase: null, profile: null };
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  return { supabase, profile: data };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const res = await load(id);
  return { title: res?.profile?.display_name || "Perfil", robots: { index: res?.profile?.visibility === "public" } };
}

export default async function VolunteerPage({ params, searchParams }: Params & { searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, { m, locale }, session, sp] = await Promise.all([params, getI18n(), getSession(), searchParams]);
  const res = await load(id);
  if (!res) notFound();
  if (!res.supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const { supabase, profile } = res;
  if (!profile) notFound();

  const [catalog, skills, portfolio, reviews, history] = await Promise.all([
    getCatalog(supabase),
    supabase.from("profile_skills").select("skill_id, level").eq("profile_id", id),
    supabase.from("portfolio_items").select("*").eq("profile_id", id).order("created_at", { ascending: false }),
    supabase.from("reviews").select("id, rating, comment, created_at").eq("reviewee_profile_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.rpc("collaboration_history", { p_profile: id }),
  ]);
  const historyRows = (history.data ?? []) as Array<{ application_id: string; opportunity_id: string; opportunity_title: string; community_slug: string; community_name: string; completed_at: string | null }>;
  const skillNames = (skills.data ?? []).map((s) => {
    const sk = catalog.skills.find((x) => x.id === s.skill_id);
    return sk ? localizedName(sk.names, locale) : null;
  }).filter((x): x is string => Boolean(x));
  const reviewRows = reviews.data ?? [];
  const avg = reviewRows.length ? reviewRows.reduce((a, r) => a + (r.rating as number), 0) / reviewRows.length : null;

  return (
    <Container size="md" className="py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" />
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-semibold">{profile.display_name}</h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-muted">
            {profile.country_code ? <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="size-4" />{[profile.city, countryName(profile.country_code, locale)].filter(Boolean).join(", ")}</span> : null}
            {profile.hours_per_week ? <span className="inline-flex items-center gap-1.5"><Clock aria-hidden className="size-4" />{t(m.profile.hoursPerWeek, { hours: profile.hours_per_week })}</span> : null}
            {avg !== null ? <span className="inline-flex items-center gap-1.5"><Star aria-hidden className="size-4 fill-lime-400 text-lime-400" />{avg.toFixed(1)} ({reviewRows.length})</span> : null}
          </p>
        </div>
      </div>
      {sp.erro === "mensagem" ? <Alert tone="warning" className="mt-6">{m.messages.notAllowed}</Alert> : null}
      {session && session.userId !== id && profile.message_permission !== "nobody" ? (
        <form action={startConversationAction} className="mt-6">
          <input type="hidden" name="userId" value={id} />
          <Button type="submit" variant="gold">{m.messages.start}</Button>
        </form>
      ) : null}
      {profile.bio ? <p className="mt-8 max-w-2xl leading-relaxed whitespace-pre-line text-ink">{profile.bio}</p> : null}

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card><CardContent>
          <h2 className="mb-3 font-display text-lg font-semibold">{m.profile.skills}</h2>
          {skillNames.length ? <ul className="flex flex-wrap gap-2">{skillNames.map((n) => <li key={n}><Badge tone="gold">{n}</Badge></li>)}</ul> : <p className="text-sm text-ink-muted">{m.profile.noSkills}</p>}
        </CardContent></Card>
        <Card><CardContent className="space-y-4">
          <div>
            <h2 className="mb-2 font-display text-lg font-semibold">{m.profile.languages}</h2>
            <p className="flex flex-wrap items-center gap-2 text-sm"><Globe2 aria-hidden className="size-4 text-ink-subtle" />{profile.languages.map((l) => languageName(l, locale)).join(" · ") || "—"}</p>
          </div>
          <div>
            <h2 className="mb-2 font-display text-lg font-semibold">{m.profile.availability}</h2>
            <ul className="flex flex-wrap gap-2">{profile.availability.map((a) => <li key={a}><Badge tone="brand">{m.enums.availability[a]}</Badge></li>)}</ul>
          </div>
        </CardContent></Card>
      </div>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">{m.profile.portfolio}</h2>
        {(portfolio.data ?? []).length === 0 ? <p className="text-sm text-ink-muted">{m.profile.portfolioEmpty}</p> : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {(portfolio.data as PortfolioItem[]).map((p) => (
              <li key={p.id}><Card className="h-full p-5">
                <h3 className="font-semibold">{p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className="underline-offset-4 hover:underline">{p.title}</a> : p.title}</h3>
                {p.description ? <p className="mt-1 text-sm text-ink-muted">{p.description}</p> : null}
              </Card></li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">{m.reviews.history}</h2>
        {historyRows.length === 0 ? <p className="text-sm text-ink-muted">{m.reviews.noHistory}</p> : (
          <ul className="space-y-2">
            {historyRows.map((h) => (
              <li key={h.application_id} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm">
                <span><Link href={`/oportunidades/${h.opportunity_id}`} className="font-semibold underline-offset-4 hover:underline">{h.opportunity_title}</Link>{" · "}<Link href={`/comunidades/${h.community_slug}`} className="text-accent-ink underline-offset-4 hover:underline">{h.community_name}</Link></span>
                <span className="text-xs text-ink-subtle">{formatDate(h.completed_at, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 font-display text-xl font-semibold">{m.profile.reviews}</h2>
        {reviewRows.length === 0 ? <p className="text-sm text-ink-muted">{m.profile.noReviews}</p> : (
          <ul className="space-y-3">
            {reviewRows.map((r) => (
              <li key={r.id as string} className="rounded-lg border border-border bg-surface p-4">
                <p className="text-sm font-semibold text-accent-ink" aria-label={`${r.rating}/5`}>{"★".repeat(r.rating as number)}<span className="text-white/20">{"★".repeat(5 - (r.rating as number))}</span></p>
                {r.comment ? <p className="mt-1 text-sm">{r.comment as string}</p> : null}
                <p className="mt-1 text-xs text-ink-subtle">{formatDate(r.created_at as string, locale)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {session && session.userId !== id ? <div className="mt-10 border-t border-border pt-6"><ReportButton m={m} targetType="profile" targetId={id} label={m.profile.report} /></div> : null}
    </Container>
  );
}
