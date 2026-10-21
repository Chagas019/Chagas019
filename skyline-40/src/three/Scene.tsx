import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { useSkyline } from '../state/store';
import { QUALITY, type Quality } from '../config/performance';
import { Building } from './building/Building';
import { FloorAnimator } from './building/FloorAnimator';
import { Rooftop } from './rooftop/Rooftop';
import { CameraRig, rigState } from './camera/CameraRig';
import { SkyAndLights } from './environment/SkyAndLights';
import { Site } from './environment/Site';
import { City } from './environment/City';
import { ApartmentInterior } from './apartment/ApartmentInterior';
import { disposeTextures } from './textures';
import { floorRuntime } from './building/floorRuntime';

// Partes carregadas sob demanda (código separado, baixado só quando necessário).
const Garage = lazy(() => import('./garage/Garage'));
const Effects = lazy(() => import('./Effects'));

const DOWNGRADE: Record<Quality, Quality> = { high: 'medium', medium: 'low', low: 'low' };

/** Sinaliza "pronto" depois que os primeiros quadros foram renderizados (shaders compilados). */
function ReadySignal() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    // pré-compila os materiais para evitar engasgos na primeira interação
    try {
      gl.compile(scene, camera);
    } catch {
      /* compilação antecipada é opcional */
    }
    const tick = () => {
      frames++;
      if (frames >= 3) useSkyline.getState().setReady(true);
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [gl, scene, camera]);
  return null;
}

/** Ganchos de inspeção usados pelos testes de ponta a ponta (somente leitura). */
function DebugHook() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const get = useThree((s) => s.get);
  useEffect(() => {
    (window as unknown as { __skylineGL?: unknown }).__skylineGL = {
      info: () => ({ frame: gl.info.render.frame, calls: gl.info.render.calls, triangles: gl.info.render.triangles, geometries: gl.info.memory.geometries, textures: gl.info.memory.textures, programs: gl.info.programs?.length ?? 0 }),
      scene,
      runtime: floorRuntime,
      rig: rigState,
      camera: () => {
        const c = get().camera;
        const ctl = get().controls as unknown as { target?: { toArray(): number[] } } | null;
        return { position: c.position.toArray(), target: ctl?.target?.toArray() ?? null };
      },
      /** Soma das instâncias visíveis (escala ≠ 0) dos InstancedMesh cujo nome começa com o prefixo. */
      instances: (prefix: string) => {
        let total = 0;
        let visible = 0;
        scene.traverse((o) => {
          const m = o as unknown as { isInstancedMesh?: boolean; count: number; name: string; instanceMatrix: { array: Float32Array } };
          if (!m.isInstancedMesh || !m.name.startsWith(prefix)) return;
          total += m.count;
          for (let i = 0; i < m.count; i++) if (Math.abs(m.instanceMatrix.array[i * 16 + 5]) > 1e-3) visible++;
        });
        return { total, visible };
      },
      count: (name: string) => {
        let n = 0;
        scene.traverse((o) => { if (o.name === name) n++; });
        return n;
      },
    };
  }, [gl, scene, get]);
  return null;
}

export function SceneContents() {
  const mode = useSkyline((s) => s.mode);
  const floor = useSkyline((s) => s.selectedFloor);
  const unit = useSkyline((s) => s.selectedUnit);
  const context = useSkyline((s) => s.layers.context);
  const quality = useSkyline((s) => s.quality);
  // a garagem só existe na memória enquanto o modo estiver ativo (e é liberada ao sair)
  const showGarage = mode === 'garage';

  return (
    <>
      <SkyAndLights />
      <FloorAnimator />
      <Building />
      <Rooftop />
      <Site />
      {context && <City />}
      {mode === 'apartment' && floor && unit && <ApartmentInterior floor={floor} unitId={unit} />}
      <Suspense fallback={null}>{showGarage && <Garage />}</Suspense>
      <Suspense fallback={null}>{QUALITY[quality].postprocessing && <Effects />}</Suspense>
      <CameraRig />
    </>
  );
}

export default function Scene() {
  const quality = useSkyline((s) => s.quality);
  const page = useSkyline((s) => s.page);
  const q = QUALITY[quality];
  const [visible, setVisible] = useState(!document.hidden);
  const [heroOnScreen, setHeroOnScreen] = useState(true);
  const wrap = useRef<HTMLDivElement>(null);

  // pausa o render com a aba oculta ou quando o início foi rolado para baixo
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  useEffect(() => {
    if (page !== 'home') {
      setHeroOnScreen(true);
      return;
    }
    const onScroll = () => setHeroOnScreen(window.scrollY < window.innerHeight * 1.05);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [page]);
  useEffect(() => () => disposeTextures(), []);

  const active = visible && heroOnScreen;

  return (
    <div ref={wrap} className="scene" aria-label="Maquete 3D interativa do edifício SKYLINE 40" role="img">
      <Canvas
        shadows={q.shadows}
        dpr={q.dpr}
        frameloop={active ? 'always' : 'never'}
        camera={{ fov: 38, near: 0.5, far: 9000, position: [520, 260, 640] }}
        gl={{ antialias: q.antialias, powerPreference: 'high-performance', alpha: false, stencil: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.outputColorSpace = SRGBColorSpace;
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            useSkyline.getState().setWebglFailed('O navegador interrompeu o contexto gráfico (memória de vídeo insuficiente ou aba em segundo plano por muito tempo).');
          });
        }}
        onPointerMissed={() => useSkyline.getState().hoverFloor(null)}
      >
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => {
            const s = useSkyline.getState();
            if (!s.autoQuality || s.quality === 'low') return;
            const next = DOWNGRADE[s.quality];
            s.setQuality(next, true);
            s.notify(`Qualidade gráfica ajustada automaticamente para manter a fluidez.`);
          }}
        />
        <SceneContents />
        <ReadySignal />
        <DebugHook />
      </Canvas>
    </div>
  );
}
