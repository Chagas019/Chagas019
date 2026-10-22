import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { MeshBasicMaterial, MeshStandardMaterial, Shape, ShapeGeometry, type Group, type Mesh } from 'three';
import {
  GARAGE_CONFIG, TECH_ROOMS, garageBands, garageColumns, garageLevels, garageRamps, garageSpots, type GarageLevel,
} from '../../data/garage';
import { BUILDING } from '../../data/building';
import { useSkyline } from '../../state/store';
import { MAT, makeLabelTexture } from '../materials';
import { getConcreteFloorTexture } from '../textures';
import { InstancedBoxes, type BoxItem } from '../environment/InstancedBoxes';
import { WHEELS, carGeometries } from '../environment/carGeometry';

const cfg = GARAGE_CONFIG;
const LEVEL_COLORS = ['#4f86ff', '#e0a43a', '#4fbf8a', '#d0587c'];

/**
 * Garagem subterrânea gerada a partir de GARAGE_CONFIG: lajes, pilares, vagas demarcadas,
 * carros otimizados (instanciados), rampas, circulação, sinalização, núcleo e áreas técnicas.
 */
export default function Garage() {
  const levels = useMemo(() => garageLevels(), []);
  const active = useSkyline((s) => s.garageLevel);
  return (
    <group name="garage">
      {levels.map((lvl) => (lvl.index < active ? null : <GarageLevelView key={lvl.id} level={lvl} active={lvl.index === active} />))}
      <Ceiling />
      <ExcavationOutline />
      <SunBlocker />
    </group>
  );
}

function slabPieces(level: GarageLevel): BoxItem[] {
  const ramps = garageRamps();
  const r = ramps.inner;
  const y = level.y - 0.15;
  const W = cfg.halfX * 2;
  const hasHole = level.index < cfg.levels - 1;
  if (!hasHole) return [{ p: [0, y, 0], s: [W, 0.3, cfg.halfZ * 2] }];
  const zIn = cfg.spineHalf - 0.5;
  return [
    { p: [0, y, -(cfg.halfZ + zIn) / 2], s: [W, 0.3, cfg.halfZ - zIn] },
    { p: [0, y, (cfg.halfZ + zIn) / 2], s: [W, 0.3, cfg.halfZ - zIn] },
    { p: [(-cfg.halfX + r.x0) / 2, y, 0], s: [r.x0 + cfg.halfX, 0.3, zIn * 2] },
    { p: [(r.x1 + cfg.halfX) / 2, y, 0], s: [cfg.halfX - r.x1, 0.3, zIn * 2] },
  ];
}

function GarageLevelView({ level, active }: { level: GarageLevel; active: boolean }) {
  const group = useRef<Group>(null);
  const spots = useMemo(() => garageSpots(level.index), [level.index]);
  const bands = useMemo(() => garageBands(), []);
  const columns = useMemo(() => garageColumns(), []);
  const ramps = useMemo(() => garageRamps(), []);
  const color = LEVEL_COLORS[level.index % LEVEL_COLORS.length];
  const y = level.y;
  const H = cfg.levelHeight;

  const floorMat = useMemo(() => {
    const t = getConcreteFloorTexture().clone();
    t.needsUpdate = true;
    t.repeat.set(cfg.halfX / 2.5, cfg.halfZ / 2.5);
    return new MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0.05 });
  }, []);
  const bandMat = useMemo(() => new MeshStandardMaterial({ color, roughness: 0.6 }), [color]);
  const lightMat = useMemo(() => new MeshBasicMaterial({ color: '#f2f6ff', toneMapped: false }), []);
  useEffect(() => () => { floorMat.map?.dispose(); floorMat.dispose(); bandMat.dispose(); lightMat.dispose(); }, [floorMat, bandMat, lightMat]);

  const data = useMemo(() => {
    const lines: BoxItem[] = [];
    const dashes: BoxItem[] = [];
    const arrows: BoxItem[] = [];
    const lights: BoxItem[] = [];
    const cols: BoxItem[] = [];
    const colBands: BoxItem[] = [];
    const bodies: BoxItem[] = [];
    const cabins: BoxItem[] = [];
    const wheels: BoxItem[] = [];
    const heads: BoxItem[] = [];
    const yf = y + 0.012;
    // demarcação das vagas
    const usable = cfg.halfX - cfg.crossAisle;
    const count = Math.floor((usable * 2) / cfg.spotWidth);
    const startX = -(count * cfg.spotWidth) / 2;
    for (const b of bands) {
      const zc = (b.z0 + b.z1) / 2;
      if (b.kind === 'spots') {
        for (let i = 0; i <= count; i++) lines.push({ p: [startX + i * cfg.spotWidth, yf, zc], s: [0.1, 0.01, cfg.spotDepth] });
        const back = b.aisleSide === 1 ? b.z0 : b.z1;
        lines.push({ p: [0, yf, back + (b.aisleSide === 1 ? 0.05 : -0.05)], s: [count * cfg.spotWidth, 0.01, 0.1] });
      } else {
        for (let x = -usable + 2; x < usable - 2; x += 5) dashes.push({ p: [x, yf, zc], s: [2.4, 0.01, 0.12] });
        // circulação em sentido único (alterna por corredor)
        const dir = zc < 0 ? 1 : -1;
        for (let x = -18; x <= 18; x += 12) arrows.push({ p: [x, yf + 0.002, zc + dir * 1.4], s: [1, 1, 1], r: dir > 0 ? 0 : Math.PI });
        // luminárias lineares acima da circulação
        for (let x = -usable + 3; x < usable; x += 5) lights.push({ p: [x, y + H - 0.38, zc], s: [1.6, 0.06, 0.22] });
      }
    }
    // corredores transversais
    for (const sx of [-1, 1]) {
      const xc = sx * (cfg.halfX - cfg.crossAisle / 2);
      for (let z = -cfg.halfZ + 3; z < cfg.halfZ; z += 5) {
        dashes.push({ p: [xc, yf, z], s: [0.12, 0.01, 2.4] });
        lights.push({ p: [xc, y + H - 0.38, z], s: [0.22, 0.06, 1.6] });
      }
    }
    // pilares com faixa na cor do nível
    for (const [x, z] of columns) {
      if (Math.abs(z) < cfg.spineHalf + 0.2 && Math.abs(x) < 8) continue;
      cols.push({ p: [x, y + H / 2, z], s: [0.6, H, 0.6] });
      colBands.push({ p: [x, y + 1.45, z], s: [0.64, 0.5, 0.64] });
    }
    // carros: carroceria, cabine, rodas e faróis (cor por instância)
    for (const sp of spots) {
      if (!sp.occupied) continue;
      const f = sp.facing;
      const r = f > 0 ? 0 : Math.PI;
      bodies.push({ p: [sp.x, y, sp.z], s: [1, 1, 1], r, color: sp.carColor });
      cabins.push({ p: [sp.x, y, sp.z], s: [1, 1, 1], r });
      heads.push({ p: [sp.x, y, sp.z], s: [1, 1, 1], r });
      for (const [wx, wy, wz] of WHEELS) wheels.push({ p: [sp.x + wx * f, y + wy, sp.z + wz * f], s: [1, 1, 1] });
    }
    return { lines, dashes, arrows, lights, cols, colBands, bodies, cabins, wheels, heads };
  }, [bands, columns, spots, y, H]);

  const arrowGeo = useMemo(() => {
    const s = new Shape();
    s.moveTo(-1.6, -0.22);
    s.lineTo(0.4, -0.22);
    s.lineTo(0.4, -0.6);
    s.lineTo(1.6, 0);
    s.lineTo(0.4, 0.6);
    s.lineTo(0.4, 0.22);
    s.lineTo(-1.6, 0.22);
    s.closePath();
    const g = new ShapeGeometry(s);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const car = carGeometries();
  useEffect(() => () => arrowGeo.dispose(), [arrowGeo]);

  const walls = useRef<(Mesh | null)[]>([]);
  // Paredes do perímetro voltadas para a câmera somem (vista em "casa de bonecas").
  useFrame(({ camera }) => {
    const c = camera.position;
    const inside = Math.abs(c.x) < cfg.halfX && Math.abs(c.z) < cfg.halfZ && c.y < 0;
    const defs = [
      [0, 1, cfg.halfZ], [0, -1, cfg.halfZ], [1, 0, cfg.halfX], [-1, 0, cfg.halfX],
    ];
    walls.current.forEach((w, i) => {
      if (!w) return;
      const [nx, nz, d] = defs[i];
      const outward = nx * c.x + nz * c.z > d - 1;
      w.visible = inside || !outward;
    });
  });

  const ramp = ramps.inner;
  const rampLen = Math.hypot(ramp.length, H);
  const rampAng = Math.atan2(H, ramp.length);
  const isLast = level.index === cfg.levels - 1;

  return (
    <group ref={group} name={`garage-${level.id}`}>
      {/* laje de piso (com o vão da rampa para o nível de baixo) */}
      <InstancedBoxes items={slabPieces(level)} material={floorMat} receiveShadow castShadow />
      {/* paredes de contenção */}
      {[
        { p: [0, y + H / 2, cfg.halfZ + 0.15], s: [cfg.halfX * 2 + 0.6, H, 0.3] },
        { p: [level.index === 0 ? -3 : 0, y + H / 2, -cfg.halfZ - 0.15], s: [level.index === 0 ? cfg.halfX * 2 - 5.4 : cfg.halfX * 2 + 0.6, H, 0.3] },
        { p: [cfg.halfX + 0.15, y + H / 2, 0], s: [0.3, H, cfg.halfZ * 2] },
        { p: [-cfg.halfX - 0.15, y + H / 2, 0], s: [0.3, H, cfg.halfZ * 2] },
      ].map((w, i) => (
        <mesh key={i} ref={(el) => (walls.current[i] = el)} position={w.p as [number, number, number]} material={MAT.concreteRaw} receiveShadow>
          <boxGeometry args={w.s as [number, number, number]} />
        </mesh>
      ))}
      <InstancedBoxes items={data.lines} material={MAT.marking} />
      <InstancedBoxes items={data.dashes} material={MAT.markingYellow} />
      <InstancedBoxes items={data.arrows} material={MAT.marking} geometry={arrowGeo} />
      <InstancedBoxes items={data.lights} material={lightMat} />
      <InstancedBoxes items={data.cols} material={MAT.concrete} castShadow receiveShadow />
      <InstancedBoxes items={data.colBands} material={bandMat} />
      <InstancedBoxes items={data.bodies} material={MAT.paint} geometry={car.body} castShadow />
      <InstancedBoxes items={data.cabins} material={MAT.carGlass} geometry={car.glass} />
      <InstancedBoxes items={data.wheels} material={MAT.tire} geometry={car.wheel} />
      <InstancedBoxes items={data.heads} material={MAT.lightCool} geometry={car.lights} />

      {/* núcleo de elevadores e escadas (prolongamento da torre) com vestíbulo */}
      <mesh position={[0, y + H / 2, 0]} material={MAT.core} castShadow receiveShadow>
        <boxGeometry args={[BUILDING.core.halfX * 2, H, BUILDING.core.halfZ * 2]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          {[1.25, -1.25].map((z) => (
            <mesh key={z} position={[sx * (BUILDING.core.halfX + 0.01), y + 1.1, z]} material={MAT.metalLight}>
              <boxGeometry args={[0.04, 2.2, 1.1]} />
            </mesh>
          ))}
          <mesh position={[sx * 5.1, y + 0.02, 0]} material={bandMat}>
            <boxGeometry args={[2.2, 0.02, 5]} />
          </mesh>
        </group>
      ))}
      {/* faixas de pedestre até o núcleo */}
      {[-1, 1].map((sz) =>
        [0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={`${sz}${i}`} position={[4.6 + i * 0.45, y + 0.016, sz * 6]} material={MAT.marking}>
            <boxGeometry args={[0.25, 0.01, 5.6]} />
          </mesh>
        )),
      )}

      {/* rampa interna para o nível inferior */}
      {!isLast && (
        <group>
          <mesh position={[(ramp.x0 + ramp.x1) / 2, y - H / 2 - 0.1, 0]} rotation={[0, 0, -rampAng]} material={MAT.asphalt} receiveShadow castShadow>
            <boxGeometry args={[rampLen, 0.2, ramp.halfWidth * 2]} />
          </mesh>
          {[-1, 1].map((sz) => (
            <mesh key={sz} position={[(ramp.x0 + ramp.x1) / 2, y + 0.5, sz * (ramp.halfWidth + 0.1)]} material={MAT.markingYellow}>
              <boxGeometry args={[ramp.length, 1, 0.12]} />
            </mesh>
          ))}
        </group>
      )}

      {/* áreas técnicas indicativas */}
      {TECH_ROOMS.filter((r) => r.level === level.index).map((r) => (
        <TechRoom key={r.id} name={r.name} x0={r.x[0]} x1={r.x[1]} y={y} />
      ))}

      {/* escada de emergência */}
      <mesh position={[-cfg.halfX + 2.6, y + H / 2, cfg.halfZ - 2.4]} material={MAT.core} castShadow>
        <boxGeometry args={[4.6, H, 4.2]} />
      </mesh>
      <Sign text="SAÍDA" sub="escada de emergência" p={[-cfg.halfX + 2.6, y + H - 0.7, cfg.halfZ - 4.55]} w={2.4} bg="#1f7a4d" />

      {/* sinalização vertical suspensa */}
      <Sign text={`${level.id} · ELEVADORES`} sub="hall social" p={[8, y + H - 0.75, 6]} w={4.2} bg={color} rotY={Math.PI / 2} />
      <Sign text={`${level.id} · ELEVADORES`} sub="hall social" p={[8, y + H - 0.75, -6]} w={4.2} bg={color} rotY={Math.PI / 2} />
      {level.index === 0 && <Sign text="SAÍDA ↑ RUA" sub="rampa de acesso" p={[cfg.halfX - 3, y + H - 0.75, -cfg.halfZ + 6]} w={4} bg="#1f7a4d" />}
      {!isLast && <Sign text={`↓ G${level.index + 2}`} sub="rampa interna" p={[ramp.x0 - 1.5, y + H - 0.75, 0]} w={3} bg="#2b2f36" rotY={Math.PI / 2} />}
      {level.index > 0 && <Sign text={`↑ G${level.index}`} sub="rampa interna" p={[cfg.halfX - 3, y + H - 0.75, 0]} w={3} bg="#2b2f36" rotY={-Math.PI / 2} />}

      {/* identificação do nível pintada no piso e marcador */}
      <FloorPaint text={level.id} p={[-14, y + 0.02, 0]} color={color} />
      {active && <group position={[-cfg.halfX - 2, y + H / 2, -cfg.halfZ - 1]}>
        <Html center zIndexRange={[18, 0]} style={{ pointerEvents: 'none' }}>
          <div className="level-tag" style={{ ['--lvl' as string]: color }}>
            <strong>{level.id}</strong>
            <span>{(level.y).toFixed(1).replace('.', ',')} m · {spots.length} vagas</span>
          </div>
        </Html>
      </group>}
      <GarageLights y={y} />
    </group>
  );
}

function Sign({ text, sub, p, w, bg, rotY = 0 }: { text: string; sub?: string; p: [number, number, number]; w: number; bg: string; rotY?: number }) {
  const mat = useMemo(() => new MeshBasicMaterial({ map: makeLabelTexture(text, { bg, sub, w: 640, h: 200 }), toneMapped: false }), [text, sub, bg]);
  useEffect(() => () => { mat.map?.dispose(); mat.dispose(); }, [mat]);
  const h = (w * 200) / 640;
  return (
    <group position={p} rotation={[0, rotY, 0]}>
      <mesh material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh rotation={[0, Math.PI, 0]} material={mat}>
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh position={[0, h / 2 + 0.25, 0]} material={MAT.metal}>
        <boxGeometry args={[0.04, 0.5, 0.04]} />
      </mesh>
    </group>
  );
}

function FloorPaint({ text, p, color }: { text: string; p: [number, number, number]; color: string }) {
  const mat = useMemo(() => {
    const tex = makeLabelTexture(text, { bg: 'rgba(0,0,0,0)', fg: color, w: 512, h: 256, font: '700 200px Inter, Arial, sans-serif' });
    return new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.85 });
  }, [text, color]);
  useEffect(() => () => { mat.map?.dispose(); mat.dispose(); }, [mat]);
  return (
    <mesh position={p} rotation={[-Math.PI / 2, 0, Math.PI / 2]} material={mat}>
      <planeGeometry args={[8, 4]} />
    </mesh>
  );
}

function TechRoom({ name, x0, x1, y }: { name: string; x0: number; x1: number; y: number }) {
  const H = cfg.levelHeight;
  const zh = cfg.spineHalf - 0.3;
  const w = x1 - x0;
  const cx = (x0 + x1) / 2;
  return (
    <group>
      <mesh position={[cx, y + H / 2, 0]} material={MAT.concreteRaw} castShadow receiveShadow>
        <boxGeometry args={[w, H, zh * 2]} />
      </mesh>
      {[-1, 1].map((sz) => (
        <group key={sz}>
          <mesh position={[cx, y + 1.05, sz * (zh + 0.01)]} material={MAT.metal}>
            <boxGeometry args={[1.4, 2.1, 0.04]} />
          </mesh>
          <Sign text={name.toUpperCase()} sub="área técnica · indicativa" p={[cx, y + 2.6, sz * (zh + 0.03)]} w={Math.min(w - 1, 4.4)} bg="#3b4048" rotY={sz > 0 ? 0 : Math.PI} />
        </group>
      ))}
    </group>
  );
}

function GarageLights({ y }: { y: number }) {
  const H = cfg.levelHeight;
  // Poucas luzes reais (o resto é emissivo) para manter o custo de sombreamento baixo.
  const pts: [number, number][] = [[-13, -10], [13, 10]];
  return (
    <group>
      {pts.map(([x, z]) => (
        <pointLight key={`${x}${z}`} position={[x, y + H - 0.6, z]} intensity={90} distance={40} decay={1.3} color="#eef3ff" />
      ))}
    </group>
  );
}

/** Bloqueia o sol no subsolo: invisível na imagem, mas projeta sombra (o solo translúcido não projeta). */
function SunBlocker() {
  const mat = useMemo(() => new MeshBasicMaterial({ colorWrite: false, depthWrite: false }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[0, -0.2, 0]} material={mat} castShadow raycast={() => null}>
      <boxGeometry args={[cfg.halfX * 2 + 40, 0.3, cfg.halfZ * 2 + 40]} />
    </mesh>
  );
}

/** Laje de teto do nível ativo, só na vista ao nível do piso (de cima ela esconderia o interior). */
function Ceiling() {
  const view = useSkyline((s) => s.garageView);
  const level = useSkyline((s) => s.garageLevel);
  if (view !== 'street') return null;
  const lvl = garageLevels()[level];
  return (
    <mesh position={[0, lvl.y + cfg.levelHeight - 0.15, 0]} material={MAT.concreteRaw} raycast={() => null}>
      <boxGeometry args={[cfg.halfX * 2, 0.3, cfg.halfZ * 2]} />
    </mesh>
  );
}

/** Contorno do volume escavado: deixa claro onde fica o solo quando ele está translúcido. */
function ExcavationOutline() {
  const depth = cfg.levels * cfg.levelHeight;
  const mat = useMemo(() => new MeshBasicMaterial({ color: '#8fb0e8', wireframe: true, transparent: true, opacity: 0.25 }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[0, -depth / 2 - 0.15, 0]} material={mat} raycast={() => null}>
      <boxGeometry args={[cfg.halfX * 2 + 0.9, depth + 0.3, cfg.halfZ * 2 + 0.9, 1, 1, 1]} />
    </mesh>
  );
}
