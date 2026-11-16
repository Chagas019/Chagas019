import Link from "next/link";
import { ArrowRight, BookOpenCheck, Church, Compass, HandHeart, Sparkles } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { listOpportunities } from "@/services/opportunities";
import { attempt } from "@/lib/attempt";
import { ButtonLink, StatePanel } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { OpportunityCard } from "@/components/features/opportunity-card";
import { HeroMosaic } from "@/components/features/hero-mosaic";
import type { Messages } from "@/i18n/types";
import type { Locale } from "@/types/database";

async function LatestOpportunities({ m, locale }: { m: Messages; locale: Locale }) {
  const supabase = await createClient();
  const res = supabase ? await attempt(() => listOpportunities(supabase, { page: 1 })) : null;
  const items = res?.ok ? res.data.items.slice(0, 3) : [];
  if (items.length === 0) {
    return (
      <StatePanel variant="empty" title={m.states.emptyTitle} action={<ButtonLink href="/comunidades/nova" variant="outline">{m.home.ctaCommunity}</ButtonLink>}>
        <p>{m.home.latestEmpty}</p>
      </StatePanel>
    );
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((o) => <li key={o.id}><OpportunityCard o={o} m={m} locale={locale} /></li>)}
    </ul>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center justify-center gap-3 text-xs font-semibold tracking-[0.28em] text-gold-400 uppercase">
      <span aria-hidden className="h-px w-8 bg-gold-400/60" />
      {children}
      <span aria-hidden className="h-px w-8 bg-gold-400/60" />
    </p>
  );
}

export default async function HomePage() {
  const { m, locale } = await getI18n();
  const features = [
    { Icon: Sparkles, title: m.home.f1Title, body: m.home.f1Body },
    { Icon: Church, title: m.home.f2Title, body: m.home.f2Body },
    { Icon: Compass, title: m.home.f3Title, body: m.home.f3Body },
    { Icon: HandHeart, title: m.home.f4Title, body: m.home.f4Body },
  ];
  const steps = [
    { title: m.home.how1Title, body: m.home.how1Body },
    { title: m.home.how2Title, body: m.home.how2Body },
    { title: m.home.how3Title, body: m.home.how3Body },
  ];

  return (
    <>
      {/* HERO com mosaico vetorial no lugar das fotos */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <HeroMosaic />
        <Container className="relative flex min-h-[34rem] flex-col items-center justify-center py-20 text-center sm:min-h-[38rem]">
          <div className="animate-rise">
            <Eyebrow>{m.home.eyebrow}</Eyebrow>
            <h1 className="mt-5 font-display text-6xl leading-none text-white sm:text-7xl lg:text-8xl">{m.home.title}</h1>
            <p className="mt-3 font-display text-2xl text-gold-300 italic sm:text-3xl">{m.brand.slogan}</p>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">{m.home.lead}</p>
            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/cadastro" variant="primary" size="lg">{m.home.ctaVolunteer}</ButtonLink>
              <ButtonLink href="/oportunidades" variant="outline" size="lg">{m.home.ctaExplore}<ArrowRight aria-hidden /></ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* O QUE VOCÊ ENCONTRA */}
      <Container className="py-20">
        <h2 className="text-center font-display text-4xl text-white sm:text-5xl">{m.home.expectTitle}</h2>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ Icon, title, body }) => (
            <li key={title} className="flex flex-col items-center rounded-lg border border-border bg-surface px-6 py-9 text-center transition-colors hover:border-gold-400/60">
              <span className="inline-flex size-16 items-center justify-center text-gold-400">
                <Icon aria-hidden className="size-12" strokeWidth={1.4} />
              </span>
              <h3 className="mt-5 font-display text-2xl text-gold-300">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-muted">{body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink href="#como-funciona" variant="primary">{m.home.howCta}</ButtonLink>
          <ButtonLink href="/comunidades/nova" variant="outline">{m.home.ctaCommunity}</ButtonLink>
        </div>
      </Container>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-20 border-y border-border bg-night-950/60 py-20">
        <Container>
          <Eyebrow>KOINONIA</Eyebrow>
          <h2 className="mt-4 text-center font-display text-4xl text-white sm:text-5xl">{m.home.howTitle}</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="text-center">
                <span className="mx-auto inline-flex size-14 items-center justify-center rounded-full border border-gold-400/70 font-display text-2xl text-gold-300">{i + 1}</span>
                <h3 className="mt-5 font-display text-2xl text-white">{s.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* OPORTUNIDADES RECENTES */}
      <Container className="py-20">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-display text-4xl text-white">{m.home.latestTitle}</h2>
          <Link href="/oportunidades" className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-gold-400 uppercase hover:text-gold-300">
            {m.common.seeAll}<ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
        <LatestOpportunities m={m} locale={locale} />
      </Container>

      {/* GRATUITO */}
      <Container>
        <div className="relative overflow-hidden rounded-lg border border-gold-400/40 bg-surface px-6 py-14 text-center">
          <BookOpenCheck aria-hidden className="mx-auto size-10 text-gold-400" strokeWidth={1.4} />
          <h2 className="mt-4 font-display text-4xl text-white">{m.home.freeTitle}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-ink-muted">{m.home.freeBody}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/cadastro" variant="primary" size="lg">{m.home.ctaVolunteer}</ButtonLink>
            <ButtonLink href="/comunidades/nova" variant="outline" size="lg">{m.home.ctaCommunity}</ButtonLink>
          </div>
        </div>
      </Container>
    </>
  );
}
