import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Globe2, MapPin, Users } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { localizedName, t } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { getSession } from "@/features/auth/session";
import { getOpportunity } from "@/services/opportunities";
import { getCatalog } from "@/services/catalog";
import { getMyMembership } from "@/services/communities";
import { uuidSchema } from "@/schemas/common";
import { ApplyForm } from "@/features/opportunities/components/apply-form";
import { setApplicationStatusAction } from "@/features/opportunities/actions";
import { ReportButton } from "@/features/moderation/components/report-button";
import { Alert, Badge, Button, ButtonLink, Card, CardContent } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { countryName, formatDate, languageName } from "@/lib/geo";
import type { Application } from "@/types/database";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!uuidSchema.safeParse(id).success) return {};
  const supabase = await createClient();
  const o = supabase ? await getOpportunity(supabase, id).catch(() => null) : null;
  return { title: o?.title, description: o?.description.slice(0, 160) };
}

export default async function OpportunityPage({ params }: Params) {
  const [{ id }, { m, locale }, session] = await Promise.all([params, getI18n(), getSession()]);
  if (!uuidSchema.safeParse(id).success) notFound();
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const o = await getOpportunity(supabase, id);
  if (!o || !o.community) notFound();
  const [catalog, role, myApp] = await Promise.all([
    getCatalog(supabase),
    getMyMembership(supabase, o.community_id, session?.userId),
    session ? supabase.from("applications").select("*").eq("opportunity_id", id).eq("applicant_id", session.userId).maybeSingle<Application>() : Promise.resolve({ data: null }),
  ]);
  const isAdmin = role === "owner" || role === "admin";
  const skills = o.opportunity_skills.map((s) => catalog.skills.find((x) => x.id === s.skill_id)).filter((s) => s !== undefined);
  const place = o.mode === "remote" ? m.common.remote : [o.city, countryName(o.country_code, locale)].filter(Boolean).join(", ");
  const app = myApp.data;

  let cta: React.ReactNode;
  if (isAdmin) cta = (
    <div className="space-y-3"><p className="text-sm text-ink-muted">{m.opportunities.ownCommunity}</p>
      <ButtonLink href={`/comunidades/${o.community.slug}/gerenciar/oportunidades/${o.id}`} className="w-full">{m.opportunities.manageApplications}</ButtonLink></div>
  );
  else if (!session) cta = <ButtonLink href={`/entrar?next=/oportunidades/${o.id}`} variant="gold" size="lg" className="w-full">{m.opportunities.loginToApply}</ButtonLink>;
  else if (app) cta = (
    <div className="space-y-3">
      <Alert tone="info">{t(m.opportunities.alreadyApplied, { status: m.enums.applicationStatus[app.status] })}</Alert>
      {app.status === "pending" || app.status === "accepted" ? (
        <form action={setApplicationStatusAction}>
          <input type="hidden" name="id" value={app.id} /><input type="hidden" name="status" value="withdrawn" /><input type="hidden" name="back" value={`/oportunidades/${o.id}`} />
          <Button type="submit" variant="outline" size="sm">{m.dashboard.withdraw}</Button>
        </form>
      ) : null}
    </div>
  );
  else if (!session.profile?.onboarded_at) cta = <ButtonLink href="/onboarding" variant="gold" className="w-full">{m.dashboard.completeProfile}</ButtonLink>;
  else if (o.status !== "open") cta = <Alert tone="warning">{m.errors.opportunityClosed}</Alert>;
  else cta = <><h2 className="mb-4 font-display text-xl font-semibold">{m.opportunities.applyTitle}</h2><ApplyForm m={m} opportunityId={o.id} /></>;

  return (
    <Container className="py-12">
      <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
        <article>
          <div className="flex flex-wrap gap-2">
            <Badge tone={o.mode === "remote" ? "info" : "brand"}>{m.enums.opportunityMode[o.mode]}</Badge>
            <Badge tone={o.status === "open" ? "success" : "neutral"}>{m.enums.opportunityStatus[o.status]}</Badge>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">{o.title}</h1>
          <p className="mt-2 text-accent-ink"><Link href={`/comunidades/${o.community.slug}`} className="font-semibold underline-offset-4 hover:underline">{o.community.name}</Link></p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <li className="inline-flex items-center gap-1.5">{o.mode === "remote" ? <Globe2 aria-hidden className="size-4" /> : <MapPin aria-hidden className="size-4" />}{place}</li>
            {o.starts_at ? <li className="inline-flex items-center gap-1.5"><CalendarDays aria-hidden className="size-4" />{formatDate(o.starts_at, locale)}{o.ends_at ? ` – ${formatDate(o.ends_at, locale)}` : ""}</li> : null}
            {o.slots ? <li className="inline-flex items-center gap-1.5"><Users aria-hidden className="size-4" />{m.opportunities.slots}: {o.slots}</li> : null}
          </ul>
          <div className="mt-8 leading-relaxed whitespace-pre-line">{o.description}</div>
          <dl className="mt-10 grid gap-6 sm:grid-cols-2">
            {skills.length ? <div><dt className="mb-2 text-sm font-semibold">{m.opportunities.skills}</dt><dd className="flex flex-wrap gap-2">{skills.map((s) => <Badge key={s.id} tone="gold">{localizedName(s.names, locale)}</Badge>)}</dd></div> : null}
            {o.languages.length ? <div><dt className="mb-2 text-sm font-semibold">{m.opportunities.languages}</dt><dd className="text-sm">{o.languages.map((l) => languageName(l, locale)).join(" · ")}</dd></div> : null}
            {o.availability.length ? <div><dt className="mb-2 text-sm font-semibold">{m.opportunities.availability}</dt><dd className="flex flex-wrap gap-2">{o.availability.map((a) => <Badge key={a} tone="brand">{m.enums.availability[a]}</Badge>)}</dd></div> : null}
          </dl>
          {session && !isAdmin ? <div className="mt-10 border-t border-border pt-6"><ReportButton m={m} targetType="opportunity" targetId={o.id} label={m.opportunities.report} /></div> : null}
        </article>
        <aside><Card className="lg:sticky lg:top-24"><CardContent>{cta}</CardContent></Card></aside>
      </div>
    </Container>
  );
}
