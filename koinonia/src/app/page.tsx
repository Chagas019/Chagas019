import Link from "next/link";
import {
  ArrowRight, BadgeCheck, BookOpen, Camera, Church, Compass, Globe2, Languages, Mic2,
  ShieldCheck, Sparkles, Tent, Video,
} from "lucide-react";
import { getI18n } from "@/i18n/server";
import { t } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { listOpportunities } from "@/services/opportunities";
import { attempt } from "@/lib/attempt";
import { COUNTRY_CODES } from "@/lib/geo";
import { locales } from "@/i18n/config";
import { MATCH_WEIGHTS } from "@/features/matching/score";
import { ButtonLink, StatePanel } from "@/components/ui";
import { Reveal } from "@/components/ui/reveal";
import { Container } from "@/components/layout/page-header";
import { OpportunityCard } from "@/components/features/opportunity-card";
import { PosterHero } from "@/components/features/poster-hero";
import type { Messages } from "@/i18n/types";
import type { Locale } from "@/types/database";


function Eyebrow({ children, center = true }: { children: React.ReactNode; center?: boolean }) {
  return (
    <p className={`flex items-center gap-3 text-xs font-semibold tracking-[0.28em] text-neon-400 uppercase ${center ? "justify-center" : ""}`}>
      <span aria-hidden className="h-px w-8 bg-neon-400/60" />{children}{center ? <span aria-hidden className="h-px w-8 bg-neon-400/60" /> : null}
    </p>
  );
}

function SectionTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="mt-4 font-display text-4xl font-black tracking-tight text-white uppercase sm:text-5xl">{title}</h2>
      {body ? <p className="mt-4 leading-relaxed text-ink-muted">{body}</p> : null}
    </div>
  );
}

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
      {items.map((o, i) => <Reveal as="li" key={o.id} index={i}><OpportunityCard o={o} m={m} locale={locale} /></Reveal>)}
    </ul>
  );
}

export default async function HomePage() {
  const { m, locale } = await getI18n();
  const weights = [
    { label: m.match.partSkills, value: MATCH_WEIGHTS.skills },
    { label: m.match.partLanguages, value: MATCH_WEIGHTS.languages },
    { label: m.match.partLocation, value: MATCH_WEIGHTS.location },
    { label: m.match.partAvailability, value: MATCH_WEIGHTS.availability },
  ];
  const resourceKinds = [
    { Icon: Camera, label: m.resources.kinds.camera }, { Icon: Video, label: m.resources.kinds.lens },
    { Icon: Mic2, label: m.resources.kinds.microphone }, { Icon: Tent, label: m.resources.kinds.event_structure },
    { Icon: Church, label: m.resources.kinds.space }, { Icon: BookOpen, label: m.resources.kinds.material },
  ];

  return (
    <>
      {/* 1. HERO — pôster editorial */}
      <PosterHero m={m} />

      {/* 4. COMUNIDADES VERIFICADAS + 5. MISSION MATCH */}
      <section className="py-24">
        <Container className="grid gap-6 lg:grid-cols-2">
          <Reveal className="card-glow rounded-xl border border-border bg-night-800/75 backdrop-blur p-8 sm:p-10">
            <ShieldCheck aria-hidden className="size-10 text-neon-400" strokeWidth={1.4} />
            <h2 className="mt-5 font-display text-3xl font-extrabold text-white uppercase">{m.home.communitiesTitle}</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{m.home.communitiesBody}</p>
            <ul className="mt-6 space-y-3 text-sm">
              {[m.home.communitiesP1, m.home.communitiesP2, m.home.communitiesP3].map((p) => (
                <li key={p} className="flex items-center gap-3"><BadgeCheck aria-hidden className="size-5 shrink-0 text-neon-400" />{p}</li>
              ))}
            </ul>
            <ButtonLink href="/comunidades" variant="outline" className="mt-8">{m.nav.communities}<ArrowRight aria-hidden /></ButtonLink>
          </Reveal>
          <Reveal index={1} className="card-glow rounded-xl border border-border bg-night-800/75 backdrop-blur p-8 sm:p-10">
            <Compass aria-hidden className="size-10 text-neon-400" strokeWidth={1.4} />
            <h2 className="mt-5 font-display text-3xl font-extrabold text-white uppercase">{m.home.matchTitle}</h2>
            <p className="mt-3 leading-relaxed text-ink-muted">{m.home.matchBody}</p>
            <p className="mt-6 text-xs font-semibold tracking-[0.2em] text-neon-400 uppercase">{m.home.matchWeights}</p>
            <ul className="mt-3 space-y-3">
              {weights.map((w) => (
                <li key={w.label}>
                  <div className="flex justify-between text-sm"><span>{w.label}</span><span className="text-neon-300">{w.value}%</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-night-600"><div className="h-full rounded-full bg-gradient-to-r from-neon-500 to-neon-300" style={{ width: `${w.value * 2}%` }} /></div>
                </li>
              ))}
            </ul>
            <ButtonLink href="/match" variant="outline" className="mt-8">{m.nav.match}<ArrowRight aria-hidden /></ButtonLink>
          </Reveal>
        </Container>
      </section>

      {/* 6. COMPARTILHAMENTO DE RECURSOS */}
      <section className="border-y border-white/5 bg-night-950/40 py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <Reveal>
            <Eyebrow center={false}>{m.nav.resources}</Eyebrow>
            <h2 className="mt-4 font-display text-3xl font-black text-white uppercase sm:text-5xl">{m.home.resourcesTitle}</h2>
            <p className="mt-4 leading-relaxed text-ink-muted">{m.home.resourcesBody}</p>
            <ButtonLink href="/recursos" variant="primary" className="mt-8">{m.resources.title}<ArrowRight aria-hidden /></ButtonLink>
          </Reveal>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {resourceKinds.map(({ Icon, label }, i) => (
              <Reveal as="li" key={label} index={i} className="card-glow flex flex-col items-center gap-3 rounded-lg border border-border bg-night-800/75 backdrop-blur px-4 py-7 text-center text-sm">
                <Icon aria-hidden className="card-icon size-8 text-neon-400" strokeWidth={1.4} />{label}
              </Reveal>
            ))}
          </ul>
        </Container>
      </section>

      {/* 7. OPORTUNIDADES RECENTES */}
      <section className="py-24">
        <Container>
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-black text-white uppercase">{m.home.latestTitle}</h2>
            <Link href="/oportunidades" className="group inline-flex items-center gap-2 text-sm font-semibold tracking-[0.12em] text-neon-400 uppercase hover:text-neon-300">
              {m.common.seeAll}<ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <LatestOpportunities m={m} locale={locale} />
        </Container>
      </section>

      {/* 8. COMUNIDADE GLOBAL */}
      <section className="border-y border-white/5 bg-night-950/40 py-24">
        <Container>
          <SectionTitle eyebrow={m.home.eyebrow} title={m.home.globalTitle} body={m.home.globalBody} />
          <dl className="mt-12 grid gap-5 sm:grid-cols-3">
            {[
              { Icon: Languages, value: String(locales.length), label: m.home.globalLangs },
              { Icon: Globe2, value: String(COUNTRY_CODES.length), label: m.home.globalCountries },
              { Icon: Sparkles, value: "100%", label: m.home.globalFree },
            ].map(({ Icon, value, label }, i) => (
              <Reveal key={label} index={i} className="rounded-xl border border-border bg-night-800/75 backdrop-blur px-6 py-8 text-center">
                <Icon aria-hidden className="mx-auto size-7 text-neon-400" strokeWidth={1.5} />
                <dd className="mt-3 font-display text-5xl text-white">{value}</dd>
                <dt className="mt-1 text-sm text-ink-muted">{label}</dt>
              </Reveal>
            ))}
          </dl>
        </Container>
      </section>

      {/* 9. CHAMADA PARA CADASTRO */}
      <section className="py-24">
        <Container>
          <Reveal className="glass relative overflow-hidden rounded-xl px-6 py-16 text-center">
            <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 size-80 -translate-x-1/2 animate-glow rounded-full bg-[radial-gradient(circle,rgb(140_255_90/0.22),transparent_65%)]" />
            <h2 className="relative font-display text-4xl font-black text-white uppercase sm:text-5xl">{m.home.finalTitle}</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-ink-muted">{m.home.finalBody} {t(m.home.freeBody)}</p>
            <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <ButtonLink href="/cadastro" variant="primary" size="lg">{m.home.heroSecondary}</ButtonLink>
              <ButtonLink href="/comunidades/nova" variant="outline" size="lg">{m.home.ctaCommunity}</ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
