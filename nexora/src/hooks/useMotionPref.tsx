/**
 * Preferência de movimento: respeita prefers-reduced-motion e oferece um botão "Reduzir efeitos"
 * (desliga parallax, animações de entrada e a rotação automática do 3D).
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

const Ctx = createContext<{ reduced: boolean; userReduced: boolean; setUserReduced: (v: boolean) => void } | null>(null);
const KEY = 'nexora:reduce-motion';

export function MotionPrefProvider({ children }: { children: ReactNode }) {
  const [system, setSystem] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [userReduced, setUserReduced] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } });
  useEffect(() => {
    const mq = matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setSystem(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const reduced = system || userReduced;
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
    try { localStorage.setItem(KEY, userReduced ? '1' : '0'); } catch { /* sem armazenamento */ }
  }, [reduced, userReduced]);
  const value = useMemo(() => ({ reduced, userReduced, setUserReduced }), [reduced, userReduced]);
  return (
    <Ctx.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>{children}</MotionConfig>
    </Ctx.Provider>
  );
}

export function useMotionPref() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMotionPref fora do provider');
  return v;
}
