import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { FLOOR_COUNT, floorBaseY } from '../../data/building';
import { useSkyline } from '../../state/store';
import { QUALITY } from '../../config/performance';
import { CATEGORIES, bump, floorRuntime as rt, type Category } from './floorRuntime';

function damp(cur: number, target: number, lambda: number, dt: number) {
  return cur + (target - cur) * (1 - Math.exp(-lambda * dt));
}

/**
 * Anima todos os pavimentos num único lugar: vista explodida, corte (pavimentos acima do
 * selecionado "decolam"), revelação inicial, visibilidade por categoria e onda de luz noturna.
 */
export function FloorAnimator() {
  const camera = useThree((s) => s.camera);
  const gapRef = useRef(useSkyline.getState().explodeGap);
  const revealStart = useRef<number | null>(null);
  const lastNight = useRef(false);
  const nightStart = useRef(0);

  useFrame((state, delta) => {
    const s = useSkyline.getState();
    const dt = Math.min(delta, 0.25);
    const reduced = s.reducedMotion;
    const t = state.clock.elapsedTime;
    let changed = false;
    const set = (arr: Float32Array, i: number, v: number) => {
      // Float32Array guarda floats de 32 bits: compara já arredondado para não "mudar" todo quadro.
      const fv = Math.fround(v);
      if (arr[i] !== fv) {
        arr[i] = fv;
        changed = true;
      }
    };

    // revelação progressiva (de baixo para cima) assim que a cena fica pronta
    if (s.ready && revealStart.current === null) revealStart.current = t;
    const rs = revealStart.current;

    const explodeTarget = s.exploded ? 1 : 0;
    const e = reduced ? explodeTarget : damp(rt.explode, explodeTarget, 3.2, dt);
    if (Math.abs(e - rt.explode) > 1e-5) {
      rt.explode = Math.abs(e - explodeTarget) < 1e-4 ? explodeTarget : e;
      changed = true;
    }
    const g = reduced ? s.explodeGap : damp(gapRef.current, s.explodeGap, 6, dt);
    if (Math.abs(g - gapRef.current) > 1e-5) {
      gapRef.current = Math.abs(g - s.explodeGap) < 1e-4 ? s.explodeGap : g;
      changed = true;
    }

    // Corte: os pavimentos acima do selecionado "decolam" (exceto na vista interna do apartamento,
    // que mantém o teto e a pele de vidro para a sensação de estar dentro do ambiente).
    const cut = s.mode === 'garage'
      ? 0
      : (s.mode === 'floor' && !s.exploded) || (s.mode === 'apartment' && s.apartmentView !== 'interior') ? s.selectedFloor : null;
    const focus = s.mode === 'floor' || s.mode === 'apartment' ? s.selectedFloor : null;
    const night = s.timeOfDay === 'night' ? 1 : s.timeOfDay === 'sunset' ? 0.45 : 0;
    const isNight = night > 0;
    if (isNight && !lastNight.current) nightStart.current = t;
    lastNight.current = isNight;
    const wave = reduced ? 2 : (t - nightStart.current) / 2.6;
    if (Math.abs(rt.night - night) > 1e-3) {
      rt.night = reduced ? night : damp(rt.night, night, 2.5, dt);
      changed = true;
    }

    const q = QUALITY[s.quality];
    const camDist = Math.hypot(camera.position.x, camera.position.y - 70, camera.position.z);
    const detail = camDist < q.detailDistance ? 1 : 0;
    const L = s.layers;
    const facadeOn = L.facade && !L.technical;
    const anyInterior = !L.facade || L.technical || s.exploded || cut !== null || camDist < 95;

    for (let n = 1; n <= FLOOR_COUNT; n++) {
      // revelação
      const rv = rs === null ? 0 : reduced ? 1 : Math.min(1, Math.max(0, (t - rs - (n - 1) * 0.035) / 0.55));
      const rve = rv * rv * (3 - 2 * rv);
      set(rt.reveal, n, rve);

      // corte acima do pavimento selecionado
      const liftT = cut !== null && n > cut ? 1 : 0;
      const lv = reduced ? liftT : damp(rt.lift[n], liftT, 4.5, dt);
      set(rt.lift, n, Math.abs(lv - liftT) < 2e-3 ? liftT : lv);

      const above = cut !== null ? n - cut : 0;
      const y = floorBaseY(n) + (n - 1) * gapRef.current * rt.explode + rt.lift[n] * (16 + above * 1.4);
      set(rt.y, n, y);

      const glassT = facadeOn && cut !== n ? 1 : 0;
      const targets: Record<Category, number> = {
        structure: 1,
        finish: 1,
        glass: glassT,
        facadeMetal: glassT * detail,
        railing: detail,
        interior: (anyInterior && detail) || focus === n ? 1 : 0,
        glow: glassT * (n / FLOOR_COUNT < wave ? 1 : 0) * (isNight ? 1 : 0) * (focus === n ? 0 : 1),
      };
      for (const c of CATEGORIES) {
        const tgt = targets[c];
        rt.tgt[c][n] = tgt;
        const cur = rt.cur[c][n];
        if (cur !== tgt) {
          const speed = c === 'glass' || c === 'facadeMetal' ? 5 : c === 'glow' ? 3 : 9;
          const v = reduced ? tgt : damp(cur, tgt, speed, dt);
          set(rt.cur[c], n, Math.abs(v - tgt) < 2e-3 ? tgt : v);
        }
      }
    }

    const sel = s.selectedFloor ?? -1;
    const hov = s.hoveredFloor ?? -1;
    if (sel !== rt.selected || hov !== rt.hovered) {
      rt.selected = sel;
      rt.hovered = hov;
      changed = true;
    }
    if (changed) bump();
  }, -2);

  return null;
}
