import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useSkyline } from '../../state/store';
import { orbitLimits } from './views';

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

interface Anim {
  fromPos: Vector3;
  fromTarget: Vector3;
  toPos: Vector3;
  toTarget: Vector3;
  start: number;
  duration: number;
  posCurve?: CatmullRomCurve3;
  targetCurve?: CatmullRomCurve3;
}

/** Estado do rig (lido pelos testes): último pedido atendido e se há transição em curso. */
export const rigState = { handled: -1, animating: false };

const _v = new Vector3();
const _min = new Vector3();
const _max = new Vector3();

/**
 * Controle de câmera: órbita livre (OrbitControls) com limites por modo, transições suaves
 * com easing, percursos cinematográficos, órbita automática e deslocamento do enquadramento
 * para que os painéis da interface não cubram o edifício.
 */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const anim = useRef<Anim | null>(null);
  const lastId = useRef(-1);
  const offset = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Interação do visitante cancela a transição e pausa a apresentação guiada.
  useEffect(() => {
    const ctl = controls.current;
    if (!ctl) return;
    const onStart = () => {
      anim.current = null;
      const s = useSkyline.getState();
      if (s.orbitSpeed !== 0) s.setOrbitSpeed(0);
      if (s.tour.active && !s.tour.paused) s.setTour({ paused: true });
    };
    ctl.addEventListener('start', onStart);
    return () => ctl.removeEventListener('start', onStart);
  }, []);

  useFrame((state, delta) => {
    const ctl = controls.current;
    if (!ctl) return;
    const s = useSkyline.getState();
    const now = state.clock.elapsedTime;

    if (s.camera.id !== lastId.current) {
      lastId.current = s.camera.id;
      rigState.handled = s.camera.id;
      const req = s.camera;
      if (req.path && req.path.length > 1) {
        const posCurve = new CatmullRomCurve3([camera.position.clone(), ...req.path.map((p) => new Vector3(...p.position))], false, 'centripetal');
        const targetCurve = new CatmullRomCurve3([ctl.target.clone(), ...req.path.map((p) => new Vector3(...p.target))], false, 'centripetal');
        anim.current = { fromPos: camera.position.clone(), fromTarget: ctl.target.clone(), toPos: posCurve.getPoint(1), toTarget: targetCurve.getPoint(1), start: now, duration: req.duration, posCurve, targetCurve };
      } else if (req.shot) {
        const toPos = new Vector3(...req.shot.position);
        const toTarget = new Vector3(...req.shot.target);
        // telas em retrato (celular): recua a câmera para o enquadramento caber na largura
        const dist = toPos.distanceTo(toTarget);
        if (camera.aspect < 0.95 && dist > 5) {
          const k = Math.min(1.9, Math.pow(1 / camera.aspect, 0.8));
          toPos.sub(toTarget).multiplyScalar(k).add(toTarget);
        }
        if (req.duration <= 0.02) {
          camera.position.copy(toPos);
          ctl.target.copy(toTarget);
          anim.current = null;
        } else {
          anim.current = { fromPos: camera.position.clone(), fromTarget: ctl.target.clone(), toPos, toTarget, start: now, duration: req.duration };
        }
      }
    }

    const lim = orbitLimits(s.mode, { exploded: s.exploded, gap: s.explodeGap, apartmentView: s.apartmentView, garageView: s.garageView });
    const a = anim.current;
    if (a) {
      // a apresentação guiada pausada congela o percurso
      if (s.tour.active && s.tour.paused) {
        a.start += delta;
      }
      const t = Math.min(1, (now - a.start) / a.duration);
      if (a.posCurve && a.targetCurve) {
        const e = easeInOutSine(t);
        a.posCurve.getPoint(e, camera.position);
        a.targetCurve.getPoint(e, ctl.target);
      } else {
        const e = easeInOutCubic(t);
        camera.position.lerpVectors(a.fromPos, a.toPos, e);
        // arco suave: sobe um pouco no meio de deslocamentos longos
        const dist = a.fromPos.distanceTo(a.toPos);
        camera.position.y += Math.sin(Math.PI * e) * Math.min(dist * 0.08, 40);
        ctl.target.lerpVectors(a.fromTarget, a.toTarget, e);
      }
      if (t >= 1) anim.current = null;
      rigState.animating = anim.current !== null;
    } else {
      rigState.animating = false;
      const paused = s.tour.active && s.tour.paused;
      let speed = paused ? 0 : s.orbitSpeed;
      if (!speed && s.page === 'home' && !s.reducedMotion) speed = 0.035;
      if (speed) {
        _v.copy(camera.position).sub(ctl.target);
        _v.applyAxisAngle(new Vector3(0, 1, 0), speed * Math.min(delta, 0.05));
        camera.position.copy(ctl.target).add(_v);
      }
      _min.set(...lim.targetMin);
      _max.set(...lim.targetMax);
      ctl.target.clamp(_min, _max);
      if (camera.position.y < lim.minY) camera.position.y = lim.minY;
    }

    ctl.minDistance = a ? 0 : lim.minDistance;
    ctl.maxDistance = a ? Infinity : lim.maxDistance;
    ctl.minPolarAngle = lim.minPolar;
    ctl.maxPolarAngle = lim.maxPolar;
    ctl.enablePan = s.mode !== 'apartment' || s.apartmentView !== 'interior';
    ctl.enableZoom = !(s.mode === 'apartment' && s.apartmentView === 'interior') && !(s.mode === 'garage' && s.garageView === 'street');
    ctl.rotateSpeed = s.mode === 'apartment' && s.apartmentView === 'interior' ? -0.35 : s.mode === 'garage' && s.garageView === 'street' ? -0.35 : 0.6;

    // lente mais aberta dentro dos ambientes (apartamento e garagem ao nível do piso)
    const inside = (s.mode === 'apartment' && s.apartmentView === 'interior') || (s.mode === 'garage' && s.garageView === 'street');
    const fov = inside ? 62 : 38;
    if (Math.abs(camera.fov - fov) > 0.05) {
      camera.fov += (fov - camera.fov) * (s.reducedMotion ? 1 : 1 - Math.exp(-delta * 3));
      camera.updateProjectionMatrix();
    }

    // plano de recorte próximo adaptado à distância (interiores pedem near pequeno)
    const dist = camera.position.distanceTo(ctl.target);
    const near = Math.min(2, Math.max(0.03, dist * 0.01));
    if (Math.abs(camera.near - near) / camera.near > 0.15) {
      camera.near = near;
      camera.updateProjectionMatrix();
    }

    // desloca o centro óptico para a área livre entre os painéis
    const dx = (s.insets.left - s.insets.right) / 2;
    const dy = s.insets.bottom / 2;
    const o = offset.current;
    if (o.x !== dx || o.y !== dy || o.w !== size.width || o.h !== size.height) {
      offset.current = { x: dx, y: dy, w: size.width, h: size.height };
      if (dx === 0 && dy === 0) camera.clearViewOffset();
      else camera.setViewOffset(size.width, size.height, -dx, dy, size.width, size.height);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={0.8}
      panSpeed={0.7}
      screenSpacePanning
      minDistance={20}
      maxDistance={700}
    />
  );
}
