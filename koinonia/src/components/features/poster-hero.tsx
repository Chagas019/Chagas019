import Link from "next/link";
import { ArrowUpRight, BookOpen, Camera, Code2, Languages, Mic2, Music, Palette, Search, UserPlus, Users, Video } from "lucide-react";
import { COUNTRY_CODES } from "@/lib/geo";
import { locales } from "@/i18n/config";
import { TALENT_CHIPS } from "@/features/profiles/talent-chips";
import { DashArrow, RotatingEmblem, ScribbleArrow } from "./poster-doodles";
import type { Messages } from "@/i18n/types";

const ICONS = { photographers: Camera, videomakers: Video, designers: Palette, musicians: Music, catechists: BookOpen, communicators: Mic2, developers: Code2, translators: Languages, volunteers: Users } as const;
const card = "glass rounded-xl p-6 shadow-lifted";
const cardTitle = "font-display text-xl font-extrabold tracking-wide text-white uppercase";

/** Hero no estilo "pôster editorial": título gigante esmaecido, cards de vidro escuro e destaques em verde neon. */
export function PosterHero({ m }: { m: Messages }) {
  const stats = [
    { n: String(locales.length), label: m.home.globalLangs },
    { n: String(COUNTRY_CODES.length), label: m.home.globalCountries },
    { n: "100%", label: m.home.globalFree },
  ];
  const steps = [
    { title: m.home.how1Title, body: m.home.how1Body, Icon: UserPlus },
    { title: m.home.how2Title, body: m.home.how2Body, Icon: Search },
    { title: m.home.how3Title, body: m.home.how3Body, Icon: Users },
  ];

  return (
    <section className="relative isolate overflow-hidden pb-16">
      {/* holofote */}
      <div aria-hidden className="pointer-events-none absolute top-0 left-1/2 -z-10 h-[46rem] w-[60rem] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,rgb(255_255_255/0.13),transparent_65%)]" />
      {/* texto vertical na borda */}
      <p aria-hidden className="absolute top-24 right-3 hidden font-display text-sm font-extrabold tracking-[0.4em] text-white/25 uppercase [writing-mode:vertical-rl] xl:block">
        {m.home.eyebrow}
      </p>

      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 lg:pt-14">
        <p aria-hidden className="stagger font-display text-[18vw] leading-[0.82] font-black tracking-tight text-white/[0.13] uppercase select-none lg:text-[11.5rem]">
          <span className="block" style={{ ["--i" as string]: 0 }}>KOINONIA</span>
        </p>
        <div className="stagger mt-3 max-w-3xl">
          <h1 style={{ ["--i" as string]: 1 }} className="font-display text-2xl font-extrabold tracking-wide text-white/80 uppercase sm:text-3xl">{m.home.heroTitle}</h1>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* coluna esquerda */}
          <div className="stagger flex flex-col gap-6 lg:col-span-4">
            <article style={{ ["--i" as string]: 2 }} className={card}>
              <h2 className={cardTitle}>{m.home.dnaTitle}</h2>
              <ul className="mt-5 space-y-1 text-lg">
                {stats.map((s) => <li key={s.label}><strong className="font-display font-extrabold text-neon-400">{s.n}</strong> <span className="text-ink-muted">{s.label}.</span></li>)}
                <li><strong className="font-display font-extrabold text-neon-400">{m.home.oneMission.split(" ")[0]}</strong> <span className="text-ink-muted">{m.home.oneMission.split(" ").slice(1).join(" ")}</span></li>
              </ul>
              <p className="mt-5 text-sm leading-relaxed text-ink-muted">{m.home.heroLead}</p>
            </article>

            <Link href="/oportunidades" style={{ ["--i" as string]: 3 }} className="group flex items-center gap-4 rounded-xl">
              <span className="inline-flex size-20 shrink-0 items-center justify-center rounded-xl bg-night-950 text-white shadow-lifted ring-1 ring-white/10 transition-transform group-hover:-rotate-3 group-hover:scale-105">
                <Search aria-hidden className="size-9" strokeWidth={2.4} />
              </span>
              <span>
                <span className="block font-display text-xl font-extrabold tracking-wide text-white uppercase">{m.home.heroPrimary}</span>
                <span className="block text-sm text-ink-muted">{m.home.findWhere}</span>
                <DashArrow className="mt-1 w-14 text-neon-400 transition-transform group-hover:-translate-x-1" />
              </span>
            </Link>

            <article style={{ ["--i" as string]: 4 }} className={card}>
              <h2 className={`${cardTitle} text-center`}><span className="text-neon-400">{m.home.talentsTitle.split(" ")[0]}</span> {m.home.talentsTitle.split(" ").slice(1).join(" ")}</h2>
              <ul className="mt-5 grid grid-cols-3 gap-2">
                {TALENT_CHIPS.map((c) => {
                  const Icon = ICONS[c.key];
                  return (
                    <li key={c.key}>
                      <Link href={c.slug ? `/talentos?talento=${c.slug}` : "/talentos"} className="flex flex-col items-center gap-1.5 rounded-lg px-1 py-3 text-center text-[0.7rem] font-semibold text-ink-muted transition-colors hover:bg-white/5 hover:text-white">
                        <Icon aria-hidden className="size-6 text-white" strokeWidth={1.6} />{m.talents.chips[c.key]}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </article>
          </div>

          {/* centro: emblema */}
          <div className="relative flex items-start justify-center lg:col-span-3 lg:pt-10">
            <ScribbleArrow className="absolute -top-2 left-4 w-20 -rotate-12 text-neon-400 lg:-left-6" />
            <RotatingEmblem text={`${m.brand.slogan.toUpperCase()} • ${m.home.eyebrow.toUpperCase()} • `} className="size-60 sm:size-72" />
          </div>

          {/* coluna direita */}
          <div className="stagger flex flex-col gap-6 lg:col-span-5">
            <div style={{ ["--i" as string]: 3 }} className="text-right">
              <h2 className="font-display text-base font-extrabold tracking-wide text-neon-400 uppercase">{m.nav.talents}</h2>
              <ul className="mt-2 space-y-0.5 text-sm text-ink-subtle">
                {TALENT_CHIPS.slice(0, 8).map((c) => <li key={c.key}>{m.talents.chips[c.key]}</li>)}
              </ul>
            </div>
            <article style={{ ["--i" as string]: 5 }} className={card}>
              <h2 id="como-funciona" className={`${cardTitle} scroll-mt-24`}>{m.home.howTitle}</h2>
              <ol className="mt-6 space-y-6">
                {steps.map((s, i) => (
                  <li key={s.title}>
                    <p className="font-display text-sm font-extrabold tracking-wide text-neon-400 uppercase">0{i + 1} · {s.title}</p>
                    <p className="mt-1 text-sm text-white">{s.body}</p>
                  </li>
                ))}
              </ol>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/cadastro" className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-neon-400 px-5 text-sm font-bold tracking-[0.12em] text-night-950 uppercase transition hover:-translate-y-0.5 hover:bg-neon-300">
                  {m.home.heroSecondary}<ArrowUpRight aria-hidden className="size-4" />
                </Link>
                <Link href="/comunidades/nova" className="inline-flex h-11 items-center justify-center rounded-md border border-white/20 px-5 text-sm font-bold tracking-[0.12em] text-white uppercase transition hover:-translate-y-0.5 hover:border-neon-400">
                  {m.home.ctaCommunity}
                </Link>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
