import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Truck } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { getResource, type ResourceRequestStatus } from "@/services/resources";
import { getMyMembership, listMyCommunities } from "@/services/communities";
import { uuidSchema } from "@/schemas/common";
import { setResourceRequestStatusAction, setResourceStatusAction } from "@/features/resources/actions";
import { ResourceRequestForm } from "@/features/resources/components/resource-forms";
import { ReportButton } from "@/features/moderation/components/report-button";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { countryName, formatDate } from "@/lib/geo";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.resources.title, robots: { index: false } };
}

const NEXT: Record<ResourceRequestStatus, Array<"approved" | "declined" | "returned">> = {
  pending: ["approved", "declined"], approved: ["returned"], declined: [], returned: [], cancelled: [],
};

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { m, locale }] = await Promise.all([params, getI18n()]);
  if (!uuidSchema.safeParse(id).success) notFound();
  const session = await requireSession(`/recursos/${id}`);
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const r = await getResource(supabase, id);
  if (!r) notFound();
  const back = `/recursos/${id}`;
  const [role, mine, requests] = await Promise.all([
    getMyMembership(supabase, r.community_id, session.userId),
    listMyCommunities(supabase, session.userId),
    supabase.from("resource_requests").select("id, requester_id, message, starts_on, ends_on, status, created_at, requester:profiles(display_name)").eq("resource_id", id).order("created_at", { ascending: false }),
  ]);
  const isAdmin = role === "owner" || role === "admin";
  const rows = (requests.data ?? []) as unknown as Array<{ id: string; requester_id: string; message: string; starts_on: string; ends_on: string; status: ResourceRequestStatus; created_at: string; requester: { display_name: string } | null }>;
  const myRequest = rows.find((x) => x.requester_id === session.userId && (x.status === "pending" || x.status === "approved"));

  return (
    <Container size="md" className="py-12">
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{m.resources.kinds[r.kind]}</Badge>
        <Badge tone={r.status === "available" ? "success" : "neutral"}>{r.status === "available" ? m.resources.available : m.resources.unavailable}</Badge>
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{r.title}</h1>
      {r.community ? <p className="mt-2"><Link href={`/comunidades/${r.community.slug}`} className="font-semibold text-accent-ink underline-offset-4 hover:underline">{r.community.name}</Link></p> : null}
      <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="size-4" />{r.city}, {countryName(r.country_code, locale)}</span>
        {r.ships_remotely ? <span className="inline-flex items-center gap-1.5"><Truck aria-hidden className="size-4" />{m.resources.shipsRemotely}</span> : null}
      </p>
      {r.description ? <p className="mt-6 leading-relaxed whitespace-pre-line">{r.description}</p> : null}

      <div className="mt-10 flex flex-col gap-6">
        {isAdmin ? (
          <>
            <form action={setResourceStatusAction}>
              <input type="hidden" name="id" value={r.id} />
              <input type="hidden" name="status" value={r.status === "available" ? "unavailable" : "available"} />
              <Button type="submit" variant="outline" size="sm">{r.status === "available" ? m.resources.markUnavailable : m.resources.markAvailable}</Button>
            </form>
            <Card>
              <CardHeader><CardTitle as="h2">{m.resources.requests}</CardTitle></CardHeader>
              <CardContent>
                {rows.length === 0 ? <p className="text-sm text-ink-muted">{m.resources.noRequests}</p> : (
                  <ul className="divide-y divide-border rounded-lg border border-border">
                    {rows.map((q) => (
                      <li key={q.id} className="flex flex-col gap-2 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Link href={`/voluntarios/${q.requester_id}`} className="font-semibold underline-offset-4 hover:underline">{q.requester?.display_name || "—"}</Link>
                          <span className="flex items-center gap-2 text-xs text-ink-muted"><Badge>{m.resources.status[q.status]}</Badge>{formatDate(q.starts_on, locale)} – {formatDate(q.ends_on, locale)}</span>
                        </div>
                        <p className="text-sm whitespace-pre-line">{q.message}</p>
                        {NEXT[q.status].length ? (
                          <div className="flex flex-wrap gap-2">
                            {NEXT[q.status].map((s) => (
                              <form key={s} action={setResourceRequestStatusAction}>
                                <input type="hidden" name="id" value={q.id} /><input type="hidden" name="status" value={s} /><input type="hidden" name="back" value={back} />
                                <Button type="submit" size="sm" variant={s === "declined" ? "ghost" : s === "approved" ? "gold" : "primary"}>
                                  {s === "approved" ? m.resources.approve : s === "declined" ? m.resources.decline : m.resources.returned}
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
          </>
        ) : myRequest ? (
          <Card><CardContent className="flex flex-wrap items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">{m.resources.requested} <Badge tone="info">{m.resources.status[myRequest.status]}</Badge></span>
            <form action={setResourceRequestStatusAction}>
              <input type="hidden" name="id" value={myRequest.id} /><input type="hidden" name="status" value="cancelled" /><input type="hidden" name="back" value={back} />
              <Button type="submit" size="sm" variant="ghost">{m.resources.cancel}</Button>
            </form>
          </CardContent></Card>
        ) : r.status === "available" ? (
          <Card>
            <CardHeader><CardTitle as="h2">{m.resources.requestTitle}</CardTitle></CardHeader>
            <CardContent><ResourceRequestForm m={m} resourceId={r.id} communities={mine.map((x) => ({ id: x.community.id, name: x.community.name }))} /></CardContent>
          </Card>
        ) : null}
        {!isAdmin ? <ReportButton m={m} targetType="resource" targetId={r.id} label={m.report.title} /> : null}
      </div>
    </Container>
  );
}
