import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView, useScroll, useTransform, animate } from 'framer-motion';
import { useMotionPref } from '@/hooks/useMotionPref';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Conteúdo que sobe e aparece ao entrar na tela */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div' }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: 'div' | 'li' | 'section' }) {
  const M = as === 'li' ? motion.li : as === 'section' ? motion.section : motion.div;
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-10% 0px' }} transition={{ duration: 0.9, delay, ease: EASE }}>
      {children}
    </M>
  );
}

/** Título revelado palavra por palavra (o texto completo continua acessível como um só) */
export function WordReveal({ text, className, delay = 0, stagger = 0.06, as: Tag = 'h2', animateNow, id }: { text: string; className?: string; delay?: number; stagger?: number; as?: 'h1' | 'h2' | 'h3' | 'p'; animateNow?: boolean; id?: string }) {
  const words = text.split(' ');
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const show = animateNow ?? inView;
  return (
    <Tag ref={ref} id={id} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span className="inline-block" initial={{ y: '105%' }} animate={show ? { y: '0%' } : undefined} transition={{ duration: 1, delay: delay + i * stagger, ease: EASE }}>
            {w}{i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Revelação por máscara (de baixo para cima) */
export function MaskReveal({ children, className, delay = 0, from = 'bottom' }: { children: ReactNode; className?: string; delay?: number; from?: 'bottom' | 'left' }) {
  const hidden = from === 'bottom' ? 'inset(100% 0% 0% 0%)' : 'inset(0% 100% 0% 0%)';
  return (
    <motion.div className={className} initial={{ clipPath: hidden }} whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }} viewport={{ once: true, margin: '-8% 0px' }} transition={{ duration: 1.3, delay, ease: EASE }}>
      {children}
    </motion.div>
  );
}

/** Parallax vertical discreto; desligado com movimento reduzido */
export function Parallax({ children, className, amount = 60 }: { children: ReactNode; className?: string; amount?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPref();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [-amount, amount]);
  return (
    <div ref={ref} className={`overflow-hidden ${className ?? ''}`}>
      <motion.div style={{ y, scale: reduced ? 1 : 1.12 }} className="h-full w-full">{children}</motion.div>
    </div>
  );
}

/** Número que conta até o valor ao aparecer */
export function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString('pt-BR'), duration = 1.6 }: { value: number; format?: (n: number) => string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const { reduced } = useMotionPref();
  const [n, setN] = useState(reduced ? value : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setN(value); return; }
    const c = animate(0, value, { duration, ease: EASE, onUpdate: setN });
    return () => c.stop();
  }, [inView, value, reduced, duration]);
  return <span ref={ref}>{format(n)}</span>;
}
