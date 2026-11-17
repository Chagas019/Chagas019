import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { handleReportAction, reviewVerificationAction } from "@/features/admin/actions";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, StatePanel, Textarea } from "@/components/ui";
import { Container, PageHeader } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { countryName, formatDate } from "@/lib/geo";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.admin.title, robots: { index: false } };
}

export default async function AdminPage() {
  const { m, locale } = await getI18n();
  const session = await requireSession("/admin");
  if (!session.isModerator) {
    return <Container className="py-16"><StatePanel variant="forbidden" title={m.states.forbiddenTitle} headingLevel={1}><p>{m.states.forbiddenBody}</p></StatePanel></Container>;
  }
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const [queue, reports] = await Promise.all([
    session.isAdmin
      ? supabase.from("community_verifications").select("id, evidence, created_at, community:communities(name, slug, kind, city, country_code)").eq("status", "pending").order("created_at").limit(50)
      : Promise.resolve({ data: [] }),
    supabase.from("reports").select("id, target_type, target_id, reason, details, created_at").in("status", ["open", "reviewing"]).order("created_at").limit(50),
  ]);
  const queueRows = (queue.data ?? []) as unknown as Array<{ id: string; evidence: string; created_at: string; community: { name: string; slug: string; kind: keyof typeof m.enums.communityKind; city: string; country_code: string } | null }>;
  const reportRows = (reports.data ?? []) as Array<{ id: string; target_type: string; target_id: string; reason: keyof typeof m.report.reasons; details: string; created_at: string }>;

  return (
    <Container size="md" className="py-12">
      <PageHeader title={m.admin.title} subtitle={m.admin.subtitle} />
      {session.isAdmin ? (
        <Card className="mb-8">
          <CardHeader><CardTitle as="h2">{m.admin.queue}</CardTitle></CardHeader>
          <CardContent>
            {queueRows.length === 0 ? <p className="text-sm text-ink-muted">{m.admin.queueEmpty}</p> : (
              <ul className="space-y-4">
                {queueRows.map((v) => (
                  <li key={v.id} className="rounded-lg border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      {v.community ? <Link href={`/comunidades/${v.community.slug}`} className="font-semibold underline-offset-4 hover:underline">{v.community.name}</Link> : "—"}
                      <span className="text-xs text-ink-subtle">{formatDate(v.created_at, locale)}</span>
                    </div>
                    {v.community ? <p className="text-xs text-ink-muted">{m.enums.communityKind[v.community.kind]} · {v.community.city}, {countryName(v.community.country_code, locale)}</p> : null}
                    <p className="mt-3 rounded-md bg-surface-muted p-3 text-sm whitespace-pre-line">{v.evidence}</p>
                    <form action={reviewVerificationAction} className="mt-3 flex flex-col gap-3">
                      <input type="hidden" name="id" value={v.id} />
                      <label htmlFor={`notes-${v.id}`} className="text-sm font-semibold">{m.admin.notes}</label>
                      <Textarea id={`notes-${v.id}`} name="notes" rows={2} maxLength={2000} />
                      <div className="flex gap-2">
                        <Button type="submit" name="decision" value="approved" size="sm" variant="gold">{m.admin.approve}</Button>
                        <Button type="submit" name="decision" value="rejected" size="sm" variant="outline">{m.admin.rejectAction}</Button>
                      </div>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader><CardTitle as="h2">{m.admin.reports}</CardTitle></CardHeader>
        <CardContent>
          {reportRows.length === 0 ? <p className="text-sm text-ink-muted">{m.admin.reportsEmpty}</p> : (
            <ul className="space-y-3">
              {reportRows.map((r) => (
                <li key={r.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center gap-2"><Badge tone="danger">{m.report.reasons[r.reason]}</Badge><Badge>{r.target_type}</Badge><span className="font-mono text-xs text-ink-subtle">{r.target_id}</span></div>
                  {r.details ? <p className="text-sm">{r.details}</p> : null}
                  <div className="flex gap-2">
                    {(["resolved", "dismissed"] as const).map((s) => (
                      <form key={s} action={handleReportAction}>
                        <input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value={s} />
                        <Button type="submit" size="sm" variant={s === "resolved" ? "primary" : "ghost"}>{s === "resolved" ? m.admin.resolve : m.admin.dismiss}</Button>
                      </form>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
