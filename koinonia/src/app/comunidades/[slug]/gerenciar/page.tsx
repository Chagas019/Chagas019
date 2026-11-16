import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { getCommunityBySlug, getMyMembership } from "@/services/communities";
import { listOpportunities } from "@/services/opportunities";
import { listResources } from "@/services/resources";
import { ResourceForm } from "@/features/resources/components/resource-forms";
import { setMemberRoleAction } from "@/features/communities/actions";
import { CommunityForm, CommunityLogoForm } from "@/features/communities/components/community-form";
import { getCatalog } from "@/services/catalog";
import { localizedName } from "@/i18n/format";
import { VerificationForm } from "@/features/communities/components/verification-form";
import { Alert, Badge, Button, ButtonLink, Card, CardContent, CardDescription, CardHeader, CardTitle, StatePanel } from "@/components/ui";
import { Container, PageHeader } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { formatDate, sortedCountries, sortedLanguages } from "@/lib/geo";
import type { CommunityVerification, MemberRole } from "@/types/database";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.communities.manageTitle, robots: { index: false } };
}

export default async function ManageCommunityPage({ params, searchParams }: Params) {
  const [{ slug }, sp, { m, locale }] = await Promise.all([params, searchParams, getI18n()]);
  const session = await requireSession(`/comunidades/${slug}/gerenciar`);
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const community = await getCommunityBySlug(supabase, slug);
  if (!community) notFound();
  const role = await getMyMembership(supabase, community.id, session.userId);
  if (role !== "owner" && role !== "admin" && !session.isAdmin) {
    return <Container className="py-16"><StatePanel variant="forbidden" title={m.states.forbiddenTitle} headingLevel={1}><p>{m.states.forbiddenBody}</p></StatePanel></Container>;
  }

  const [verifications, membersRes, opps] = await Promise.all([
    supabase.from("community_verifications").select("*").eq("community_id", community.id).order("created_at", { ascending: false }),
    supabase.from("community_members").select("user_id, role, joined_at, profile:profiles(display_name)").eq("community_id", community.id).order("joined_at"),
    listOpportunities(supabase, { communityId: community.id, includeDrafts: true }),
  ]);
  const catalog = await getCatalog(supabase);
  const categories = catalog.categories.map((c) => ({ id: c.id, name: localizedName(c.names, locale) }));
  const resources = await listResources(supabase, { communityId: community.id, includeUnavailable: true });
  const vList = (verifications.data ?? []) as CommunityVerification[];
  const hasPending = vList.some((v) => v.status === "pending");
  const members = (membersRes.data ?? []) as unknown as Array<{ user_id: string; role: MemberRole; joined_at: string; profile: { display_name: string } | null }>;

  return (
    <Container size="md" className="py-12">
      <PageHeader eyebrow={m.communities.manageTitle} title={community.name}
        actions={<ButtonLink href={`/comunidades/${community.slug}`} variant="outline" size="sm">{m.common.seeDetails}</ButtonLink>} />
      {sp.criada ? <Alert tone="success" className="mb-6" live="polite">{m.communities.createSubtitle}</Alert> : null}

      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3"><CardTitle as="h2">{m.communities.verificationTitle}</CardTitle>
              <Badge tone={community.status === "verified" ? "success" : "warning"}>{m.enums.communityStatus[community.status]}</Badge></div>
            <CardDescription>{m.communities.verificationBody}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {community.status !== "verified" && !hasPending ? <VerificationForm m={m} communityId={community.id} /> : null}
            {hasPending ? <Alert tone="info">{m.communities.verificationPending}</Alert> : null}
            {vList.length ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">{m.communities.verificationHistory}</h3>
                <ul className="divide-y divide-border rounded-lg border border-border text-sm">
                  {vList.map((v) => (
                    <li key={v.id} className="flex flex-col gap-1 p-3">
                      <span className="flex items-center gap-2"><Badge tone={v.status === "approved" ? "success" : v.status === "rejected" ? "danger" : "info"}>{m.enums.verificationStatus[v.status]}</Badge>{formatDate(v.created_at, locale)}</span>
                      {v.review_notes ? <span className="text-ink-muted">{v.review_notes}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between">
            <CardTitle as="h2">{m.communities.opportunities}</CardTitle>
            {<ButtonLink href={`/comunidades/${community.slug}/gerenciar/oportunidades/nova`} size="sm">{m.communities.newOpportunity}</ButtonLink>}
          </CardHeader>
          <CardContent>
            {opps.items.length === 0 ? <p className="text-sm text-ink-muted">{m.communities.noOpportunities}</p> : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {opps.items.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0"><p className="font-semibold">{o.title}</p><p className="text-xs text-ink-muted">{formatDate(o.created_at, locale)}</p></div>
                    <div className="flex items-center gap-3">
                      <Badge tone={o.status === "open" ? "success" : "neutral"}>{m.enums.opportunityStatus[o.status]}</Badge>
                      <Link href={`/comunidades/${community.slug}/gerenciar/oportunidades/${o.id}`} className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">{m.opportunities.manageApplications}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle as="h2">{m.resources.manage}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-6">
            {resources.items.length ? (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {resources.items.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <span className="font-semibold">{r.title} <Badge className="ml-2">{m.resources.kinds[r.kind]}</Badge></span>
                    <Link href={`/recursos/${r.id}`} className="text-sm font-semibold text-accent-ink underline-offset-4 hover:underline">{m.resources.requests}</Link>
                  </li>
                ))}
              </ul>
            ) : null}
            <h3 className="font-display text-lg font-semibold">{m.resources.createTitle}</h3>
            <ResourceForm m={m} communityId={community.id} back={`/comunidades/${community.slug}/gerenciar`} countries={sortedCountries(locale)} defaultCountry={community.country_code} defaultCity={community.city} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle as="h2">{m.communities.members}</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {members.map((mem) => (
                <li key={mem.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <span className="font-medium">{mem.profile?.display_name || "—"} <Badge className="ml-2">{m.enums.memberRole[mem.role]}</Badge></span>
                  {mem.role !== "owner" && mem.user_id !== session.userId ? (
                    <div className="flex flex-wrap gap-2">
                      {(["admin", "member", "remove"] as const).filter((r) => r !== mem.role).map((r) => (
                        <form key={r} action={setMemberRoleAction}>
                          <input type="hidden" name="communityId" value={community.id} /><input type="hidden" name="userId" value={mem.user_id} />
                          <input type="hidden" name="slug" value={community.slug} /><input type="hidden" name="role" value={r} />
                          <Button type="submit" size="sm" variant={r === "remove" ? "ghost" : "outline"}>
                            {r === "admin" ? m.communities.makeAdmin : r === "member" ? m.communities.makeMember : m.communities.removeMember}
                          </Button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle as="h2">{m.common.edit}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-8">
            <CommunityLogoForm m={m} communityId={community.id} /><CommunityForm m={m} categories={categories} community={community} countries={sortedCountries(locale)} languages={sortedLanguages(locale)} /></CardContent>
        </Card>
      </div>
    </Container>
  );
}
