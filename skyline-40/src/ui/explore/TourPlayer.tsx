import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TOUR } from '../../data/tour';
import { useSkyline } from '../../state/store';

/**
 * Apresentação guiada: executa as ações de cada etapa no tempo certo, com pausa/continuar,
 * avançar, voltar e sair. O relógio só anda quando a apresentação não está pausada.
 */
export function TourPlayer() {
  const tour = useSkyline((s) => s.tour);
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const fired = useRef<Set<number>>(new Set());
  const stepRef = useRef(-1);
  const startTod = useRef(useSkyline.getState().timeOfDay);

  useEffect(() => {
    if (!tour.active) {
      stepRef.current = -1;
      return;
    }
    startTod.current = useSkyline.getState().timeOfDay;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const st = useSkyline.getState();
      if (!st.tour.active) return;
      if (stepRef.current !== st.tour.step) {
        // nova etapa (avanço automático, botões ou início): zera relógio e ações
        stepRef.current = st.tour.step;
        fired.current = new Set();
        elapsedRef.current = 0;
      }
      if (!st.tour.paused && !document.hidden) {
        const step = TOUR[st.tour.step];
        elapsedRef.current += dt;
        step.actions.forEach((a, i) => {
          if (!fired.current.has(i) && elapsedRef.current >= a.at) {
            fired.current.add(i);
            a.run();
          }
        });
        if (elapsedRef.current >= step.duration) {
          if (st.tour.step < TOUR.length - 1) st.setTour({ step: st.tour.step + 1 });
          else {
            st.setTour({ active: false, step: 0, paused: false });
            st.setTimeOfDay(startTod.current);
          }
        }
        setElapsed(elapsedRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tour.active]);

  if (!tour.active) return null;
  const step = TOUR[tour.step];
  const s = useSkyline.getState;
  const go = (i: number) => {
    const n = Math.max(0, Math.min(TOUR.length - 1, i));
    stepRef.current = -2; // força o reinício da etapa no próximo quadro
    s().setOrbitSpeed(0);
    s().setTour({ step: n, paused: false });
  };
  const exit = () => {
    s().setOrbitSpeed(0);
    s().setTour({ active: false, step: 0, paused: false });
    s().setTimeOfDay(startTod.current);
  };

  return (
    <div className="tour" role="region" aria-label="Apresentação guiada">
      <div className="tour__progress" aria-hidden="true">
        {TOUR.map((t, i) => (
          <button key={t.id} type="button" tabIndex={-1} className={i < tour.step ? 'is-done' : i === tour.step ? 'is-on' : ''} onClick={() => go(i)}>
            <i style={i === tour.step ? { transform: `scaleX(${Math.min(1, elapsed / t.duration)})` } : undefined} />
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          className="tour__text"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: s().reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="kicker">{String(tour.step + 1).padStart(2, '0')} / {String(TOUR.length).padStart(2, '0')} · {step.title}</span>
          <p aria-live="polite">{step.caption}</p>
        </motion.div>
      </AnimatePresence>
      <div className="tour__ctl">
        <button type="button" className="icon-btn" onClick={() => go(tour.step - 1)} disabled={tour.step === 0} aria-label="Etapa anterior"><SkipBack size={17} /></button>
        <button type="button" className="icon-btn icon-btn--lg" onClick={() => s().setTour({ paused: !tour.paused })} aria-label={tour.paused ? 'Continuar' : 'Pausar'}>
          {tour.paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
        <button type="button" className="icon-btn" onClick={() => go(tour.step + 1)} disabled={tour.step === TOUR.length - 1} aria-label="Próxima etapa"><SkipForward size={17} /></button>
        <button type="button" className="pill-btn" onClick={exit}><X size={15} /> <span>Sair</span></button>
      </div>
    </div>
  );
}
