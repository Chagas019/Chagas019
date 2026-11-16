import { HandHeart, ShieldCheck, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { listOpportunities } from "@/services/opportunities";
import { attempt } from "@/lib/attempt";
import { ButtonLink, Card, StatePanel } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { OpportunityCard } from "@/components/features/opportunity-card";
import { BackendUnavailable } from "@/components/features/backend-unavailable";

async function LatestOpportunities() {
  const { m, locale } = await getI18n();
  const supabase = await createClient();
  if (!supabase) return <BackendUnavailable m={m} />;
  const res = await attempt(() => listOpportunities(supabase, { page: 1 }));
  if (!res.ok) return <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>;
  const { items } = res.data;
  if (items.length === 0) {
    return (
      <StatePanel variant="empty" title={m.states.emptyTitle} action={<ButtonLink href="/comunidades/nova" variant="outline">{m.home.ctaCommunity}</ButtonLink>}>
        <p>{m.home.latestEmpty}</p>
      </StatePanel>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.slice(0, 6).map((o) => <OpportunityCard key={o.id} o={o} m={m} locale={locale} />)}
    </div>
  );
}

export default async function HomePage() {
  const { m } = await getI18n();
  const steps = [
    { Icon: Sparkles, title: m.home.how1Title, body: m.home.how1Body },
    { Icon: ShieldCheck, title: m.home.how2Title, body: m.home.how2Body },
    { Icon: HandHeart, title: m.home.how3Title, body: m.home.how3Body },
  ];
  return (
    <>
      <section className="bg-grain relative overflow-hidden bg-navy-900 text-white">
        <Container className="relative grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="animate-rise space-y-7">
            <p className="text-xs font-semibold tracking-[0.24em] text-gold-500 uppercase">{m.home.eyebrow}</p>
            <h1 className="font-display text-[2.6rem] leading-[1.05] font-semibold whitespace-pre-line sm:text-6xl">{m.home.title}</h1>
            <p className="max-w-xl text-lg leading-relaxed text-navy-200">{m.home.lead}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/cadastro" variant="gold" size="lg">{m.home.ctaVolunteer}</ButtonLink>
              <ButtonLink href="/comunidades/nova" variant="onDark" size="lg">{m.home.ctaCommunity}</ButtonLink>
            </div>
          </div>
          <div aria-hidden className="relative mx-auto hidden aspect-square w-full max-w-sm lg:block">
            <div className="absolute inset-0 rounded-full border border-gold-500/40" />
            <div className="absolute inset-10 rounded-full border border-gold-500/25" />
            <div className="absolute inset-20 rounded-full border border-dashed border-gold-500/30" />
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <span
                key={deg}
                className="absolute top-1/2 left-1/2 size-4 rounded-full bg-gold-500 shadow-gold"
                style={{ transform: `rotate(${deg}deg) translate(11.5rem) rotate(-${deg}deg) translate(-50%, -50%)` }}
              />
            ))}
            <svg viewBox="0 0 40 40" className="absolute top-1/2 left-1/2 size-28 -translate-x-1/2 -translate-y-1/2">
              <path d="M20 6v28M11 16h18" stroke="#D6AE62" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </div>
        </Container>
      </section>

      <Container className="py-20">
        <h2 className="mb-10 text-center font-display text-3xl font-semibold">{m.home.howTitle}</h2>
        <ol className="grid gap-5 md:grid-cols-3">
          {steps.map(({ Icon, title, body }, i) => (
            <li key={title}>
              <Card className="h-full p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="inline-flex size-12 items-center justify-center rounded-lg bg-gold-100 text-gold-800"><Icon aria-hidden className="size-6" /></span>
                  <span className="font-display text-sm text-accent-ink">0{i + 1}</span>
                </div>
                <h3 className="font-display text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </Container>

      <Container className="pb-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold">{m.home.latestTitle}</h2>
          <ButtonLink href="/oportunidades" variant="outline" size="sm">{m.common.seeAll}</ButtonLink>
        </div>
        <LatestOpportunities />
      </Container>

      <Container className="pt-16">
        <div className="rounded-xl border border-gold-300 bg-gold-50 p-8 text-center sm:p-12">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">{m.home.freeTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-muted">{m.home.freeBody}</p>
          <div className="mt-6 flex justify-center"><ButtonLink href="/oportunidades" size="lg">{m.home.ctaExplore}</ButtonLink></div>
        </div>
      </Container>
    </>
  );
}
