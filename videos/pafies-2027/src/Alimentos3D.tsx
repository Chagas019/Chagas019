// Cena 3D (three.js / React Three Fiber): alimentos, equipes e desafios flutuando
import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { ThreeCanvas } from '@remotion/three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { AMARELO, AZUL, H, HIT, W, clamp, eIO, eOut, hash, lerp, prog } from './lib';

// ---------- texturas de rótulo (canvas) ----------
function rotulo(titulo: string, sub: string, bg: string, fg: string, faixa: string, w = 1024, h = 1024) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = faixa; g.fillRect(0, h * 0.58, w, h * 0.2);
  // retícula halftone sutil
  g.fillStyle = 'rgba(255,255,255,.12)';
  for (let y = 0; y < h * 0.5; y += 26) for (let x = (y / 26) % 2 ? 13 : 0; x < w; x += 26) { g.beginPath(); g.arc(x, y, 6 * (1 - y / (h * 0.5)), 0, 7); g.fill(); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${Math.round(h * 0.24)}px Anton`; g.fillText(titulo, w / 2, h * 0.38);
  g.font = `bold ${Math.round(h * 0.09)}px 'Inter Display'`; g.fillStyle = faixa === AMARELO ? '#111' : '#fff'; g.fillText(sub, w / 2, h * 0.68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function mostrador() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = '#fafafa'; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill();
  g.strokeStyle = '#111'; g.lineCap = 'round';
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2; g.lineWidth = i % 5 ? 4 : 10; const r1 = i % 5 ? 215 : 190;
    g.beginPath(); g.moveTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1); g.lineTo(256 + Math.cos(a) * 240, 256 + Math.sin(a) * 240); g.stroke(); }
  g.fillStyle = AZUL; g.font = '90px Anton'; g.textAlign = 'center'; g.fillText('10', 256, 330);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function papelao() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = '#C89A62'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(${Math.random() < .5 ? '90,60,30' : '255,230,190'},.06)`; g.fillRect(Math.random() * 512, Math.random() * 512, 2, 8); }
  // coração + DOAÇÃO
  g.fillStyle = AZUL; g.save(); g.translate(256, 230); g.scale(5, 5); g.beginPath();
  g.moveTo(0, 10); g.bezierCurveTo(-20, -4, -12, -22, 0, -12); g.bezierCurveTo(12, -22, 20, -4, 0, 10); g.fill(); g.restore();
  g.font = '70px Anton'; g.textAlign = 'center'; g.fillText('DOAÇÃO', 256, 420);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- geometrias ----------
const camisaShape = () => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, -0.9); s.lineTo(0.5, -0.9); s.lineTo(0.5, 0.35); s.lineTo(0.85, 0.15); s.lineTo(1.05, 0.55); s.lineTo(0.55, 0.95);
  s.quadraticCurveTo(0, 0.7, -0.55, 0.95); s.lineTo(-1.05, 0.55); s.lineTo(-0.85, 0.15); s.lineTo(-0.5, 0.35); s.closePath(); return s;
};
const coracaoShape = () => {
  const s = new THREE.Shape(); s.moveTo(0, -0.6);
  s.bezierCurveTo(-1.2, 0.2, -0.7, 1.1, 0, 0.55); s.bezierCurveTo(0.7, 1.1, 1.2, 0.2, 0, -0.6); return s;
};

// ---------- ambiente de estúdio (reflexos) ----------
const Estudio: React.FC = () => {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env; return () => { env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
};
const Camera: React.FC<{ t: number }> = ({ t }) => {
  const { camera } = useThree();
  const p = eIO(prog(t, HIT.cena3 - 0.4, HIT.cena5));
  const ang = lerp(-0.42, 0.38, p) + Math.sin(t * 0.6) * 0.03;
  const dist = lerp(10.5, 8.6, p) - 0.8 * eOut(prog(t, HIT.cena3 - 0.4, HIT.cena3 + 1.2));
  const up = lerp(1.2, 0.2, p) + eIO(prog(t, HIT.cena5 - 1.1, HIT.cena5)) * 6;   // sobe e sai no final (transição)
  camera.position.set(Math.sin(ang) * dist, up, Math.cos(ang) * dist);
  camera.lookAt(0, -0.4 + up * 0.6, 0);
  (camera as THREE.PerspectiveCamera).fov = 38; camera.updateProjectionMatrix();
  return null;
};

type Item = { kind: string; base: [number, number, number]; s: number; spin: [number, number, number]; ph: number; label?: number };
const ITENS: Item[] = [
  { kind: 'arroz', base: [-1.4, 0.3, 0.4], s: 1.0, spin: [0.2, 0.5, 0.1], ph: 0, label: 0 },
  { kind: 'lata', base: [1.5, 0.9, 0.2], s: 0.9, spin: [0.6, 0.4, 0.3], ph: 1, label: 1 },
  { kind: 'leite', base: [0.3, -1.4, 1.2], s: 0.85, spin: [0.3, -0.5, 0.2], ph: 2, label: 2 },
  { kind: 'macarrao', base: [1.3, -1.0, -0.6], s: 0.95, spin: [-0.4, 0.3, 0.5], ph: 3, label: 3 },
  { kind: 'oleo', base: [-0.2, 1.8, -0.8], s: 0.9, spin: [0.2, 0.7, -0.3], ph: 4 },
  { kind: 'lata', base: [-1.9, -1.3, -0.4], s: 0.75, spin: [0.5, -0.3, 0.6], ph: 5, label: 4 },
  { kind: 'camisa', base: [2.3, -0.1, -1.4], s: 0.8, spin: [0.2, 0.6, 0.1], ph: 6, label: 0 },
  { kind: 'camisa', base: [-2.4, 1.3, -1.6], s: 0.7, spin: [-0.1, -0.5, 0.2], ph: 7, label: 1 },
  { kind: 'trofeu', base: [0.1, 0.4, -1.8], s: 0.95, spin: [0.0, 0.6, 0.05], ph: 8 },
  { kind: 'cronometro', base: [-0.9, -2.3, 0.3], s: 0.75, spin: [0.4, 0.5, 0.2], ph: 9 },
];

const Obj: React.FC<{ it: Item; t: number; i: number; tex: any }> = ({ it, t, i, tex }) => {
  const m = tex.mats;
  // entrada (explosão a partir do centro) + flutuação + giro independente
  const ent = eOut(prog(t, HIT.cena3 + i * 0.05 - 0.15, HIT.cena3 + 0.9 + i * 0.05));
  const fl = [Math.sin(t * 0.9 + it.ph) * 0.12, Math.sin(t * 1.1 + it.ph * 2) * 0.18, Math.cos(t * 0.7 + it.ph) * 0.12];
  let pos = new THREE.Vector3(...it.base).multiplyScalar(lerp(0.05, 1, ent)).add(new THREE.Vector3(...fl));
  let sc = it.s * lerp(0.2, 1, ent);
  // DOAÇÃO: alimentos voam para dentro da caixa (arco), equipes/desafios se afastam
  const isFood = ['arroz', 'lata', 'leite', 'macarrao', 'oleo'].includes(it.kind);
  const td = HIT.doacao + 0.35 + i * 0.16;
  const pd = eIO(prog(t, td, td + 0.75));
  if (isFood && pd > 0) {
    const target = new THREE.Vector3(0, -1.55, 0.2);
    const arc = new THREE.Vector3(0, Math.sin(pd * Math.PI) * 1.6, 0);
    pos = pos.clone().lerp(target, pd).add(arc); sc *= lerp(1, 0.55, pd);
  } else if (!isFood) {
    const pa = eIO(prog(t, HIT.doacao, HIT.doacao + 1.2));
    pos = pos.clone().multiplyScalar(1 + pa * 0.5);
  }
  const rot: [number, number, number] = [it.spin[0] * t + it.ph, it.spin[1] * t + it.ph * 2, it.spin[2] * t];
  const hidden = isFood && pd >= 1;
  if (hidden) return null;
  return (
    <group position={pos.toArray() as any} rotation={rot} scale={sc}>
      {it.kind === 'lata' && (<>
        <mesh material={[m.rotulos[it.label!], m.metal, m.metal]}><cylinderGeometry args={[0.55, 0.55, 1.25, 64, 1, false]} /></mesh>
        <mesh position={[0, 0.64, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}><torusGeometry args={[0.52, 0.04, 16, 64]} /></mesh>
        <mesh position={[0, -0.64, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.metal}><torusGeometry args={[0.52, 0.04, 16, 64]} /></mesh>
      </>)}
      {it.kind === 'arroz' && (<>
        <mesh geometry={tex.geo.pacote} material={m.plastico} />
        <mesh position={[0, 0, 0.29]} material={m.rotulos[0]}><planeGeometry args={[1.18, 1.5]} /></mesh>
      </>)}
      {it.kind === 'macarrao' && (<>
        <mesh geometry={tex.geo.pacoteFino} material={m.plasticoAz} />
        <mesh position={[0, 0, 0.17]} material={m.rotulos[3]}><planeGeometry args={[1.25, 0.95]} /></mesh>
      </>)}
      {it.kind === 'leite' && (<>
        <mesh geometry={tex.geo.caixa} material={m.branco} />
        <mesh position={[0, 0, 0.452]} material={m.rotulos[2]}><planeGeometry args={[0.86, 1.2]} /></mesh>
        <mesh position={[0, 0.8, 0]} geometry={tex.geo.telhado} material={m.branco} />
      </>)}
      {it.kind === 'oleo' && (<>
        <mesh geometry={tex.geo.garrafa} material={m.oleo} />
        <mesh position={[0, 1.05, 0]} material={m.tampa}><cylinderGeometry args={[0.13, 0.13, 0.16, 32]} /></mesh>
      </>)}
      {it.kind === 'camisa' && (<>
        <mesh geometry={tex.geo.camisa} material={it.label ? m.camisaAm : m.camisaAz} position={[0, 0, -0.08]} />
        <mesh position={[0, -0.05, 0.1]} material={it.label ? m.num10b : m.num10a}><planeGeometry args={[0.8, 0.8]} /></mesh>
      </>)}
      {it.kind === 'trofeu' && (<>
        <mesh geometry={tex.geo.taca} material={m.ouro} />
        <mesh position={[0.55, 0.55, 0]} rotation={[0, 0, Math.PI / 2]} material={m.ouro}><torusGeometry args={[0.22, 0.05, 16, 40, Math.PI]} /></mesh>
        <mesh position={[-0.55, 0.55, 0]} rotation={[0, 0, -Math.PI / 2]} material={m.ouro}><torusGeometry args={[0.22, 0.05, 16, 40, Math.PI]} /></mesh>
        <mesh position={[0, -0.95, 0]} geometry={tex.geo.base} material={m.preto} />
      </>)}
      {it.kind === 'cronometro' && (<>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={m.metal}><cylinderGeometry args={[0.7, 0.7, 0.25, 64]} /></mesh>
        <mesh position={[0, 0, 0.13]} material={m.mostrador}><circleGeometry args={[0.6, 64]} /></mesh>
        <mesh position={[0, 0, 0.14]} rotation={[0, 0, -t * 3]} material={m.vermelho}><boxGeometry args={[0.03, 0.5, 0.01]} /></mesh>
        <mesh position={[0, 0.85, 0]} material={m.metal}><cylinderGeometry args={[0.1, 0.1, 0.2, 24]} /></mesh>
        <mesh position={[0, 0.98, 0]} material={m.vermelho}><cylinderGeometry args={[0.16, 0.16, 0.08, 24]} /></mesh>
      </>)}
    </group>
  );
};

const CaixaDoacao: React.FC<{ t: number; tex: any }> = ({ t, tex }) => {
  const p = eOut(prog(t, HIT.doacao - 0.2, HIT.doacao + 0.6));
  if (p <= 0) return null;
  const m = tex.mats; const bump = Math.exp(-Math.max(0, t - (HIT.doacao + 1.6)) * 4) * (t > HIT.doacao + 1.6 ? 1 : 0);
  const heart = eOut(prog(t, HIT.doacao + 2.2, HIT.doacao + 2.9));
  return (
    <group position={[0, lerp(-6, -2.1, p), 0.2]} rotation={[0.18, Math.sin(t * 0.8) * 0.15 - 0.3, 0]} scale={1.15 + bump * 0.08}>
      <mesh position={[0, 0, 0.75]} material={m.papelaoFrente}><boxGeometry args={[1.5, 1.1, 0.04]} /></mesh>
      <mesh position={[0, 0, -0.75]} material={m.papelao}><boxGeometry args={[1.5, 1.1, 0.04]} /></mesh>
      <mesh position={[0.75, 0, 0]} material={m.papelao}><boxGeometry args={[0.04, 1.1, 1.5]} /></mesh>
      <mesh position={[-0.75, 0, 0]} material={m.papelao}><boxGeometry args={[0.04, 1.1, 1.5]} /></mesh>
      <mesh position={[0, -0.55, 0]} material={m.papelao}><boxGeometry args={[1.5, 0.04, 1.5]} /></mesh>
      <mesh position={[0, 0.55, 0.95]} rotation={[-0.9, 0, 0]} material={m.papelao}><boxGeometry args={[1.5, 0.04, 0.5]} /></mesh>
      <mesh position={[0, 0.55, -0.95]} rotation={[0.9, 0, 0]} material={m.papelao}><boxGeometry args={[1.5, 0.04, 0.5]} /></mesh>
      {heart > 0 && <mesh geometry={tex.geo.coracao} material={m.coracao} position={[0, 0.7 + heart * 1.3, 0]} scale={heart * 0.65} rotation={[0, t * 2, 0]} />}
    </group>
  );
};

const Cena: React.FC<{ t: number }> = ({ t }) => {
  const tex = useMemo(() => {
    const std = (o: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(o);
    const rot = [
      rotulo('ARROZ', 'TIPO 1 · 5 kg', '#FFFFFF', AZUL, AMARELO), rotulo('FEIJÃO', 'CARIOCA · 1 kg', AZUL, '#FFFFFF', AMARELO),
      rotulo('LEITE', 'INTEGRAL · 1 L', '#FFFFFF', AZUL, AZUL), rotulo('MACARRÃO', 'ESPAGUETE · 500 g', AMARELO, AZUL, AZUL),
      rotulo('MILHO', 'VERDE · 200 g', '#111111', AMARELO, AMARELO),
    ];
    const lbl = (tx: THREE.Texture) => std({ map: tx, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
    const num = (bg: string, fg: string) => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d')!; g.fillStyle = fg; g.font = '170px Anton'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('10', 128, 140); const tt = new THREE.CanvasTexture(c); tt.colorSpace = THREE.SRGBColorSpace; return std({ map: tt, transparent: true, roughness: 0.6 }); };
    const papel = papelao(); const pap = std({ map: papel, roughness: 0.9 });
    const mats = {
      rotulos: rot.map(lbl), metal: std({ color: '#d9dde3', metalness: 1, roughness: 0.22 }),
      plastico: std({ color: '#f4f4f4', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }),
      plasticoAz: std({ color: AZUL, roughness: 0.25, clearcoat: 1 }),
      branco: std({ color: '#f7f7f7', roughness: 0.5 }),
      oleo: std({ color: '#F2C230', roughness: 0.08, metalness: 0, transmission: 0, clearcoat: 1, opacity: 0.92, transparent: true }),
      tampa: std({ color: AZUL, roughness: 0.4 }),
      camisaAz: std({ color: AZUL, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#6f8fff') }),
      camisaAm: std({ color: AMARELO, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color('#fff2a0') }),
      num10a: num(AZUL, '#FFFFFF'), num10b: num(AMARELO, AZUL),
      ouro: std({ color: '#F2B532', metalness: 1, roughness: 0.18 }), preto: std({ color: '#151515', roughness: 0.4, clearcoat: 1 }),
      mostrador: std({ map: mostrador(), roughness: 0.3 }), vermelho: std({ color: '#E52222', roughness: 0.4 }),
      papelao: pap, papelaoFrente: [pap, pap, pap, pap, std({ map: papel, roughness: 0.9 }), pap],
      coracao: std({ color: AMARELO, roughness: 0.2, clearcoat: 1, emissive: new THREE.Color('#5a4300') }),
    };
    const lathe = (pts: number[][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 64);
    const tel = new THREE.Shape(); tel.moveTo(-0.45, 0); tel.lineTo(0.45, 0); tel.lineTo(0, 0.35); tel.closePath();
    const telhado = new THREE.ExtrudeGeometry(tel, { depth: 0.9, bevelEnabled: false }); telhado.translate(0, 0, -0.45);
    const geo = {
      pacote: new RoundedBoxGeometry(1.3, 1.8, 0.55, 6, 0.2), pacoteFino: new RoundedBoxGeometry(1.4, 1.1, 0.3, 6, 0.12),
      caixa: new RoundedBoxGeometry(0.9, 1.6, 0.9, 4, 0.04), telhado,
      garrafa: lathe([[0, -1], [0.38, -1], [0.42, -0.9], [0.42, 0.35], [0.3, 0.6], [0.14, 0.8], [0.12, 1.0], [0, 1.0]]),
      taca: lathe([[0, -0.2], [0.12, -0.2], [0.12, -0.6], [0.35, -0.8], [0.35, -0.85], [0, -0.85], [0, -0.2], [0.12, -0.2], [0.6, 0.3], [0.62, 0.9], [0.55, 0.9], [0.5, 0.35], [0, 0]]),
      base: new RoundedBoxGeometry(0.9, 0.3, 0.6, 4, 0.05),
      camisa: new THREE.ExtrudeGeometry(camisaShape(), { depth: 0.16, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 4 }),
      coracao: new THREE.ExtrudeGeometry(coracaoShape(), { depth: 0.3, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 6 }),
    };
    return { mats, geo };
  }, []);
  return (<>
    <Estudio /><Camera t={t} />
    <ambientLight intensity={0.35} />
    <directionalLight position={[4, 6, 6]} intensity={2.6} color="#fff4e0" />
    <directionalLight position={[-6, 2, -4]} intensity={2.2} color={AMARELO} />
    <directionalLight position={[3, -2, -6]} intensity={1.6} color="#5d86ff" />
    {ITENS.map((it, i) => <Obj key={i} it={it} t={t} i={i} tex={tex} />)}
    <CaixaDoacao t={t} tex={tex} />
  </>);
};

// partículas distantes (camada desfocada = profundidade de campo)
const Fundo3D: React.FC<{ t: number }> = ({ t }) => (<>
  <Camera t={t} /><ambientLight intensity={0.8} /><directionalLight position={[3, 4, 5]} intensity={1.5} />
  {Array.from({ length: 26 }, (_, i) => {
    const a = hash(i) * Math.PI * 2, r = 6 + hash(i + 2) * 5;
    return <mesh key={i} position={[Math.cos(a) * r, (hash(i + 4) - 0.5) * 9 + Math.sin(t + i) * 0.3, -6 - hash(i + 6) * 6]} rotation={[t * 0.5 + i, t * 0.3, 0]}>
      {i % 3 ? <sphereGeometry args={[0.25 + hash(i + 8) * 0.35, 32, 16]} /> : <boxGeometry args={[0.5, 0.5, 0.5]} />}
      <meshStandardMaterial color={i % 2 ? AMARELO : '#2a5be8'} roughness={0.3} />
    </mesh>;
  })}
</>);

export const Alimentos3D: React.FC<{ t: number }> = ({ t }) => (
  <>
    <div style={{ position: 'absolute', inset: 0, filter: 'blur(7px)', opacity: 0.85 }}>
      <ThreeCanvas width={W} height={H} camera={{ position: [0, 0, 10], fov: 38 }}><Fundo3D t={t} /></ThreeCanvas>
    </div>
    <div style={{ position: 'absolute', inset: 0 }}>
      <ThreeCanvas width={W} height={H} camera={{ position: [0, 0, 10], fov: 38 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}><Cena t={t} /></ThreeCanvas>
    </div>
  </>
);
