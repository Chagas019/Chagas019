import Link from "next/link";
import { sql } from "drizzle-orm";
import { ArrowUpRight, Briefcase, GraduationCap, MessageSquare, Sparkles, SplitSquareHorizontal, Swords, Users } from "lucide-react";
import { db } from "@/server/db";
import { ButtonLink } from "@/components/ui/button";
import { Marquee } from "@/components/ui/marquee";
import { Sparkle } from "@/components/ui/sparkle";
import { FEED_FILTERS } from "@/lib/taxonomy";
import { cn, compactNumber } from "@/lib/utils";

/** Números reais da plataforma — só aparecem quando existem. */
async function stats() {
  const [row] = await db.execute<{ creators: number; works: number; challenges: number }>(sql`
    select (select count(*)::int from "user") as creators,
           (select count(*)::int from post where status = 'published' and visibility = 'public' and kind <> 'discussion') as works,
           (select count(*)::int from challenge) as challenges`);
  return row ?? { creators: 0, works: 0, challenges: 0 };
}

const FEATURES = [
  { title: "Showcase", text: "Publique o resultado e o caminho até ele: antes e depois com controle deslizante, ficha técnica e créditos.", href: "/cadastro", icon: SplitSquareHorizontal },
  { title: "FRAME LAB", text: "Tutoriais com nível, tempo e etapas. Aprenda Lightroom, DaVinci, CapCut e fotografia com quem faz.", href: "/lab", icon: GraduationCap },
  { title: "Creative Battles", text: "Desafios semanais e mensais com regras públicas. Evolua, participe e mostre seu olhar.", href: "/desafios", icon: Swords },
  { title: "Collab", text: "Encontre modelo, editor, colorista ou fotógrafo. O contato só é liberado quando você aceita.", href: "/collab", icon: Briefcase },
];

export async function Landing() {
  const s = await stats();
  const numbers = [
    { value: s.creators, label: "Criadores" },
    { value: s.works, label: "Trabalhos publicados" },
    { value: s.challenges, label: "Desafios" },
  ].filter((n) => n.value > 0);

  return (
    <div>
      {/* HERO — azul elétrico */}
      <section className="relative overflow-hidden bg-cobalt-500">
        <div className="mx-auto grid max-w-[1440px] gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[200px_1fr] lg:px-10 lg:pb-20 lg:pt-14">
          <div className="order-2 flex gap-8 lg:order-1 lg:flex-col lg:justify-end lg:gap-6">
            {numbers.map((n) => (
              <div key={n.label}>
                <p className="font-display text-5xl text-paper">
                  {compactNumber(n.value)}
                  <span className="align-top text-2xl text-volt-500">+</span>
                </p>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/80">{n.label}</p>
              </div>
            ))}
          </div>
          <div className="relative order-1 lg:order-2">
            <Sparkle className="spin-slow absolute right-2 top-0 hidden size-16 text-volt-500 sm:block" />
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-paper">
              <Sparkle className="size-3.5 text-volt-500" /> A rede social dos criadores visuais
            </p>
            <h1 className="mt-4 font-display text-[clamp(3.6rem,13vw,11rem)] leading-[0.86] text-volt-500">
              Sua criatividade
              <span className="block text-paper">merece um mundo inteiro</span>
            </h1>
            <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <p className="max-w-md text-pretty text-paper/85">
                Fotógrafos, videomakers, editores e designers publicando o resultado e o processo. Aprenda, participe de desafios e encontre gente para criar junto.
              </p>
              <div className="flex flex-wrap gap-3">
                <ButtonLink href="/cadastro" size="lg">
                  Criar meu portfólio <ArrowUpRight className="size-4" aria-hidden />
                </ButtonLink>
                <ButtonLink href="/descobrir" size="lg" variant="ghost" className="text-paper ring-1 ring-inset ring-paper/40 hover:bg-white/10">
                  Explorar talentos
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Marquee items={["Fotografia", "Vídeo", "Edição", "Color grading", "Design", "Motion", "Mobile", "Retrato"]} />

      {/* O QUE VOCÊ FAZ — escuro */}
      <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-10 lg:py-24">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <Sparkle className="size-3.5 text-volt-500" /> O que você faz aqui
            </p>
            <h2 className="max-w-3xl font-display text-5xl sm:text-6xl">Do clique à colaboração, tudo num só lugar.</h2>
          </div>
          <ButtonLink href="/cadastro" variant="outline">
            Começar agora <ArrowUpRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f, i) => (
            <li key={f.title}>
              <Link
                href={f.href}
                className={cn(
                  "group flex h-full flex-col justify-between gap-10 rounded-[var(--radius-md)] p-6 transition-transform duration-300 hover:-translate-y-1",
                  i === 1 ? "bg-cobalt-500" : "bg-ink-800 ring-1 ring-inset ring-white/[0.06]",
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-3xl">{f.title}</h3>
                  <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-volt-500 text-ink-950 transition-transform group-hover:rotate-45">
                    <ArrowUpRight className="size-5" aria-hidden />
                  </span>
                </div>
                <div className="space-y-4">
                  <f.icon className={cn("size-8", i === 1 ? "text-volt-500" : "text-fog-400")} aria-hidden />
                  <p className={cn("text-sm leading-relaxed", i === 1 ? "text-paper/90" : "text-fog-400")}>{f.text}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* COMUNIDADE — seção clara */}
      <section className="bg-mist-100 text-ink-950">
        <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-10 lg:py-24">
          <div className="space-y-6">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
              <Sparkle className="size-3.5 text-cobalt-500" /> Quem somos
            </p>
            <h2 className="font-display text-5xl sm:text-6xl">Criatividade encontra comunidade.</h2>
            <p className="max-w-lg text-pretty text-ink-700">
              O FRAME não prioriza só quem já tem milhares de seguidores. O feed equilibra relevância, qualidade das conversas e espaço para novos talentos — e os critérios são públicos.
            </p>
            <ul className="space-y-3">
              {[
                { icon: Users, text: "Comunidades públicas, privadas e por convite" },
                { icon: MessageSquare, text: "Mensagens diretas com controle de quem fala com você" },
                { icon: Sparkles, text: "Portfólio profissional com Showcases e coleções" },
              ].map((x) => (
                <li key={x.text} className="flex items-center gap-3 font-semibold">
                  <span className="grid size-10 place-items-center rounded-full bg-volt-500 text-ink-950">
                    <x.icon className="size-5" aria-hidden />
                  </span>
                  {x.text}
                </li>
              ))}
            </ul>
            <ButtonLink href="/cadastro" className="bg-ink-950 text-paper shadow-none hover:bg-ink-800">
              Entrar para o FRAME <ArrowUpRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          <div className="flex flex-col justify-end gap-3">
            {[
              { label: "Fotografia e retrato", text: "Ensaios, eventos, produto e rua — com ficha técnica opcional." },
              { label: "Vídeo e color grading", text: "Reels, curtas e clipes com antes e depois da cor." },
              { label: "Design e motion", text: "Identidades, cartazes e animações com o processo à mostra." },
            ].map((b) => (
              <div key={b.label} className="rounded-[var(--radius-md)] bg-paper p-5">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>{b.label}</span>
                  <Sparkle className="size-4 text-cobalt-500" />
                </div>
                <p className="mt-2 text-sm text-ink-700">{b.text}</p>
              </div>
            ))}
            <ul className="mt-3 flex flex-wrap justify-between gap-3 rounded-[var(--radius-md)] bg-ink-950 p-5 text-volt-500">
              {FEED_FILTERS.slice(2, 9).map((c) => (
                <li key={c.slug}>
                  <Link href={`/?f=${c.slug}#inspiracao`} className="text-xs font-semibold uppercase tracking-[0.12em] hover:text-paper">
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-ink-950 px-4 py-10 text-center sm:py-14">
        <p className="font-display text-[clamp(2.2rem,7vw,5.5rem)] leading-[0.9]">
          <span className="rounded-[var(--radius-sm)] bg-cobalt-500 px-3">Somos criadores,</span> <span className="text-volt-500">aprendizes</span> e contadores de histórias
        </p>
      </section>
    </div>
  );
}
