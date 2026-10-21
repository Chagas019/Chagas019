import { motion } from 'framer-motion';
import { ArrowDown, Box } from 'lucide-react';
import { ROOF_Y } from '../../data/building';
import { garageStats } from '../../data/garage';
import { useSkyline } from '../../state/store';
import { Logo } from '../explore/TopBar';

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero({ has3D }: { has3D: boolean }) {
  const reduced = useSkyline((s) => s.reducedMotion);
  const d = (t: number) => (reduced ? 0 : t);
  const enter = () => {
    useSkyline.getState().enterExplore();
    window.scrollTo({ top: 0 });
  };
  const toProject = () => document.getElementById('conceito')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  const g = garageStats();
  return (
    <section className="hero" aria-labelledby="hero-title">
      <header className="hero__nav">
        <Logo />
        <nav aria-label="Seções">
          <a href="#conceito">Conceito</a>
          <a href="#pavimentos">Pavimentos</a>
          <a href="#apartamentos">Apartamentos</a>
          <a href="#cobertura">Cobertura</a>
          <a href="#garagem">Garagem</a>
          <a href="#ficha">Ficha técnica</a>
        </nav>
      </header>
      <div className="hero__content">
        <motion.span className="kicker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(0.3), duration: d(0.8), ease }}>
          Residencial contemporâneo · conceito
        </motion.span>
        <motion.h1 id="hero-title" initial={{ opacity: 0, y: 24, letterSpacing: '0.3em' }} animate={{ opacity: 1, y: 0, letterSpacing: '0.06em' }} transition={{ delay: d(0.45), duration: d(1.4), ease }}>
          SKYLINE <span>40</span>
        </motion.h1>
        <motion.p className="hero__claim" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(0.9), duration: d(1), ease }}>
          Uma nova perspectiva de viver.
        </motion.p>
        <motion.div className="hero__cta" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: d(1.2), duration: d(0.9), ease }}>
          {has3D && (
            <button type="button" className="btn btn--primary" onClick={enter}>
              <Box size={18} strokeWidth={1.7} /> Explorar em 3D
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={toProject}>
            Conhecer o projeto <ArrowDown size={16} />
          </button>
        </motion.div>
      </div>
      <motion.dl className="hero__facts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(1.6), duration: d(1) }}>
        <div><dt>40</dt><dd>pavimentos</dd></div>
        <div><dt>≈{Math.round(ROOF_Y)} m</dt><dd>cobertura panorâmica</dd></div>
        <div><dt>{g.levels}</dt><dd>subsolos de garagem</dd></div>
      </motion.dl>
      <div className="hero__scroll" aria-hidden="true"><i /></div>
    </section>
  );
}
