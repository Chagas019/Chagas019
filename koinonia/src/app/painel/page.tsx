import type { Metadata } from "next";
import Link from "next/link";
import { Bell, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { t } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { listMyCommunities } from "@/services/communities";
import { setApplicationStatusAction } from "@/features/opportunities/actions";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { markAllNotificationsReadAction } from "@/features/notifications/actions";
import { describeNotification } from "@/features/notifications/format";
import { Badge, Button, ButtonLink, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Container, PageHeader } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { CommunityCard } from "@/components/features/community-card";
import { formatDate } from "@/lib/geo";
import { getOpportunitiesByIds } from "@/services/opportunities";
import { OpportunityCard } from "@/components/features/opportunity-card";
import { Reveal } from "@/components/ui/reveal";
import { ClipboardList, Package, Users as UsersIcon, MessageCircle as MsgIcon } from "lucide-react";
import type { ApplicationStatus, Notification } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.nav.dashboard };
}

export default async function DashboardPage() {
  const { m, locale } = await getI18n();
  const session = await requireSession("/painel");
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;

  const [communities, apps, notifs] = await Promise.all([
    listMyCommunities(supabase, session.userId),
    supabase.from("applications").select("id, status, created_at, opportunity:opportunities(id, title, community_id)").eq("applicant_id", session.userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("notifications").select("*").eq("user_id", session.userId).order("created_at", { ascending: false }).limit(15),
  ]);
  const { data: reqData } = await supabase.from("resource_requests").select("id, status, starts_on, ends_on, resource:resources(id, title)").eq("requester_id", session.userId).order("created_at", { ascending: false }).limit(20);
  const myRequests = (reqData ?? []) as unknown as Array<{ id: string; status: keyof typeof m.resources.status; starts_on: string; ends_on: string; resource: { id: string; title: string } | null }>;
  const appRows = (apps.data ?? []) as unknown as Array<{ id: string; status: ApplicationStatus; created_at: string; opportunity: { id: string; title: string; community_id: string } | null }>;
  const { data: myReviews } = await supabase.from("reviews").select("application_id").eq("reviewer_id", session.userId);
  const reviewed = new Set((myReviews ?? []).map((r) => r.application_id as string));
  const reviewLabels = { open: m.reviews.rateCommunity, rating: m.reviews.rating, stars: m.reviews.stars, comment: m.reviews.comment, submit: m.reviews.submit, sending: m.common.saving };
  const notifRows = (notifs.data ?? []) as Notification[];
  const unread = notifRows.filter((n) => !n.read_at).length;
  const [{ data: unreadMsgs }, { data: recData }, { count: skillCount }] = await Promise.all([
    supabase.rpc("unread_message_count"),
    supabase.rpc("match_opportunities_for_me", { p_limit: 3 }),
    supabase.from("profile_skills").select("skill_id", { count: "exact", head: true }).eq("profile_id", session.userId),
  ]);
  const recRows = (recData ?? []) as Array<{ opportunity_id: string; score: number }>;
  const recOpps = await getOpportunitiesByIds(supabase, recRows.map((r) => r.opportunity_id));
  const p = session.profile;
  const checks = [p?.bio, p?.country_code, p?.city, p?.languages.length, p?.availability.length, p?.avatar_url, skillCount];
  const completion = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <Container className="py-12">
      <PageHeader title={t(m.dashboard.title, { name: session.profile?.display_name || "" })} subtitle={m.dashboard.subtitle}
        actions={<ButtonLink href="/match" variant="gold"><Sparkles aria-hidden />{m.dashboard.matchCta}</ButtonLink>} />
      <section aria-label={m.dashboard.summary} className="mb-10">
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { Icon: ClipboardList, label: m.dashboard.statApplications, value: appRows.length, href: "#my-apps" },
            { Icon: UsersIcon, label: m.dashboard.statCommunities, value: communities.length, href: "#my-communities" },
            { Icon: MsgIcon, label: m.dashboard.statUnread, value: typeof unreadMsgs === "number" ? unreadMsgs : 0, href: "/mensagens" },
            { Icon: Package, label: m.dashboard.statRequests, value: myRequests.length, href: "#my-requests" },
          ].map(({ Icon, label, value, href }, i) => (
            <li key={label} className="animate-rise" style={{ animationDelay: `${i * 70}ms` }}>
              <Link href={href} className="card-glow flex h-full flex-col gap-2 rounded-xl border border-border bg-surface/80 p-5 transition-transform hover:-translate-y-0.5">
                <Icon aria-hidden className="card-icon size-5 text-neon-400" />
                <span className="font-display text-4xl text-white">{value}</span>
                <span className="text-xs text-ink-muted">{label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-xl border border-border bg-surface/80 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>{t(m.dashboard.profileCompletion, { pct: completion })}</span>
            {completion < 100 ? <Link href="/perfil" className="font-semibold text-neon-400 hover:text-neon-300">{m.profile.editTitle}</Link> : null}
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-night-600" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} aria-label={t(m.dashboard.profileCompletion, { pct: completion })}>
            <div className="h-full rounded-full bg-gradient-to-r from-neon-500 to-neon-300 transition-[width] duration-700" style={{ width: `${completion}%` }} />
          </div>
        </div>
      </section>

      <section aria-labelledby="recommended" className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="recommended" className="font-display text-2xl font-semibold">{m.dashboard.recommended}</h2>
          <Link href="/match" className="text-sm font-semibold text-neon-400 hover:text-neon-300">{m.common.seeAll}</Link>
        </div>
        {recOpps.length === 0 ? <p className="text-sm text-ink-muted">{m.dashboard.noRecommended}</p> : (
          <ul className="grid gap-4 md:grid-cols-3">
            {recRows.map((r, i) => {
              const o = recOpps.find((x) => x.id === r.opportunity_id);
              return o ? <Reveal as="li" key={o.id} index={i}><OpportunityCard o={o} m={m} locale={locale} score={Number(r.score)} /></Reveal> : null;
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="my-apps">
            <h2 id="my-apps" className="mb-4 font-display text-2xl font-semibold">{m.dashboard.myApplications}</h2>
            {appRows.length === 0 ? (
              <Card><CardContent className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-ink-muted">{m.dashboard.noApplications}</p><ButtonLink href="/oportunidades" size="sm" variant="outline">{m.home.ctaExplore}</ButtonLink></CardContent></Card>
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                {appRows.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      {a.opportunity ? <Link href={`/oportunidades/${a.opportunity.id}`} className="font-semibold underline-offset-4 hover:underline">{a.opportunity.title}</Link> : "—"}
                      <p className="text-xs text-ink-subtle">{formatDate(a.created_at, locale)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={a.status === "accepted" || a.status === "completed" ? "success" : a.status === "rejected" ? "danger" : "info"}>{m.enums.applicationStatus[a.status]}</Badge>
                      {a.status === "pending" ? (
                        <form action={setApplicationStatusAction}>
                          <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value="withdrawn" /><input type="hidden" name="back" value="/painel" />
                          <Button type="submit" variant="ghost" size="sm">{m.dashboard.withdraw}</Button>
                        </form>
                      ) : null}
                    </div>
                    {a.status === "completed" && a.opportunity && !reviewed.has(a.id) ? (
                      <div className="w-full"><ReviewForm applicationId={a.id} target="community" revieweeId={a.opportunity.community_id} back="/painel" labels={reviewLabels} /></div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="my-requests">
            <h2 id="my-requests" className="mb-4 font-display text-2xl font-semibold">{m.resources.myRequests}</h2>
            {myRequests.length === 0 ? <p className="text-sm text-ink-muted">{m.resources.noMyRequests} <Link href="/recursos" className="font-semibold text-accent-ink">{m.resources.title}</Link></p> : (
              <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
                {myRequests.map((q) => (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      {q.resource ? <Link href={`/recursos/${q.resource.id}`} className="font-semibold underline-offset-4 hover:underline">{q.resource.title}</Link> : "—"}
                      <p className="text-xs text-ink-subtle">{formatDate(q.starts_on, locale)} – {formatDate(q.ends_on, locale)}</p>
                    </div>
                    <Badge tone={q.status === "approved" ? "success" : q.status === "declined" ? "danger" : "info"}>{m.resources.status[q.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="my-communities">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 id="my-communities" className="font-display text-2xl font-semibold">{m.dashboard.myCommunities}</h2>
              <ButtonLink href="/comunidades/nova" size="sm" variant="outline">{m.dashboard.createCommunity}</ButtonLink>
            </div>
            {communities.length === 0 ? <p className="text-sm text-ink-muted">{m.dashboard.noCommunities}</p> : (
              <ul className="grid gap-4 sm:grid-cols-2">{communities.map(({ community, role }) => (
                <li key={community.id} className="space-y-2">
                  <CommunityCard c={community} m={m} locale={locale} />
                  <p className="px-1 text-xs text-ink-muted">{m.enums.memberRole[role]}{role !== "member" ? <> · <Link className="font-semibold text-accent-ink" href={`/comunidades/${community.slug}/gerenciar`}>{m.communities.manage}</Link></> : null}</p>
                </li>
              ))}</ul>
            )}
          </section>
        </div>
        <aside>
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle as="h2" className="flex items-center gap-2"><Bell aria-hidden className="size-5 text-neon-400" />{m.dashboard.activity}{unread ? <Badge tone="gold">{unread}</Badge> : null}</CardTitle>
              {unread ? <form action={markAllNotificationsReadAction}><Button type="submit" size="sm" variant="link">{m.dashboard.markAllRead}</Button></form> : null}
            </CardHeader>
            <CardContent>
              {notifRows.length === 0 ? <p className="text-sm text-ink-muted">{m.dashboard.noNotifications}</p> : (
                <ul className="space-y-3">
                  {notifRows.map((n) => {
                    const d = describeNotification(n, m);
                    return (
                      <li key={n.id} className={`animate-rise rounded-lg border p-3 text-sm ${n.read_at ? "border-border" : "border-neon-400/40 bg-neon-400/10"}`}>
                        {d.href ? <Link href={d.href} className="underline-offset-4 hover:underline">{d.text}</Link> : d.text}
                        <p className="mt-1 text-xs text-ink-subtle">{formatDate(n.created_at, locale)}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
