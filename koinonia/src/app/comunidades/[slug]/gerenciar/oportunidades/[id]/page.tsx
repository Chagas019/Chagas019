import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { t } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { loadManagedCommunity } from "@/services/community-admin";
import { getOpportunity } from "@/services/opportunities";
import { setApplicationStatusAction, setOpportunityStatusAction } from "@/features/opportunities/actions";
import { uuidSchema } from "@/schemas/common";
import { Alert, Avatar, Badge, Button, ButtonLink, Card, CardContent, CardHeader, CardTitle, StatePanel } from "@/components/ui";
import { Container, PageHeader } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { formatDate } from "@/lib/geo";
import type { ApplicationStatus } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.opportunities.manageApplications, robots: { index: false } };
}

type Params = { params: Promise<{ slug: string; id: string }>; searchParams: Promise<Record<string, string | undefined>> };

const NEXT_STATES: Record<ApplicationStatus, Array<"accepted" | "rejected" | "completed">> = {
  pending: ["accepted", "rejected"], accepted: ["completed"], rejected: [], withdrawn: [], completed: [],
};

export default async function ManageOpportunityPage({ params, searchParams }: Params) {
  const [{ slug, id }, sp, { m, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!uuidSchema.safeParse(id).success) notFound();
  const back = `/comunidades/${slug}/gerenciar/oportunidades/${id}`;
  const session = await requireSession(back);
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const { community, canManage } = await loadManagedCommunity(supabase, slug, session);
  if (!canManage) return <Container className="py-16"><StatePanel variant="forbidden" title={m.states.forbiddenTitle} headingLevel={1}><p>{m.states.forbiddenBody}</p></StatePanel></Container>;
  const o = await getOpportunity(supabase, id);
  if (!o || o.community_id !== community.id) notFound();

  const [apps, matches] = await Promise.all([
    supabase.from("applications").select("id, status, message, created_at, applicant:profiles(id, display_name, avatar_url)").eq("opportunity_id", id).order("created_at", { ascending: false }),
    supabase.rpc("match_volunteers_for_opportunity", { p_opportunity: id, p_limit: 8 }),
  ]);
  const appRows = (apps.data ?? []) as unknown as Array<{ id: string; status: ApplicationStatus; message: string; created_at: string; applicant: { id: string; display_name: string; avatar_url: string | null } | null }>;
  const matchRows = (matches.data ?? []) as Array<{ profile_id: string; score: number }>;
  const { data: matchProfiles } = matchRows.length
    ? await supabase.from("profiles").select("id, display_name, avatar_url, city").in("id", matchRows.map((r) => r.profile_id))
    : { data: [] };

  return (
    <Container size="md" className="py-12">
      <PageHeader eyebrow={community.name} title={o.title}
        actions={<ButtonLink href={`/oportunidades/${o.id}`} variant="outline" size="sm">{m.common.seeDetails}</ButtonLink>} />
      {sp.erro === "verificacao" ? <Alert tone="danger" className="mb-6">{m.errors.communityNotVerified}</Alert> : null}
      {sp.erro === "status" ? <Alert tone="danger" className="mb-6">{m.errors.generic}</Alert> : null}
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <Badge tone={o.status === "open" ? "success" : "neutral"}>{m.enums.opportunityStatus[o.status]}</Badge>
        {(o.status === "open" ? ["closed"] : ["open"]).map((s) => (
          <form key={s} action={setOpportunityStatusAction}>
            <input type="hidden" name="id" value={o.id} /><input type="hidden" name="status" value={s} /><input type="hidden" name="back" value={back} />
            <Button type="submit" size="sm" variant="outline">{s === "closed" ? m.opportunities.close : o.status === "draft" ? m.opportunities.publishNow : m.opportunities.reopen}</Button>
          </form>
        ))}
      </div>

      <Card className="mb-8">
        <CardHeader><CardTitle as="h2">{m.opportunities.manageApplications}</CardTitle></CardHeader>
        <CardContent>
          {appRows.length === 0 ? <p className="text-sm text-ink-muted">{m.opportunities.noApplications}</p> : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {appRows.map((a) => (
                <li key={a.id} className="flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={a.applicant?.display_name ?? "?"} src={a.applicant?.avatar_url} size="sm" />
                      {a.applicant ? <Link href={`/voluntarios/${a.applicant.id}`} className="font-semibold underline-offset-4 hover:underline">{a.applicant.display_name}</Link> : "—"}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-ink-muted"><Badge>{m.enums.applicationStatus[a.status]}</Badge>{formatDate(a.created_at, locale)}</span>
                  </div>
                  {a.message ? <p className="text-sm whitespace-pre-line text-ink">{a.message}</p> : null}
                  {NEXT_STATES[a.status].length ? (
                    <div className="flex flex-wrap gap-2">
                      {NEXT_STATES[a.status].map((s) => (
                        <form key={s} action={setApplicationStatusAction}>
                          <input type="hidden" name="id" value={a.id} /><input type="hidden" name="status" value={s} /><input type="hidden" name="back" value={back} />
                          <Button type="submit" size="sm" variant={s === "rejected" ? "ghost" : s === "accepted" ? "gold" : "primary"}>
                            {s === "accepted" ? m.opportunities.accept : s === "rejected" ? m.opportunities.reject : m.opportunities.complete}
                          </Button>
                        </form>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle as="h2">{m.opportunities.suggested}</CardTitle></CardHeader>
        <CardContent>
          {matchRows.length === 0 ? <p className="text-sm text-ink-muted">{m.opportunities.noSuggested}</p> : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {matchRows.map((r) => {
                const p = (matchProfiles ?? []).find((x) => x.id === r.profile_id);
                if (!p) return null;
                return (
                  <li key={r.profile_id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={p.display_name as string} src={p.avatar_url as string | null} size="sm" />
                      <Link href={`/voluntarios/${p.id}`} className="truncate font-semibold underline-offset-4 hover:underline">{p.display_name as string}</Link>
                    </span>
                    <Badge tone="success">{t(m.match.score, { score: Math.round(Number(r.score)) })}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
