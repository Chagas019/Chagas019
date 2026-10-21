import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, EdgesGeometry, Group, InstancedMesh, LineBasicMaterial,
  LineSegments, Matrix4, MeshBasicMaterial, MeshStandardMaterial, Quaternion, Vector3,
} from 'three';
import { FLOORS, FLOOR_COUNT, floorHeight, floorLabel, floorSector, floorVariant, getFloorInfo, type FloorVariant, BUILDING } from '../../data/building';
import { UNITS } from '../../data/apartment';
import { useSkyline } from '../../state/store';
import { MAT } from '../materials';
import { rng } from '../utils/geo';
import { buildFloorModule, disposeModule } from './floorGeometry';
import { FloorInstances } from './FloorInstances';
import { floorRuntime as rt, visibility } from './floorRuntime';

const VARIANTS: FloorVariant[] = ['lobby', 'podium', 'typical', 'upper', 'crown'];
const techCore = new MeshStandardMaterial({ color: '#4f7fd9', roughness: 0.6, metalness: 0.1, emissive: '#16305f', emissiveIntensity: 0.35 });
const techStructure = new MeshStandardMaterial({ color: '#cfd8e6', roughness: 0.7 });
const ledMat = new MeshBasicMaterial({ color: '#dfe9ff', toneMapped: false });

export function Building() {
  const technical = useSkyline((s) => s.layers.technical);
  const modules = useMemo(() => Object.fromEntries(VARIANTS.map((v) => [v, buildFloorModule(v)])) as Record<FloorVariant, ReturnType<typeof buildFloorModule>>, []);
  const floorsBy = useMemo(() => Object.fromEntries(VARIANTS.map((v) => [v, FLOORS.filter((n) => floorVariant(n) === v)])) as Record<FloorVariant, number[]>, []);

  useEffect(() => () => VARIANTS.forEach((v) => disposeModule(modules[v])), [modules]);

  return (
    <group name="skyline-building">
      {VARIANTS.map((v) => {
        const m = modules[v];
        const floors = floorsBy[v];
        return (
          <group key={v} name={`variant-${v}`}>
            <FloorInstances name={`structure-${v}`} floors={floors} geometry={m.structure} material={technical ? techStructure : MAT.concrete} category="structure" pickable tint castShadow receiveShadow />
            <FloorInstances floors={floors} geometry={m.core} material={technical ? techCore : MAT.core} category="structure" castShadow receiveShadow />
            <FloorInstances name={`glass-${v}`} floors={floors} geometry={m.glass} material={MAT.glass} category="glass" pickable tint />
            <FloorInstances floors={floors} geometry={m.facadeMetal} material={v === 'podium' ? MAT.bronze : MAT.metal} category="facadeMetal" castShadow />
            <FloorInstances floors={floors} geometry={m.railing} material={MAT.railGlass} category="railing" />
            <FloorInstances floors={floors} geometry={m.handrail} material={MAT.metalLight} category="railing" />
            <FloorInstances floors={floors} geometry={m.interior} material={MAT.interiorWall} category="interior" receiveShadow castShadow />
            <FloorInstances floors={floors} geometry={m.led} material={ledMat} category="structure" />
            <FloorInstances floors={floors} geometry={m.finish} material={v === 'typical' || v === 'upper' ? MAT.wood : MAT.stone} category="finish" pickable receiveShadow />
          </group>
        );
      })}
      <LedDriver />
      <WindowGlow />
      <SelectionFrame />
      <UnitHighlight />
      <FloorLabels />
      {technical && <ElevatorCabins />}
    </group>
  );
}

/** Intensidade dos frisos de LED: acompanha a noite e a camada "Iluminação". */
function LedDriver() {
  useFrame(() => {
    const on = useSkyline.getState().layers.archLights;
    ledMat.color.set('#dfe9ff').multiplyScalar(on ? 0.18 + rt.night * 1.9 : 0.12);
  });
  return null;
}

/** Luz interna das unidades à noite: uma instância por unidade (160), acendendo de baixo para cima. */
function WindowGlow() {
  const ref = useRef<InstancedMesh>(null);
  const last = useRef(-1);
  const geometry = useMemo(() => {
    const g = new BoxGeometry(13.2, 2.85, 6.9);
    g.translate(0.6 + 6.6, 0.1 + 1.425, 2.9 + 3.45);
    return g;
  }, []);
  const items = useMemo(() => {
    const rand = rng(4040);
    const warm = new Color('#ffcf94');
    const neutral = new Color('#fff0d8');
    const cool = new Color('#e4efff');
    return FLOORS.flatMap((n) =>
      UNITS.map((u) => {
        const amenity = n <= 3 || n === FLOOR_COUNT;
        const on = amenity || rand() > 0.28;
        // luz aditiva: valores moderados (as duas faces da caixa somam)
        const k = amenity ? 0.8 : on ? 0.42 + rand() * 0.45 : 0.02;
        const base = amenity ? cool : rand() > 0.5 ? warm : neutral;
        return { n, sx: u.sx, sz: u.sz, color: base.clone().multiplyScalar(k), hScale: floorHeight(n) / BUILDING.typicalHeight };
      }),
    );
  }, []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || last.current === rt.version) return;
    last.current = rt.version;
    const m = new Matrix4();
    const p = new Vector3();
    const s = new Vector3();
    const q = new Quaternion();
    const c = new Color();
    items.forEach((it, i) => {
      const v = visibility('glow', it.n);
      p.set(0, rt.y[it.n], 0);
      if (v < 0.01) s.set(0, 0, 0);
      else s.set(it.sx, it.hScale * Math.min(1, rt.reveal[it.n]), it.sz);
      m.compose(p, q, s);
      mesh.setMatrixAt(i, m);
      c.copy(it.color).multiplyScalar(v);
      mesh.setColorAt(i, c);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, MAT.glow, items.length]} frustumCulled={false} raycast={() => null} />;
}

/** Moldura luminosa ao redor do pavimento selecionado (e um contorno sutil no pavimento sob o cursor). */
function SelectionFrame() {
  const sel = useRef<LineSegments>(null);
  const hov = useRef<LineSegments>(null);
  const geo = useMemo(() => {
    const b = new BoxGeometry(BUILDING.halfX * 2 + 1.2, 1, BUILDING.halfZ * 2 + 5.2);
    const e = new EdgesGeometry(b);
    b.dispose();
    return e;
  }, []);
  const selMat = useMemo(() => new LineBasicMaterial({ color: '#7fb0ff', transparent: true, opacity: 0.95, toneMapped: false }), []);
  const hovMat = useMemo(() => new LineBasicMaterial({ color: '#dbe7ff', transparent: true, opacity: 0.45, toneMapped: false }), []);
  useEffect(() => () => { geo.dispose(); selMat.dispose(); hovMat.dispose(); }, [geo, selMat, hovMat]);

  useFrame((state) => {
    const place = (obj: LineSegments | null, n: number) => {
      if (!obj) return;
      if (n < 1 || visibility('structure', n) < 0.05) {
        obj.visible = false;
        return;
      }
      const h = floorHeight(n);
      obj.visible = true;
      obj.position.set(0, rt.y[n] + h / 2 - 0.2, 0);
      obj.scale.set(1, h + 0.1, 1);
    };
    place(sel.current, rt.selected);
    place(hov.current, rt.hovered !== rt.selected ? rt.hovered : -1);
    selMat.opacity = 0.65 + Math.sin(state.clock.elapsedTime * 3) * 0.3;
  });

  return (
    <group>
      <lineSegments ref={sel} geometry={geo} material={selMat} visible={false} raycast={() => null} />
      <lineSegments ref={hov} geometry={geo} material={hovMat} visible={false} raycast={() => null} />
    </group>
  );
}

/** Piso translúcido destacando a unidade selecionada no pavimento. */
function UnitHighlight() {
  const unitId = useSkyline((s) => s.selectedUnit);
  const floor = useSkyline((s) => s.selectedFloor);
  const mode = useSkyline((s) => s.mode);
  const ref = useRef<Group>(null);
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#6f9dff', transparent: true, opacity: 0.32, depthWrite: false, toneMapped: false }), []);
  const edge = useMemo(() => new LineBasicMaterial({ color: '#9fc0ff', toneMapped: false }), []);
  const geos = useMemo(() => {
    const a = new BoxGeometry(15, 0.06, 8.5);
    a.translate(7.5, 0.06, 6.75);
    const b = new BoxGeometry(9, 0.06, 2.5);
    b.translate(10.5, 0.06, 1.25);
    return { a, b, ea: new EdgesGeometry(a), eb: new EdgesGeometry(b) };
  }, []);
  useEffect(() => () => { Object.values(geos).forEach((g) => g.dispose()); mat.dispose(); edge.dispose(); }, [geos, mat, edge]);
  useFrame((state) => {
    if (!ref.current || !floor) return;
    ref.current.position.y = rt.y[floor];
    mat.opacity = 0.22 + Math.sin(state.clock.elapsedTime * 2.4) * 0.1;
  });
  if (mode !== 'floor' || !floor || !unitId) return null;
  const u = UNITS.find((x) => x.id === unitId)!;
  return (
    <group ref={ref} scale={[u.sx, 1, u.sz]} name="unit-highlight">
      <mesh geometry={geos.a} material={mat} raycast={() => null} />
      <mesh geometry={geos.b} material={mat} raycast={() => null} />
      <lineSegments geometry={geos.ea} material={edge} raycast={() => null} />
      <lineSegments geometry={geos.eb} material={edge} raycast={() => null} />
    </group>
  );
}

/** Numeração lateral, linhas de referência e identificação das áreas comuns (vista explodida / modo técnico). */
function FloorLabels() {
  const exploded = useSkyline((s) => s.exploded);
  const technical = useSkyline((s) => s.layers.technical);
  const selected = useSkyline((s) => s.selectedFloor);
  const mode = useSkyline((s) => s.mode);
  const show = (exploded || technical) && mode !== 'garage' && mode !== 'apartment';
  const groups = useRef<(Group | null)[]>([]);
  const lineRef = useRef<LineSegments>(null);
  const lineGeo = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array((FLOOR_COUNT + 1) * 6), 3));
    return g;
  }, []);
  const lineMat = useMemo(() => new LineBasicMaterial({ color: '#9db8e6', transparent: true, opacity: 0.55 }), []);
  useEffect(() => () => { lineGeo.dispose(); lineMat.dispose(); }, [lineGeo, lineMat]);
  const X = BUILDING.halfX + 3.2;

  useFrame(({ camera, size }) => {
    if (!show) return;
    // de longe, mostra só os rótulos principais (evita sobreposição)
    const pc = camera as unknown as { fov: number };
    const dist = camera.position.distanceTo(new Vector3(0, rt.y[20], 0));
    const spacing = ((rt.y[21] - rt.y[20]) / (2 * dist * Math.tan(((pc.fov ?? 38) * Math.PI) / 360))) * size.height;
    const sparse = spacing < 20 ? '1' : '';
    if (document.body.dataset.sparseTags !== sparse) document.body.dataset.sparseTags = sparse;
    const pos = lineGeo.attributes.position as BufferAttribute;
    for (let n = 1; n <= FLOOR_COUNT; n++) {
      const y = rt.y[n] + 0.1;
      const g = groups.current[n];
      if (g) g.position.set(X + 4.2, y + 0.4, 0);
      // traço horizontal ligando a laje à régua
      pos.setXYZ((n - 1) * 2, BUILDING.halfX + 0.6, y, 0);
      pos.setXYZ((n - 1) * 2 + 1, X + 3.6, y, 0);
    }
    // régua vertical
    pos.setXYZ(FLOOR_COUNT * 2, X + 3.6, rt.y[1], 0);
    pos.setXYZ(FLOOR_COUNT * 2 + 1, X + 3.6, rt.y[FLOOR_COUNT] + floorHeight(FLOOR_COUNT), 0);
    pos.needsUpdate = true;
    lineGeo.computeBoundingSphere();
  });

  if (!show) return null;
  return (
    <group>
      <lineSegments ref={lineRef} geometry={lineGeo} material={lineMat} raycast={() => null} />
      {FLOORS.map((n) => {
        const info = getFloorInfo(n);
        const sector = floorSector(n);
        const common = info.units === 0;
        return (
          <group key={n} ref={(el) => (groups.current[n] = el)}>
            <Html center={false} zIndexRange={[20, 0]} style={{ pointerEvents: 'auto' }}>
              <button
                type="button"
                className={`floor-tag${selected === n ? ' is-selected' : ''}${common ? ' is-common' : ''}${n % 5 === 0 || n === 1 || common || selected === n ? ' is-major' : ''}`}
                style={{ ['--sector' as string]: sector.color }}
                onClick={() => useSkyline.getState().selectFloor(n)}
                aria-label={`Pavimento ${floorLabel(n)} — ${info.title}`}
              >
                <span className="floor-tag__n">{floorLabel(n)}</span>
                {(common || selected === n) && <span className="floor-tag__t">{info.title}</span>}
              </button>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

/** Cabines de elevador percorrendo os poços (modo técnico). */
function ElevatorCabins() {
  const refs = useRef<(Group | null)[]>([]);
  const shafts = useMemo(() => [
    { x: 3, z: 1.25, speed: 0.11, phase: 0 },
    { x: 3, z: -1.25, speed: 0.08, phase: 1.7 },
    { x: -3, z: 1.25, speed: 0.095, phase: 3.1 },
    { x: -3, z: -1.25, speed: 0.07, phase: 4.4 },
  ], []);
  const top = useMemo(() => rt.y[FLOOR_COUNT], []);
  useFrame((state) => {
    const exploded = rt.explode > 0.02;
    shafts.forEach((s, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = !exploded;
      const k = (Math.sin(state.clock.elapsedTime * s.speed * 2 + s.phase) + 1) / 2;
      g.position.set(s.x, 0.1 + k * top, s.z);
    });
  });
  return (
    <group>
      {shafts.map((s, i) => (
        <group key={i} ref={(el) => (refs.current[i] = el)} position={[s.x, 0, s.z]}>
          <mesh material={MAT.metalLight} raycast={() => null}>
            <boxGeometry args={[1.6, 2.4, 2.0]} />
          </mesh>
          <mesh position={[0, 1.25, 0]} material={MAT.lightCool} raycast={() => null}>
            <boxGeometry args={[1.62, 0.06, 2.02]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
