import { useEffect, useState } from 'react';
import { useSkyline } from '../state/store';

/** Mantém o estado sincronizado com "reduzir movimento" do sistema operacional. */
export function useReducedMotionSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => useSkyline.getState().setReducedMotion(mq.matches || new URLSearchParams(location.search).has('reduced'));
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false));
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return matches;
}

export function useIsMobile() {
  return useMediaQuery('(max-width: 820px)');
}

/** Tela cheia com alternativa para navegadores sem a API (iPhone): apenas oculta a interface. */
export function useFullscreen() {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const on = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggle = async () => {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else {
        const s = useSkyline.getState();
        s.setUiHidden(!s.uiHidden);
        s.notify('Tela cheia indisponível neste navegador: a interface foi ocultada. Toque em "Mostrar interface" para voltar.');
      }
    } catch {
      useSkyline.getState().notify('O navegador bloqueou a tela cheia.');
    }
  };
  return { active, toggle };
}
