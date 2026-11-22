/**
 * Visualizador arquitetônico 3D (React Three Fiber + Drei). Carregado sob demanda (lazy) e só depois que
 * a pessoa pede. Componentes: PropertyModel, CameraControls, RoomHotspots, LightingControls, ViewerToolbar, ViewerFallback.
 */
import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { useProgress } from '@react-three/drei';
import * as THREE from 'three';
import type { Media, Model3D } from '@/types/property';
import { PropertyModel, type ModelInfo } from './PropertyModel';
import { ViewerToolbar } from './ViewerToolbar';
import { ViewerFallback } from './ViewerFallback';
import { hasWebGL } from './webgl';
import { ScreenProjector } from './ScreenProjector';
import { RoomHotspots } from './RoomHotspots';
import { CameraControls } from './CameraControls';
import { LightingControls } from './LightingControls';

export interface ViewerProps {
  model: Model3D;
  title: string;
  poster?: Media;
  selectedRoom?: string;
  onSelectRoom?: (roomId: string | undefined) => void;
  reducedMotion?: boolean;
  onGallery?: () => void;
  /** Rótulos de pavimentos (id → nome) */
  levelNames?: Record<string, string>;
}

export default function PropertyViewer3D(props: ViewerProps) {
  const [attempt, setAttempt] = useState(0);
  if (!hasWebGL()) return <ViewerFallback reason="sem-webgl" poster={props.poster} onGallery={props.onGallery} />;
  return (
    <ErrorBoundary key={attempt} fallback={<ViewerFallback reason="erro" poster={props.poster} onGallery={props.onGallery} onRetry={() => setAttempt((n) => n + 1)} />}>
      <Viewer {...props} />
    </ErrorBoundary>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err: unknown) { console.warn('[viewer3d]', err); }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function Viewer({ model, title, selectedRoom, onSelectRoom, reducedMotion, levelNames = {} }: ViewerProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const [night, setNight] = useState(false);
  const [cut, setCut] = useState<string | null>(null);
  const [labels, setLabels] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [help, setHelp] = useState(true);
  const [info, setInfo] = useState<ModelInfo>({ levels: [] });
  const [resetKey, setResetKey] = useState(0);

  const preset = selectedRoom ? model.rooms[selectedRoom] : undefined;

  // ao entrar num ambiente interno de um pavimento, corta o que está acima para que a câmera veja o cômodo
  useEffect(() => {
    if (preset?.interior && preset.level && info.levels.length > 1) setCut(preset.level);
  }, [preset, info.levels.length]);

  useEffect(() => {
    const on = () => setFullscreen(document.fullscreenElement === wrap.current);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggleFullscreen = useCallback(async () => {
    const el = wrap.current;
    if (!el) return;
    if (document.fullscreenElement) { await document.exitFullscreen(); return; }
    if (el.requestFullscreen) { try { await el.requestFullscreen(); return; } catch { /* iOS */ } }
    setFullscreen((v) => !v); // alternativa sem API (Safari no iPhone): ocupa a tela com CSS
  }, []);
  useEffect(() => {
    if (!fullscreen || document.fullscreenElement) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setFullscreen(false);
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [fullscreen]);

  const reset = () => { onSelectRoom?.(undefined); setCut(null); setResetKey((n) => n + 1); };
  // Vista externa: só áreas externas (evita amontoar rótulos). Com corte: os ambientes daquele pavimento.
  const shownRooms = Object.fromEntries(Object.entries(model.rooms).filter(([id, r]) => id === selectedRoom || (cut ? r.level === cut || (!r.level && !r.interior) : !r.interior)));
  const anchors = useRef(new Map<string, HTMLElement | null>());
  const points = Object.fromEntries(Object.entries(shownRooms).map(([id, r]) => [id, [r.target[0], r.target[1] + 0.6, r.target[2]] as [number, number, number]]));
  const pick = (id: string | undefined) => { setHelp(false); onSelectRoom?.(id && id === selectedRoom ? undefined : id); };

  return (
    <div
      ref={wrap}
      className={`relative overflow-hidden bg-[#0b1220] text-paper ${fullscreen ? 'fixed inset-0 z-[95] rounded-none' : 'aspect-[4/5] min-h-[420px] w-full rounded-lg border border-white/10 sm:aspect-[16/10]'}`}
      role="region"
      aria-label={`Visualizador 3D de ${title}`}
    >
      <Canvas
        shadows
        dpr={[1, 1.75]}
        camera={{ position: model.initialView.position, fov: 42, near: 0.1, far: 600 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.85; }}
        frameloop="always"
      >
        <color attach="background" args={[night ? '#0b1220' : '#cfdbe7']} />
        <fog attach="fog" args={[night ? '#0b1220' : '#cfdbe7', 60, 220]} />
        <LightingControls night={night} rooms={model.rooms} />
        <Suspense fallback={null}>
          <PropertyModel url={model.url} cutLevel={cut} night={night} onInfo={setInfo} />
        </Suspense>
        <CameraControls key={resetKey} model={model} preset={preset} autoRotate={autoRotate && !reducedMotion && !preset} />
        {labels && <ScreenProjector points={points} anchors={anchors} />}
      </Canvas>

      <Loader />
      {labels && <RoomHotspots rooms={shownRooms} selected={selectedRoom} onSelect={pick} anchors={anchors} />}

      <label className="absolute right-3 top-3 z-10">
        <span className="sr-only">Ir para um ambiente</span>
        <select className="min-h-[40px] max-w-[11rem] rounded border border-white/15 bg-ink/70 px-3 text-[13px] text-paper backdrop-blur-md" value={selectedRoom ?? ''} onChange={(e) => pick(e.target.value || undefined)}>
          <option value="">Ir para ambiente…</option>
          {Object.entries(model.rooms).map(([id, r]) => <option key={id} value={id}>{r.label}{r.level && levelNames[r.level] && Object.keys(levelNames).length > 1 ? ` (${levelNames[r.level]})` : ''}</option>)}
        </select>
      </label>

      <ViewerToolbar
        night={night}
        onNight={model.hasNightLighting ? () => setNight((v) => !v) : undefined}
        levels={info.levels.map((id) => ({ id, name: levelNames[id] ?? id }))}
        cut={cut}
        onCut={setCut}
        labels={labels}
        onLabels={() => setLabels((v) => !v)}
        autoRotate={autoRotate}
        onAutoRotate={reducedMotion ? undefined : () => setAutoRotate((v) => !v)}
        fullscreen={fullscreen}
        onFullscreen={toggleFullscreen}
        onReset={reset}
        onHelp={() => setHelp((v) => !v)}
      />

      {preset && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[70%] rounded-lg border border-white/10 bg-ink/70 px-3 py-2 backdrop-blur" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">{preset.interior ? 'Ambiente interno' : 'Área externa'}{preset.level && levelNames[preset.level] ? ` · ${levelNames[preset.level]}` : ''}</p>
          <p className="text-sm font-medium">{preset.label}</p>
        </div>
      )}

      {help && (
        <div className="absolute inset-x-3 bottom-16 z-20 mx-auto max-w-md rounded-lg border border-white/10 bg-ink/85 p-4 text-[13px] backdrop-blur sm:bottom-[4.5rem]" role="note">
          <p className="font-medium">Como explorar</p>
          <ul className="mt-2 space-y-1 text-paper/75">
            <li><span className="hidden sm:inline">Arraste com o botão esquerdo para girar · direito para mover · roda para aproximar</span><span className="sm:hidden">Um dedo gira · dois dedos movem e aproximam</span></li>
            <li>Toque nos marcadores para ir a cada ambiente; use o corte para ver o interior de cada pavimento.</li>
          </ul>
          <button type="button" className="mt-3 text-xs text-signal-soft hover:underline" onClick={() => setHelp(false)}>Entendi</button>
        </div>
      )}

      {model.demonstrative && (
        <p className="pointer-events-none absolute left-3 top-14 font-mono text-[10px] uppercase tracking-wider text-paper/60 sm:top-auto sm:bottom-16">{model.credits ?? 'Modelo demonstrativo'}</p>
      )}
    </div>
  );
}

function Loader() {
  const { progress, active } = useProgress();
  if (!active && progress >= 100) return null;
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" role="status" aria-label="Carregando modelo 3D">
      <div className="flex w-48 flex-col items-center gap-3 text-paper">
        <div className="h-px w-full overflow-hidden bg-white/15"><div className="h-full bg-signal transition-[width]" style={{ width: `${progress}%` }} /></div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-mist">Carregando modelo · {Math.round(progress)}%</p>
      </div>
    </div>
  );
}

