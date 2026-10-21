import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { ArrowDown, ArrowRight, Box } from 'lucide-react';
import type { Property } from '@/types/property';
import type { HomeContent } from '@/data/content';
import { TLink } from '@/components/ui/TLink';
import { WordReveal } from '@/components/motion/Reveal';
import { useMotionPref } from '@/hooks/useMotionPref';
import { formatArea, formatPrice, location } from '@/lib/format';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Primeira tela. Sequência: fundo escuro → imagem revelada por máscara → título por palavras →
 * dados do imóvel em sequência → botões. A imagem ganha profundidade com o cursor (desligado em movimento reduzido/toque).
 */
export function Hero({ p, content }: { p?: Property; content: HomeContent }) {
  const { reduced } = useMotionPref();
  const mx = useMotionValue(0), my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20 }), sy = useSpring(my, { stiffness: 60, damping: 20 });
  const imgX = useTransform(sx, (v) => v * -14), imgY = useTransform(sy, (v) => v * -10);
  const uiX = useTransform(sx, (v) => v * 8), uiY = useTransform(sy, (v) => v * 6);
  const [loaded, setLoaded] = useState(false);
  // com movimento reduzido tudo aparece de uma vez, sem esperar a sequência
  const t = (d: number) => (reduced ? 0 : d);

  useEffect(() => {
    if (reduced || !matchMedia('(pointer: fine)').matches) return;
    const on = (e: PointerEvent) => { mx.set(e.clientX / innerWidth - 0.5); my.set(e.clientY / innerHeight - 0.5); };
    window.addEventListener('pointermove', on);
    return () => window.removeEventListener('pointermove', on);
  }, [reduced, mx, my]);

  const cover = p?.cover;
  const facts = p ? [
    { k: 'Preço', v: formatPrice(p) },
    p.builtArea ? { k: 'Área', v: formatArea(p.builtArea) } : null,
    p.bedrooms ? { k: 'Quartos', v: `${p.bedrooms} · ${p.suites} suíte` } : null,
    { k: 'Local', v: location(p) },
  ].filter(Boolean) as { k: string; v: string }[] : [];

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-ink text-paper" aria-labelledby="hero-title">
      {cover && (
        <motion.div
          className="absolute inset-0 -z-10"
          initial={{ clipPath: 'inset(18% 22% 18% 22% round 14px)', opacity: 0 }}
          animate={loaded ? { clipPath: 'inset(0% 0% 0% 0% round 0px)', opacity: 1 } : undefined}
          transition={{ duration: 1.6, delay: t(0.35), ease: EASE }}
        >
          <motion.img
            src={cover.src}
            srcSet={cover.thumb ? `${cover.thumb} 1200w, ${cover.src} 2400w` : undefined}
            sizes="100vw"
            alt={cover.alt}
            width={cover.width}
            height={cover.height}
            fetchPriority="high"
            onLoad={() => setLoaded(true)}
            ref={(el) => { if (el?.complete) setLoaded(true); }}
            style={{ x: imgX, y: imgY }}
            initial={{ scale: 1.22 }}
            animate={loaded ? { scale: 1.08 } : undefined}
            transition={{ duration: 2.4, delay: t(0.35), ease: EASE }}
            className="h-full w-full object-cover object-[60%_50%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/35 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/50" />
        </motion.div>
      )}

      {/* linhas de cota discretas, como em um desenho técnico */}
      <motion.div aria-hidden className="pointer-events-none absolute inset-0 -z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: t(1.6), duration: 1.2 }}>
        <div className="container relative h-full">
          <div className="absolute bottom-0 left-5 top-0 w-px bg-white/10 md:left-8 xl:left-12" />
          <div className="absolute bottom-[22%] left-0 right-0 h-px bg-white/[0.06]" />
        </div>
      </motion.div>

      <div className="container flex flex-1 flex-col justify-end pb-10 pt-[calc(var(--header-h)+3rem)] md:pb-14">
        <div className="grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <motion.p className="eyebrow mb-6 flex items-center gap-3 text-paper/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: t(0.9), duration: 0.8 }}>
              <span className="h-px w-10 bg-signal" /> NEXORA Real Estate
            </motion.p>
            <WordReveal id="hero-title" as="h1" text={content.heroTitle} animateNow className="text-display-xl font-medium" delay={t(1.0)} stagger={reduced ? 0 : 0.07} />
            <motion.p className="mt-6 max-w-xl text-lg text-paper/75 md:text-xl" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: t(1.55), duration: 0.9, ease: EASE }}>
              {content.heroSubtitle}
            </motion.p>
            <motion.div className="mt-9 flex flex-wrap gap-3" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: t(1.95), duration: 0.8, ease: EASE }}>
              <TLink to="/imoveis" className="btn-light px-6">{content.heroPrimary} <ArrowRight size={16} /></TLink>
              <TLink to="/experiencia-3d" className="btn-ghost border-white/20 px-6 text-paper backdrop-blur hover:bg-white/10"><Box size={16} /> {content.heroSecondary}</TLink>
            </motion.div>
          </div>

          {p && (
            <motion.aside style={{ x: uiX, y: uiY }} className="lg:col-span-4 lg:justify-self-end" aria-label="Imóvel em destaque">
              <TLink to={`/imovel/${p.slug}`} className="group block w-full max-w-sm rounded-xl border border-white/12 bg-ink/45 p-5 backdrop-blur-xl transition hover:border-white/25">
                <motion.div className="flex items-center justify-between" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: t(1.7) }}>
                  <span className="eyebrow text-paper/60">Em destaque</span>
                  {p.demo && <span className="chip border-white/15 text-paper/60">Demo</span>}
                </motion.div>
                <motion.p className="mt-3 text-xl font-medium tracking-tight" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: t(1.8) }}>{p.name}</motion.p>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-white/10 pt-4">
                  {facts.map((f, i) => (
                    <motion.div key={f.k} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: t(1.9) + i * 0.09, duration: 0.6, ease: EASE }} className={f.k === 'Local' ? 'col-span-2' : ''}>
                      <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper/50">{f.k}</dt>
                      <dd className="mt-0.5 text-sm tabular-nums">{f.v}</dd>
                    </motion.div>
                  ))}
                </dl>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] text-signal-soft">Ver imóvel <ArrowRight size={14} className="transition group-hover:translate-x-1" /></span>
              </TLink>
            </motion.aside>
          )}
        </div>

        <motion.a href="#busca" className="mt-12 hidden items-center gap-3 self-start text-paper/60 hover:text-paper md:inline-flex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: t(2.4) }}>
          <span className="relative h-10 w-px overflow-hidden bg-white/15"><span className="absolute inset-x-0 top-0 h-1/2 animate-scrollcue bg-paper" /></span>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.2em]">Role para explorar</span>
          <ArrowDown size={14} />
        </motion.a>
      </div>
      {cover?.caption && <p className="absolute bottom-3 right-5 hidden font-mono text-[10px] uppercase tracking-wider text-paper/40 md:block">{cover.caption}</p>}
    </section>
  );
}
