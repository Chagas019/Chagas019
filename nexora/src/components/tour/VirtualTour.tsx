/**
 * Visita virtual por panoramas 360° (imagens equirretangulares 2:1).
 * Arraste para olhar em volta, use as setas para ir a outro ambiente ou escolha na lista.
 */
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { ScreenProjector } from '@/components/viewer3d/ScreenProjector';
import * as THREE from 'three';
import { ArrowUp } from 'lucide-react';
import type { Panorama } from '@/types/property';
import { hasWebGL } from '@/components/viewer3d/webgl';

/** Ajuste entre o yaw dos dados (0 = centro da imagem) e a orientação do fundo equirretangular do three.js */
const YAW_OFFSET = 0;

/** Converte yaw/pitch (graus; yaw 0 = centro da imagem) em direção 3D */
export function dirFromYawPitch(yaw: number, pitch: number, r = 8): [number, number, number] {
  const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
  return [Math.sin(y) * Math.cos(p) * r, Math.sin(p) * r, -Math.cos(y) * Math.cos(p) * r];
}

function Pano({ pano, onLoaded }: { pano: Panorama; onLoaded: () => void }) {
  const tex = useTexture(pano.src);
  const { scene } = useThree();
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.background = tex;
    onLoaded();
    return () => { scene.background = null; };
  }, [tex, scene, onLoaded]);
  return null;
}

function FovZoom() {
  const { camera, gl } = useThree();
  useEffect(() => {
    const el = gl.domElement;
    const on = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camera as THREE.PerspectiveCamera;
      cam.fov = THREE.MathUtils.clamp(cam.fov + e.deltaY * 0.04, 35, 95);
      cam.updateProjectionMatrix();
    };
    el.addEventListener('wheel', on, { passive: false });
    return () => el.removeEventListener('wheel', on);
  }, [camera, gl]);
  return null;
}

export function VirtualTour({ panoramas, initial, onRoomChange }: { panoramas: Panorama[]; initial?: string; onRoomChange?: (roomId: string) => void }) {
  const [current, setCurrent] = useState(initial && panoramas.some((p) => p.roomId === initial) ? initial : panoramas[0].roomId);
  const pano = panoramas.find((p) => p.roomId === current)!;
  const names = useMemo(() => Object.fromEntries(panoramas.map((p) => [p.roomId, p.name])), [panoramas]);
  const wrap = useRef<HTMLDivElement>(null);
  const anchors = useRef(new Map<string, HTMLElement | null>());
  const [loaded, setLoaded] = useState<string>();
  const points = useMemo(() => Object.fromEntries(pano.links.map((l) => [l.to, dirFromYawPitch(l.yaw + YAW_OFFSET, Math.max(-25, l.pitch - 12))])), [pano]);
  useEffect(() => { if (initial && panoramas.some((p) => p.roomId === initial)) setCurrent(initial); }, [initial, panoramas]);
  const go = (id: string) => { setCurrent(id); onRoomChange?.(id); };

  if (!hasWebGL()) {
    return <p className="surface p-6 text-sm text-muted">A visita 360° precisa de WebGL, que não está disponível neste navegador.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div ref={wrap} className="relative aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-navy sm:aspect-[16/9] lg:col-span-9" role="region" aria-label={`Visita 360°: ${pano.name}`}>
        <Canvas camera={{ fov: 75, position: [0, 0, 0.01] }} dpr={[1, 1.75]}>
          <Suspense fallback={null}>
            <Pano key={pano.roomId} pano={pano} onLoaded={() => setLoaded(pano.roomId)} />
          </Suspense>
          <ScreenProjector points={points} anchors={anchors} />
          <OrbitControls enableZoom={false} enablePan={false} rotateSpeed={-0.35} enableDamping dampingFactor={0.1} />
          <FovZoom />
        </Canvas>
        {loaded !== pano.roomId && <p className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-xs uppercase tracking-widest text-mist" role="status">Carregando panorama…</p>}
        <div role="group" aria-label="Ir para outro ambiente" className="pointer-events-none absolute inset-0 overflow-hidden">
          {pano.links.map((l) => (
            <button key={`${pano.roomId}-${l.to}`} ref={(el) => { anchors.current.set(l.to, el); }} type="button" style={{ visibility: 'hidden' }} onClick={() => go(l.to)} className="group pointer-events-auto absolute left-0 top-0 flex flex-col items-center gap-1.5 text-paper" aria-label={`Ir para ${names[l.to] ?? l.to}`}>
              <span className="flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-ink/50 backdrop-blur-md transition group-hover:scale-110 group-hover:bg-signal"><ArrowUp size={20} /></span>
              <span className="whitespace-nowrap rounded-sm bg-ink/70 px-2 py-0.5 text-[11px] backdrop-blur">{names[l.to] ?? l.to}</span>
            </button>
          ))}
        </div>
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-ink/70 px-3 py-2 text-paper backdrop-blur" aria-live="polite">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-mist">Você está em</p>
          <p className="text-sm font-medium">{pano.name}</p>
        </div>
        {pano.demonstrative && <p className="pointer-events-none absolute bottom-3 left-3 rounded-sm bg-ink/60 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-paper/80">Panorama demonstrativo renderizado do modelo ilustrativo</p>}
        <p className="pointer-events-none absolute bottom-3 right-3 hidden font-mono text-[10px] uppercase tracking-wider text-paper/60 sm:block">Arraste para olhar em volta · roda para zoom</p>
      </div>
      <nav aria-label="Ambientes da visita" className="lg:col-span-3">
        <h3 className="eyebrow mb-3">Ambientes disponíveis</h3>
        <ul className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          {panoramas.map((p) => (
            <li key={p.roomId}>
              <button type="button" aria-current={p.roomId === current ? 'location' : undefined} onClick={() => go(p.roomId)} className={`flex min-h-[44px] w-full items-center justify-between rounded border px-3 text-left text-sm transition hairline ${p.roomId === current ? 'border-signal bg-signal/10 text-signal' : 'hover:bg-fg/5'}`}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
