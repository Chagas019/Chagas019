"use client";

import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, ArrowUpRight, BookOpen, Library, Target, WandSparkles } from "lucide-react";
import { useRef } from "react";
import { useApp } from "@/lib/store";
import { ButtonLink } from "@/components/ui/Button";
import { Logo } from "@/components/ui/bits";
import { RefArt } from "@/components/art/RefArt";
import { REFERENCES, referenceBySlug } from "@/lib/content/references";
import { CHALLENGES } from "@/lib/content/challenges";
import { COURSES, TOTAL_LESSONS } from "@/lib/content/courses";
import { EASE } from "@/components/ui/motion";

const DISCIPLINES = ["Fotografia", "Design gráfico", "Edição de vídeo", "Direção de arte", "Social media", "Tipografia", "Inteligência artificial", "Criatividade livre"];

function FloatingArt({ slug, className, depth }: { slug: string; className: string; depth: number }) {
  const ref = referenceBySlug(slug)!;
  return (
    <motion.div data-depth={depth} className={`absolute overflow-hidden rounded-2xl border border-line shadow-2xl ${className}`}>
      <RefArt {...ref} className="h-full w-full" />
    </motion.div>
  );
}

export function Landing() {
  const { status } = useApp();
  const logged = status === "ready";
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 });
  const sy = useSpring(my, { stiffness: 60, damping: 20 });
  const l1x = useTransform(sx, (v) => v * 18);
  const l1y = useTransform(sy, (v) => v * 18);
  const l2x = useTransform(sx, (v) => v * -28);
  const l2y = useTransform(sy, (v) => v * -22);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const titleY = useTransform(scrollYProgress, [0, 1], [0, 120]);

  return (
    <div className="relative overflow-x-clip">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-ink/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-4 sm:px-8">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Conta">
            {logged ? (
              <ButtonLink href="/inicio" size="sm">
                Ir para o lab <ArrowRight className="size-3.5" />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/entrar" variant="ghost" size="sm">
                  Entrar
                </ButtonLink>
                <ButtonLink href="/cadastro" size="sm">
                  Começar<span className="hidden sm:inline"> grátis</span> <ArrowRight className="size-3.5" />
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section
        ref={heroRef}
        className="hairline-grid relative flex min-h-[100svh] items-end px-5 pb-16 pt-32 sm:px-8 lg:pb-24"
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <motion.div style={{ x: l1x, y: l1y }} className="absolute inset-0">
            <FloatingArt slug="cartaz-festival-som" depth={1} className="right-[6%] top-[14%] hidden h-[300px] w-[230px] rotate-[5deg] md:block" />
            <FloatingArt slug="paleta-concreto-limao" depth={1} className="left-[38%] top-[13%] hidden h-[130px] w-[130px] -rotate-[8deg] xl:block" />
          </motion.div>
          <motion.div style={{ x: l2x, y: l2y }} className="absolute inset-0">
            <FloatingArt slug="luz-de-janela" depth={2} className="right-[24%] top-[30%] hidden h-[250px] w-[190px] -rotate-[4deg] lg:block" />
            <FloatingArt slug="identidade-modular" depth={2} className="right-[4%] top-[58%] hidden h-[170px] w-[170px] rotate-[10deg] md:block" />
          </motion.div>
        </div>

        <motion.div style={{ y: reduce ? 0 : titleY }} className="relative mx-auto w-full max-w-[1320px]">
          <motion.p
            className="label mb-8 flex items-center gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            <span className="inline-block size-1.5 animate-pulse-lime rounded-full bg-lime" /> Academia de criatividade · desde o primeiro rascunho
          </motion.p>
          <h1 className="display text-[clamp(3.4rem,11vw,10.5rem)]">
            {["Sua", "criatividade"].map((w, i) => (
              <span key={w} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  className="block"
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  transition={{ duration: 1, ease: EASE, delay: 0.1 + i * 0.08 }}
                >
                  {w}
                </motion.span>
              </span>
            ))}
            <span className="block overflow-hidden pb-[0.1em]">
              <motion.span
                className="block"
                initial={{ y: "105%" }}
                animate={{ y: 0 }}
                transition={{ duration: 1, ease: EASE, delay: 0.26 }}
              >
                não tem <span className="accent-serif text-lime">limites.</span>
              </motion.span>
            </span>
          </h1>
          <motion.div
            className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
          >
            <p className="max-w-md text-[17px] leading-relaxed text-fog">
              Desafios diários, referências visuais, aulas práticas e um diretor criativo com IA. Treine o olhar como quem treina o corpo — e acompanhe cada
              evolução.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href={logged ? "/inicio" : "/cadastro"} size="lg">
                {logged ? "Abrir meu lab" : "Começar meu primeiro desafio"} <ArrowRight className="size-4" />
              </ButtonLink>
              {!logged && (
                <ButtonLink href="/entrar" variant="outline" size="lg">
                  Já tenho conta
                </ButtonLink>
              )}
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* MARQUEE */}
      <section aria-label="Disciplinas" className="overflow-hidden border-y border-line bg-lime py-4 text-ink">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...DISCIPLINES, ...DISCIPLINES].map((d, i) => (
            <span key={i} className="flex items-center gap-10 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {d} <span className="accent-serif text-3xl">✳</span>
            </span>
          ))}
        </div>
      </section>

      {/* MÓDULOS — grid assimétrico */}
      <section className="mx-auto max-w-[1320px] px-5 py-24 sm:px-8 lg:py-36">
        <div className="mb-16 grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
          <h2 className="display text-[clamp(2.4rem,5.5vw,4.8rem)]">
            Um estúdio inteiro <span className="accent-serif text-lime">para treinar</span> o seu olhar.
          </h2>
          <p className="max-w-md text-fog md:justify-self-end">
            Cada visita ao CRIATIVA LAB termina com algo novo: uma foto, um rascunho, uma referência guardada ou uma ideia pronta para executar.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          {[
            {
              icon: Target,
              title: "Desafios criativos",
              text: `${CHALLENGES.length} desafios em 7 categorias, com missões diárias e jornadas especiais de 7 e 30 dias.`,
              span: "md:col-span-4 md:row-span-2",
              art: "cartaz-suico",
            },
            { icon: Library, title: "Laboratório de referências", text: `${REFERENCES.length} referências curadas com o insight que importa.`, span: "md:col-span-2", art: "paleta-noite-neon" },
            { icon: BookOpen, title: "Academia", text: `${COURSES.length} trilhas e ${TOTAL_LESSONS} aulas práticas.`, span: "md:col-span-2", art: "serif-em-movimento" },
            {
              icon: WandSparkles,
              title: "Gerador de ideias com IA",
              text: "Conceito, direção de arte, paleta e roteiro sob medida — em segundos.",
              span: "md:col-span-6",
              art: "still-life-cromatico",
            },
          ].map(({ icon: Icon, title, text, span, art }, i) => (
            <motion.article
              key={title}
              className={`card group grain relative overflow-hidden p-7 ${span}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.8, ease: EASE, delay: i * 0.06 }}
            >
              <div className="absolute -right-10 -top-10 h-56 w-56 rotate-6 overflow-hidden rounded-2xl opacity-40 transition duration-700 group-hover:rotate-0 group-hover:opacity-80">
                <RefArt {...referenceBySlug(art)!} className="h-full w-full" />
              </div>
              <div className="relative flex h-full min-h-[180px] flex-col justify-end">
                <Icon className="mb-auto size-6 text-lime" aria-hidden />
                <h3 className="mt-16 font-display text-2xl font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 max-w-sm text-sm text-fog">{text}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* MANIFESTO */}
      <section className="border-t border-line px-5 py-24 sm:px-8 lg:py-36">
        <div className="mx-auto max-w-[1320px]">
          <p className="label mb-10">Manifesto</p>
          <p className="display max-w-5xl text-[clamp(2rem,4.6vw,4.2rem)] leading-[1.02]">
            Criatividade não é dom. É <span className="accent-serif text-lime">músculo</span>. Treina-se com repetição, repertório e coragem para errar
            todos os dias — um pouco melhor.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {[
              ["01", "Faça", "Um desafio curto por dia, com objetivo claro."],
              ["02", "Observe", "Referências com o porquê, não só o bonito."],
              ["03", "Evolua", "XP, níveis, medalhas e um portfólio que cresce."],
            ].map(([n, t, d]) => (
              <div key={n} className="border-t border-line pt-6">
                <span className="font-mono text-xs text-lime">{n}</span>
                <h3 className="mt-3 font-display text-2xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-fog">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-10 sm:px-8">
        <div className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[2rem] bg-lime px-8 py-16 text-ink sm:px-14 sm:py-24">
          <p className="display max-w-3xl text-[clamp(2.4rem,6vw,5.6rem)]">
            Ideias não nascem prontas. <span className="accent-serif">Elas são desenvolvidas.</span>
          </p>
          <Link
            href={logged ? "/inicio" : "/cadastro"}
            className="group mt-10 inline-flex items-center gap-3 rounded-full bg-ink px-7 py-4 text-paper transition-transform hover:scale-[1.03]"
          >
            {logged ? "Voltar para o lab" : "Criar minha conta"}
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
          <svg aria-hidden viewBox="0 0 200 200" className="absolute -bottom-16 -right-10 size-72 animate-spin-slow opacity-90 sm:size-96">
            <defs>
              <path id="circ" d="M100,100 m-75,0 a75,75 0 1,1 150,0 a75,75 0 1,1 -150,0" />
            </defs>
            <text fontSize="13" fontFamily="var(--font-mono)" letterSpacing="4" fill="#0a0a0a">
              <textPath href="#circ">CRIATIVA LAB · SUA CRIATIVIDADE NÃO TEM LIMITES ·</textPath>
            </text>
          </svg>
        </div>
        <footer className="mx-auto flex max-w-[1320px] flex-col items-start justify-between gap-4 py-10 text-xs text-mute sm:flex-row sm:items-center">
          <Logo />
          <p>© {new Date().getFullYear()} CRIATIVA LAB. Feito para quem cria todos os dias.</p>
        </footer>
      </section>
    </div>
  );
}
