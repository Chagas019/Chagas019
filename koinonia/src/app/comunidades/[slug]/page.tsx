import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgeCheck, ExternalLink, MapPin } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/features/auth/session";
import { getCommunityBySlug, getMyMembership } from "@/services/communities";
import { listOpportunities } from "@/services/opportunities";
import { joinCommunityAction, leaveCommunityAction } from "@/features/communities/actions";
import { ReportButton } from "@/features/moderation/components/report-button";
import { Alert, Badge, Button, ButtonLink, StatePanel } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { OpportunityCard } from "@/components/features/opportunity-card";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { countryName, languageName } from "@/lib/geo";
import { getCatalog } from "@/services/catalog";
import { localizedName } from "@/i18n/format";
import { CommunityLogo } from "@/components/features/community-card";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const c = supabase ? await getCommunityBySlug(supabase, slug).catch(() => null) : null;
  return { title: c?.name ?? (await getI18n()).m.communities.title, description: c?.description?.slice(0, 160) };
}

export default async function CommunityPage({ params }: Params) {
  const [{ slug }, { m, locale }, session] = await Promise.all([params, getI18n(), getSession()]);
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const community = await getCommunityBySlug(supabase, slug);
  if (!community) notFound();
  const [role, opps, members] = await Promise.all([
    getMyMembership(supabase, community.id, session?.userId),
    listOpportunities(supabase, { communityId: community.id }),
    supabase.from("community_members").select("user_id", { count: "exact", head: true }).eq("community_id", community.id),
  ]);
  const { data: reviewData } = await supabase.from("reviews").select("id, rating, comment, created_at").eq("reviewee_community_id", community.id).order("created_at", { ascending: false }).limit(10);
  const reviewRows = (reviewData ?? []) as Array<{ id: string; rating: number; comment: string; created_at: string }>;
  const avg = reviewRows.length ? reviewRows.reduce((a, r) => a + r.rating, 0) / reviewRows.length : null;
  const isAdmin = role === "owner" || role === "admin";
  const catalog = await getCatalog(supabase);
  const areas = community.focus_categories.map((id) => catalog.categories.find((c) => c.id === id)).filter((c) => c !== undefined).map((c) => localizedName(c.names, locale));
  const soughtIds = [...new Set(opps.items.filter((o) => o.status === "open").flatMap((o) => o.opportunity_skills.map((x) => x.skill_id)))];
  const sought = soughtIds.map((id) => catalog.skills.find((x) => x.id === id)).filter((x) => x !== undefined).map((x) => localizedName(x.names, locale));

  return (
    <>
      <section className="bg-grain bg-night-950 text-white">
        <Container className="py-14">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="gold">{m.enums.communityKind[community.kind]}</Badge>
            {community.status === "verified" ? <Badge tone="success"><BadgeCheck aria-hidden />{m.communities.verifiedBadge}</Badge> : <Badge tone="warning">{m.enums.communityStatus[community.status]}</Badge>}
          </div>
          <div className="mt-5 flex items-center gap-5"><CommunityLogo name={community.name} src={community.logo_url} className="size-20" /><h1 className="font-display text-4xl font-semibold sm:text-5xl">{community.name}</h1></div>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-ink-muted">
            <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="size-4" />{community.city}, {countryName(community.country_code, locale)}</span>
            {community.diocese ? <span>{community.diocese}</span> : null}
            <span>{members.count ?? 0} {m.communities.members.toLowerCase()}</span>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {isAdmin ? <ButtonLink href={`/comunidades/${community.slug}/gerenciar`} variant="gold">{m.communities.manage}</ButtonLink> : null}
            {session && !role && community.status === "verified" ? (
              <form action={joinCommunityAction}>
                <input type="hidden" name="communityId" value={community.id} /><input type="hidden" name="slug" value={community.slug} />
                <Button type="submit" variant="gold">{m.communities.join}</Button>
              </form>
            ) : null}
            {role === "member" ? (
              <form action={leaveCommunityAction}>
                <input type="hidden" name="communityId" value={community.id} /><input type="hidden" name="slug" value={community.slug} />
                <Button type="submit" variant="onDark">{m.communities.leave}</Button>
              </form>
            ) : null}
            {!session && community.status === "verified" ? <ButtonLink href={`/entrar?next=/comunidades/${community.slug}`} variant="gold">{m.communities.join}</ButtonLink> : null}
            {community.website ? <a href={community.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/25 px-5 text-sm font-semibold hover:bg-white/10">{m.communities.website}<ExternalLink aria-hidden className="size-4" /></a> : null}
          </div>
        </Container>
      </section>
      <Container className="py-12">
        {community.status !== "verified" ? <Alert tone="warning" className="mb-8">{m.communities.pendingNotice}</Alert> : null}
        {role ? <p className="mb-6 text-sm text-ink-muted">{m.communities.joined} ({m.enums.memberRole[role]})</p> : null}
        <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
          <div>
            {community.description ? <p className="mb-10 leading-relaxed whitespace-pre-line">{community.description}</p> : null}
            <h2 className="mb-5 font-display text-2xl font-semibold">{m.communities.opportunities}</h2>
            {opps.items.length === 0 ? <StatePanel variant="empty" title={m.states.emptyTitle} headingLevel={3}><p>{m.communities.noOpportunities}</p></StatePanel> : (
              <ul className="grid gap-4 sm:grid-cols-2">{opps.items.map((o) => <li key={o.id}><OpportunityCard o={o} m={m} locale={locale} /></li>)}</ul>
            )}
          </div>
          <aside className="space-y-4">
            {community.needs ? (
              <div className="rounded-xl border border-neon-400/30 bg-surface p-5">
                <h2 className="mb-2 font-display text-lg font-semibold text-neon-300">{m.communities.needs}</h2>
                <p className="text-sm leading-relaxed whitespace-pre-line">{community.needs}</p>
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-2 font-display text-lg font-semibold">{m.communities.soughtSkills}</h2>
              {sought.length ? <ul className="flex flex-wrap gap-1.5">{sought.map((n) => <li key={n}><Badge tone="gold">{n}</Badge></li>)}</ul> : <p className="text-sm text-ink-muted">{m.communities.noSought}</p>}
            </div>
            {areas.length ? (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h2 className="mb-2 font-display text-lg font-semibold">{m.communities.focusAreas}</h2>
                <ul className="flex flex-wrap gap-1.5">{areas.map((n) => <li key={n}><Badge tone="brand">{n}</Badge></li>)}</ul>
              </div>
            ) : null}
            {community.languages.length ? (
              <div className="rounded-xl border border-border bg-surface p-5">
                <h2 className="mb-2 font-display text-lg font-semibold">{m.communities.languages}</h2>
                <p className="text-sm">{community.languages.map((l) => languageName(l, locale)).join(" · ")}</p>
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="mb-2 font-display text-lg font-semibold">{m.profile.reviews}{avg !== null ? <span className="ml-2 text-sm font-normal text-ink-muted">★ {avg.toFixed(1)} ({reviewRows.length})</span> : null}</h2>
              {reviewRows.length === 0 ? <p className="text-sm text-ink-muted">{m.profile.noReviews}</p> : (
                <ul className="space-y-3">
                  {reviewRows.map((r) => (
                    <li key={r.id} className="text-sm">
                      <p aria-label={`${r.rating}/5`} className="text-accent-ink">{"★".repeat(r.rating)}<span className="text-white/20">{"★".repeat(5 - r.rating)}</span></p>
                      {r.comment ? <p className="mt-0.5">{r.comment}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {session && !isAdmin ? <ReportButton m={m} targetType="community" targetId={community.id} label={m.report.title} /> : null}
          </aside>
        </div>
      </Container>
    </>
  );
}
