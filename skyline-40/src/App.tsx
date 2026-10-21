import { Component, Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSkyline } from './state/store';
import { checkWebGL } from './config/performance';
import { useReducedMotionSync } from './hooks/useEnvironmentSync';
import { Hero } from './ui/home/Hero';
import { Sections } from './ui/home/Sections';
import { ExploreUI } from './ui/explore/ExploreUI';
import { LoadingOverlay, Toast } from './ui/explore/Overlays';
import { Fallback } from './ui/Fallback';

// O motor 3D (three.js + cena) é baixado à parte: o texto da página aparece antes.
const Scene = lazy(() => import('./three/Scene'));

class SceneBoundary extends Component<{ children: ReactNode; onError: (msg: string) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error('[SKYLINE 40] Falha na cena 3D:', error);
    this.props.onError('A cena 3D encontrou um erro neste dispositivo.');
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Marca o estágio "GPU" quando o módulo 3D termina de baixar. */
function SceneLoaded({ onLoad }: { onLoad: () => void }) {
  useEffect(onLoad, [onLoad]);
  return null;
}

export default function App() {
  useReducedMotionSync();
  const page = useSkyline((s) => s.page);
  const failed = useSkyline((s) => s.webglFailed);
  const support = useMemo(checkWebGL, []);
  const [stage, setStage] = useState<'script' | 'gpu' | 'ready'>('script');
  const [attempt, setAttempt] = useState(0);
  const has3D = support.ok && !failed;

  useEffect(() => {
    (window as unknown as { __skyline?: typeof useSkyline }).__skyline = useSkyline;
  }, []);

  useEffect(() => {
    document.body.classList.toggle('is-exploring', page === 'explore');
  }, [page]);

  // primeira aproximação de câmera quando a cena fica pronta
  const ready = useSkyline((s) => s.ready);
  useEffect(() => {
    if (!ready) return;
    const s = useSkyline.getState();
    if (s.page === 'home') s.flyTo({ position: [150, 46, 235], target: [0, 72, 0] }, 4.2);
    const params = new URLSearchParams(location.search);
    if (params.has('explore')) s.enterExplore();
  }, [ready]);

  // No início, o edifício aparece à direita do título (desktop) ou acima do texto (celular).
  useEffect(() => {
    if (page !== 'home') return;
    const apply = () => {
      const w = window.innerWidth;
      const mobile = w <= 820;
      useSkyline.getState().setInsets(mobile ? { left: 0, right: 0, bottom: Math.round(window.innerHeight * 0.42) } : { left: Math.round(w * 0.42), right: 0, bottom: 0 });
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [page]);

  const reason = !support.ok ? support.reason : failed ?? '';

  return (
    <div className={`app app--${page}`}>
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
      {has3D && (
        <SceneBoundary key={attempt} onError={(m) => useSkyline.getState().setWebglFailed(m)}>
          <Suspense fallback={null}>
            <SceneLoaded onLoad={() => setStage('gpu')} />
            <Scene />
          </Suspense>
        </SceneBoundary>
      )}
      {has3D && <LoadingOverlay stage={stage} />}
      {page === 'explore' && has3D ? (
        <ExploreUI />
      ) : (
        <div className="home">
          <Hero has3D={has3D} />
          {!has3D && (
            <Fallback
              reason={reason}
              onRetry={support.ok ? () => { useSkyline.getState().setWebglFailed(null); useSkyline.getState().setReady(false); setAttempt((a) => a + 1); } : undefined}
            />
          )}
          <Sections has3D={has3D} />
        </div>
      )}
      <Toast />
    </div>
  );
}
