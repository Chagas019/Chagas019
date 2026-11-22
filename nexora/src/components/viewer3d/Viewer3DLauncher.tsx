import { lazy, Suspense, useState } from 'react';
import { Box } from 'lucide-react';
import type { ViewerProps } from './PropertyViewer3D';
import { hasWebGL } from './webgl';
import { ViewerFallback } from './ViewerFallback';
import { formatNumber } from '@/lib/format';

const PropertyViewer3D = lazy(() => import('./PropertyViewer3D'));

/** Mostra uma capa e só baixa a biblioteca 3D e o modelo quando a pessoa pede */
export function Viewer3DLauncher(props: ViewerProps & { autoStart?: boolean }) {
  const [start, setStart] = useState(!!props.autoStart);
  if (!hasWebGL()) return <ViewerFallback reason="sem-webgl" poster={props.poster} onGallery={props.onGallery} />;
  if (!start) {
    return (
      <div className="relative flex aspect-[4/5] min-h-[420px] w-full items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-navy text-paper sm:aspect-[16/10]">
        {props.poster && <img src={props.poster.thumb ?? props.poster.src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-45" />}
        <div className="blueprint-grid absolute inset-0 opacity-40" />
        <div className="relative px-6 text-center">
          <button type="button" onClick={() => setStart(true)} className="btn-light px-6"><Box size={17} /> Abrir modelo 3D</button>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-paper/70">
            {props.model.demonstrative ? 'Modelo demonstrativo' : 'Modelo 3D'}{props.model.sizeMb ? ` · ${formatNumber(props.model.sizeMb)} MB` : ''}
          </p>
        </div>
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="flex aspect-[4/5] min-h-[420px] w-full items-center justify-center rounded-lg border border-white/10 bg-navy font-mono text-xs uppercase tracking-widest text-mist sm:aspect-[16/10]" role="status">Preparando o visualizador…</div>}>
      <PropertyViewer3D {...props} />
    </Suspense>
  );
}
