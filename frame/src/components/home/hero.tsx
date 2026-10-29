import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { recentPublicCovers } from "@/server/services/posts";
import { activeCreators24h } from "@/server/services/stats";
import { dailyPrompt } from "@/lib/creative/daily";
import { mediaUrl } from "@/lib/utils";
import { HeroToggle } from "./hero-toggle";

const TAGS = [
  { slug: "fotografia", label: "Fotografia", pos: "left-[4%] top-[8%]", r: "-6deg", d: "0s" },
  { slug: "cinematografica", label: "Cinematografia", pos: "right-[2%] top-[2%]", r: "4deg", d: "1.2s" },
  { slug: "color-grading", label: "Color grading", pos: "left-[0%] bottom-[18%]", r: "3deg", d: "2.1s" },
  { slug: "motion", label: "Motion", pos: "right-[6%] bottom-[6%]", r: "-4deg", d: "0.6s" },
  { slug: "design", label: "Design", pos: "left-[38%] -top-[2%]", r: "2deg", d: "1.7s" },
];

/** Hero editorial do topo do feed. Minimizável; só mostra números e trabalhos reais. */
export async function Hero({ minimized, signedIn }: { minimized: boolean; signedIn: boolean }) {
  const createHref = signedIn ? "/publicar" : "/cadastro";
  if (minimized) {
    return (
      <section aria-label="Apresentação" className="flex items-center gap-3 rounded-[22px] bg-ink-900 px-4 py-3 ring-1 ring-white/[0.06]">
        <p className="min-w-0 flex-1 truncate font-display text-xl sm:text-2xl">
          Seu próximo <span className="text-volt-500">projeto</span> começa aqui.
        </p>
        <Link href="/descobrir" className="hidden text-sm text-fog-300 hover:text-paper sm:block">
          Descobrir
        </Link>
        <Link href={createHref} className="hidden rounded-full bg-volt-500 px-3 py-1.5 text-sm font-semibold text-ink-950 sm:block">
          Criar agora
        </Link>
        <HeroToggle minimized />
      </section>
    );
  }
  const [covers, active] = await Promise.all([recentPublicCovers(3), activeCreators24h()]);
  const daily = dailyPrompt();

  return (
    <section aria-labelledby="hero-titulo" className="relative overflow-hidden rounded-[32px] bg-ink-900 ring-1 ring-white/[0.06]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_380px_at_85%_20%,rgb(212_255_54/0.07),transparent_70%),radial-gradient(500px_300px_at_0%_100%,rgb(39_52_240/0.10),transparent_70%)]" />
      <div className="relative grid gap-6 p-5 sm:p-8 lg:grid-cols-[1.4fr_1fr] lg:gap-8 lg:p-9">
        <div className="flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-fog-400">Ideias em movimento</p>
            <HeroToggle minimized={false} />
          </div>
          <h1 id="hero-titulo" className="font-display text-[clamp(2.6rem,5.4vw,5.4rem)] leading-[0.88]">
            <span className="block whitespace-nowrap">Seu próximo</span>
            <span className="relative block w-fit -skew-x-6 translate-x-3 whitespace-nowrap italic">
              <span className="text-outline-strong absolute left-1 top-1 select-none !opacity-100" aria-hidden>
                projeto
              </span>
              <span className="relative text-volt-500">projeto</span>
            </span>
            <span className="block whitespace-nowrap">começa aqui.</span>
          </h1>
          <p className="max-w-md text-pretty text-fog-300">FRAME não é apenas onde você publica o que criou. É onde descobre o que ainda pode criar.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/descobrir" className="inline-flex h-12 items-center gap-2 rounded-full bg-volt-500 px-6 font-semibold text-ink-950 transition-transform hover:-translate-y-0.5">
              Descobrir inspirações <ArrowUpRight className="size-4" aria-hidden />
            </Link>
            <Link href={createHref} className="inline-flex h-12 items-center gap-2 rounded-full px-5 text-paper ring-1 ring-inset ring-white/20 hover:bg-white/[0.05]">
              <Plus className="size-4" aria-hidden /> Criar agora
            </Link>
            {active > 0 ? (
              <span className="flex items-center gap-2 text-sm text-fog-400">
                <span className="live-dot size-2 rounded-full bg-volt-500" aria-hidden /> {active} {active === 1 ? "criador publicou" : "criadores publicaram"} hoje
              </span>
            ) : null}
          </div>
        </div>

        {/* Composição flutuante: etiquetas de áreas (links reais) + trabalhos recentes da comunidade. */}
        <div className="relative hidden min-h-[300px] lg:block">
          {covers.length ? (
            covers.map((c, i) => (
              <Link
                key={c.id}
                href={`/p/${c.postId}`}
                className={[
                  "group absolute overflow-hidden rounded-[22px] ring-1 ring-white/10 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.9)] transition-transform duration-500 hover:z-10 hover:scale-[1.03]",
                  i === 0 ? "left-[16%] top-[10%] h-[64%] w-[46%] -rotate-3" : i === 1 ? "right-[4%] top-[22%] h-[52%] w-[38%] rotate-3" : "bottom-[2%] left-[42%] h-[34%] w-[30%] -rotate-1",
                ].join(" ")}
              >
                <Image src={mediaUrl(c.id, "thumb")} alt={c.alt || c.title} fill unoptimized sizes="320px" className="object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-xs text-paper opacity-0 transition-opacity group-hover:opacity-100">{c.title}</span>
              </Link>
            ))
          ) : (
            <div className="absolute inset-[12%] rounded-[28px] border border-dashed border-white/10" aria-hidden />
          )}
          {TAGS.map((t) => (
            <Link
              key={t.slug}
              href={`/?f=${t.slug === "cinematografica" ? "fotografia" : t.slug}`}
              className={`drift absolute ${t.pos} z-20 rounded-full bg-ink-950/80 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-paper ring-1 ring-white/10 backdrop-blur hover:text-volt-500`}
              style={{ ["--r" as string]: t.r, animationDelay: t.d }}
            >
              {t.label}
            </Link>
          ))}
          <Link href="/desafios" className="absolute bottom-[26%] right-[30%] z-20 max-w-[60%] rounded-2xl bg-volt-500 px-4 py-2.5 text-ink-950 shadow-[0_18px_40px_-12px_rgb(212_255_54/0.45)] transition-transform hover:-translate-y-0.5">
            <span className="block font-mono text-[10px] uppercase tracking-[0.2em]">Desafio do dia</span>
            <span className="block truncate font-semibold">{daily.title}</span>
          </Link>
        </div>

        {/* Celular: atalhos compactos em vez da composição grande. */}
        <div className="scrollbar-none -mx-5 flex gap-2 overflow-x-auto px-5 lg:hidden">
          <Link href="/desafios" className="shrink-0 rounded-full bg-volt-500 px-3 py-1.5 text-xs font-semibold text-ink-950">
            Desafio: {daily.title}
          </Link>
          {TAGS.map((t) => (
            <Link key={t.slug} href={`/?f=${t.slug === "cinematografica" ? "fotografia" : t.slug}`} className="shrink-0 rounded-full bg-ink-800 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-fog-300">
              {t.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
