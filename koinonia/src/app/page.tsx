import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BookOpen, HandHeart, HeartPulse, Laptop, Megaphone, MousePointer2, Music,
} from "lucide-react";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { listOpportunities, type OpportunityWithCommunity } from "@/services/opportunities";
import { attempt } from "@/lib/attempt";
import { ButtonLink } from "@/components/ui";
import { Container } from "@/components/layout/page-header";
import { VolunteerIllustration, VolunteerPortrait } from "@/components/illustrations/volunteer";
import { NightScene } from "@/components/illustrations/night-scene";
import {
  Blob, Bolt, BrushUnderline, Crown, CurvedArrow, Smiley, Spark, Squiggle, Star, StarOutline, Swirl,
} from "@/components/illustrations/doodles";
import type { Messages } from "@/i18n/types";
import { cn } from "@/lib/utils";

/** Cores dos cards em destaque, na ordem da referência visual (amarelo, laranja, roxo, verde). */
const CARD_TONES = [
  { bg: "bg-sun-400", ink: "text-night-950", Icon: Music },
  { bg: "bg-flame-500", ink: "text-night-950", Icon: Megaphone },
  { bg: "bg-violet-600", ink: "text-white", Icon: BookOpen },
  { bg: "bg-mint-400", ink: "text-night-950", Icon: HandHeart },
] as const;

const AREAS = [
  { key: "music", Icon: Music, tone: "border-sky-400 text-sky-400" },
  { key: "communication", Icon: Megaphone, tone: "border-violet-400 text-violet-300" },
  { key: "technology", Icon: Laptop, tone: "border-flame-500 text-flame-500" },
  { key: "education", Icon: BookOpen, tone: "border-sky-400 text-sky-400" },
  { key: "health", Icon: HeartPulse, tone: "border-flame-500 text-flame-500" },
  { key: "social", Icon: HandHeart, tone: "border-violet-400 text-violet-300" },
] as const;

function FeatureCard({ href, title, subtitle, index }: { href: string; title: string; subtitle: string; index: number }) {
  const tone = CARD_TONES[index % CARD_TONES.length] ?? CARD_TONES[0];
  const { Icon } = tone;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-muted transition duration-200 hover:-translate-y-1 hover:border-lime-400">
      <div className={cn("relative flex h-36 items-center justify-center overflow-hidden", tone.bg, tone.ink)}>
        <Spark className="absolute top-3 left-4 size-6 opacity-70" />
        <Star className="absolute right-5 bottom-4 size-5 opacity-60" />
        <Squiggle className="absolute -bottom-1 left-6 w-20 opacity-50" />
        <Icon aria-hidden className="size-16 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6" strokeWidth={1.75} />
      </div>
      <div className="flex flex-1 items-end justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="truncate font-sans text-sm font-bold tracking-wide uppercase">
            <Link href={href} className="after:absolute after:inset-0">{title}</Link>
          </h3>
          <p className="truncate text-xs text-ink-muted">{subtitle}</p>
        </div>
        <ArrowUpRight aria-hidden className="size-5 shrink-0 text-ink-muted transition-colors group-hover:text-lime-400" />
      </div>
    </article>
  );
}

async function FeaturedOpportunities({ m }: { m: Messages }) {
  const supabase = await createClient();
  let items: OpportunityWithCommunity[] = [];
  if (supabase) {
    const res = await attempt(() => listOpportunities(supabase, { page: 1 }));
    if (res.ok) items = res.data.items.slice(0, 4);
  }
  if (items.length > 0) {
    return items.map((o, i) => (
      <li key={o.id}>
        <FeatureCard index={i} href={`/oportunidades/${o.id}`} title={o.title} subtitle={`${m.enums.opportunityMode[o.mode]} · ${o.community?.name ?? ""}`} />
      </li>
    ));
  }
  // Sem oportunidades publicadas: atalhos reais para a busca por área.
  const samples = (["music", "communication", "education", "social"] as const).map((k) => ({ k, title: m.home.sampleTitles[k] }));
  return samples.map((s, i) => (
    <li key={s.k}>
      <FeatureCard index={i} href={`/oportunidades?q=${encodeURIComponent(m.home.areas[s.k])}`} title={s.title} subtitle={m.nav.opportunities} />
    </li>
  ));
}

export default async function HomePage() {
  const { m } = await getI18n();

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <Blob className="absolute -top-24 -left-28 w-[26rem] text-violet-600 sm:w-[34rem]" />
        <Blob className="absolute -bottom-20 -left-20 w-72 text-sky-500" d="M30 20c40-20 90 0 100 40s-20 60-60 64S0 110 4 70 0 34 30 20z" />
        <Blob className="absolute top-1/3 -right-24 hidden w-80 text-flame-500 lg:block" d="M60 6c40 0 74 30 74 64s-30 58-66 58S4 104 6 64 20 6 60 6z" />

        <Container className="relative grid gap-6 pt-10 pb-16 sm:pt-16 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:pb-24">
          <div className="relative z-10 animate-rise">
            <p className="flex items-end gap-3 font-display text-2xl text-white">
              {m.home.hello}
              <CurvedArrow className="h-10 w-8 rotate-[200deg] text-white/80" />
            </p>
            <div className="relative mt-2 inline-block">
              <h1 className="font-display text-[3.4rem] leading-[0.95] text-white sm:text-[5.6rem] lg:text-[6.4rem]">
                KOINONIA
              </h1>
              <Crown className="absolute -top-9 right-6 w-14 text-lime-400 sm:-top-12 sm:w-20" />
              <BrushUnderline className="mt-1 h-4 w-[92%] text-lime-400 sm:h-6" />
            </div>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-lg font-medium text-white sm:text-xl">
              {m.home.roles.map((r, i) => (
                <span key={r} className="inline-flex items-center gap-3">
                  {i > 0 ? <span aria-hidden className="size-1.5 rounded-full bg-lime-400" /> : null}
                  {r}
                </span>
              ))}
            </p>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-muted">{m.home.lead}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/cadastro" variant="primary" size="lg">{m.home.ctaVolunteer}</ButtonLink>
              <ButtonLink href="/oportunidades" variant="outline" size="lg">{m.home.ctaExplore}<ArrowUpRight aria-hidden /></ButtonLink>
            </div>
            <a href="#missao" className="mt-12 hidden items-center gap-2 text-sm text-ink-muted hover:text-white sm:inline-flex">
              <MousePointer2 aria-hidden className="size-4" />{m.home.scroll}
            </a>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute top-2 left-0 z-10 -rotate-6 rounded-[2rem] rounded-br-md bg-sky-500 px-5 py-4 font-display text-lg leading-tight text-night-950 shadow-lifted sm:text-xl">
              {m.home.bubble}
            </div>
            <Star className="absolute top-6 right-8 size-10 text-sun-400 animate-float" />
            <Swirl className="absolute top-0 right-28 w-16 text-white/70" />
            <Smiley className="absolute bottom-24 left-0 size-14 text-lime-400" />
            <Bolt className="absolute bottom-10 left-16 w-8 text-lime-400" />
            <StarOutline className="absolute right-2 bottom-36 size-7 text-sky-400" />
            <VolunteerIllustration className="relative w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.45)]" />
          </div>
        </Container>
      </section>

      {/* MISSÃO (equivalente ao "showreel" da referência) */}
      <Container id="missao" className="scroll-mt-20">
        <div className="panel grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <h2 className="flex items-center gap-3 font-display text-3xl sm:text-4xl">
              <StarOutline className="size-7 text-violet-400" />{m.home.missionTitle}
            </h2>
            <p className="mt-4 max-w-sm leading-relaxed text-ink-muted">{m.home.missionBody}</p>
            <Link href="/match" className="mt-6 inline-flex items-center gap-2 font-semibold text-lime-400 hover:text-lime-300">
              {m.home.missionCta}
              <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-lime-400"><ArrowRight aria-hidden className="size-3.5" /></span>
            </Link>
          </div>
          <Link href="/oportunidades" className="group relative block overflow-hidden rounded-2xl border border-border">
            <NightScene className="h-52 w-full sm:h-64" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex size-16 items-center justify-center rounded-full bg-lime-400 text-night-950 shadow-gold transition-transform group-hover:scale-110">
                <ArrowUpRight aria-hidden className="size-8" />
              </span>
            </span>
            <span className="absolute bottom-3 left-4 rounded-full bg-night-950/70 px-3 py-1 text-sm font-semibold text-white">{m.home.missionCard}</span>
          </Link>
        </div>
      </Container>

      {/* OPORTUNIDADES EM DESTAQUE */}
      <Container className="mt-6">
        <div className="panel p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-3 font-display text-3xl">
              {m.home.featuredTitle}<Squiggle className="w-12 text-violet-500" />
            </h2>
            <Link href="/oportunidades" className="inline-flex items-center gap-2 text-sm font-semibold text-lime-400 hover:text-lime-300">
              {m.common.seeAll}<ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeaturedOpportunities m={m} />
          </ul>
        </div>
      </Container>

      {/* ÁREAS DE TALENTO (equivalente a "skills") */}
      <Container className="mt-6">
        <div className="panel relative flex flex-col gap-6 overflow-hidden p-6 sm:p-8 lg:flex-row lg:items-center">
          <h2 className="shrink-0 font-display text-3xl">
            {m.home.areasTitle}
            <Squiggle className="mt-1 block w-24 text-violet-500" />
          </h2>
          <ul className="grid flex-1 grid-cols-3 gap-4 sm:grid-cols-6">
            {AREAS.map(({ key, Icon, tone }) => (
              <li key={key}>
                <Link href={`/talentos?q=${encodeURIComponent(m.home.areas[key])}`} className="group flex flex-col items-center gap-2 text-center text-sm text-ink hover:text-lime-300">
                  <span className={cn("inline-flex size-14 items-center justify-center rounded-2xl border-2 bg-night-950 transition-transform group-hover:-translate-y-1", tone)}>
                    <Icon aria-hidden className="size-7" />
                  </span>
                  {m.home.areas[key]}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      {/* SOBRE */}
      <Container className="mt-6">
        <div className="panel grid items-center gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.3fr]">
          <div className="relative overflow-hidden rounded-2xl bg-lime-400 p-6 text-night-950">
            <p className="relative z-10 w-1/2 -rotate-6 font-display text-xl leading-snug whitespace-pre-line sm:text-2xl">{m.home.aboutTags}</p>
            <Crown className="absolute top-4 right-6 w-12 text-night-950" />
            <VolunteerPortrait className="absolute -right-6 -bottom-2 h-[78%] sm:h-[105%]" />
            <div className="h-40 sm:h-48" />
          </div>
          <div>
            <h2 className="font-display text-3xl">{m.home.aboutTitle}</h2>
            <p className="mt-4 leading-relaxed text-ink-muted">{m.home.aboutBody}</p>
            <Link href="/comunidades" className="mt-6 inline-flex items-center gap-2 font-semibold text-lime-400 hover:text-lime-300">
              {m.home.aboutCta}
              <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-lime-400"><ArrowRight aria-hidden className="size-3.5" /></span>
            </Link>
          </div>
        </div>
      </Container>

      {/* CHAMADA FINAL */}
      <Container className="mt-6">
        <div className="panel relative flex flex-col gap-6 overflow-hidden p-6 sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-display text-3xl leading-tight sm:text-4xl">
            {m.home.ctaTitle}{" "}
            <span className="relative inline-block px-3 text-lime-400">
              {m.home.ctaHighlight}
              <svg aria-hidden viewBox="0 0 200 70" preserveAspectRatio="none" className="absolute inset-0 h-full w-full text-violet-500">
                <ellipse cx="100" cy="35" rx="96" ry="30" fill="none" stroke="currentColor" strokeWidth="4" transform="rotate(-4 100 35)" />
              </svg>
            </span>
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/cadastro" variant="primary" size="lg">{m.nav.signup}</ButtonLink>
            <ButtonLink href="/comunidades/nova" variant="outline" size="lg">{m.home.ctaCommunity}</ButtonLink>
          </div>
          <p className="text-sm text-ink-muted lg:hidden">{m.home.ctaBody}</p>
        </div>
      </Container>
    </>
  );
}
