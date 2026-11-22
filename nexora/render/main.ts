/**
 * Ferramenta interna (não vai para o site): gera as imagens demonstrativas, os panoramas e o .glb
 * a partir das plantas em src/data/plans.ts. É aberta pelo scripts/render-assets.mjs num Chromium headless.
 */
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildFromPlan, type BuildOptions } from '@/three/buildFromPlan';
import { cameraPresetsFromPlan } from '@/lib/plan3d';
import { planApartamentoMirante, planCasaHorizonte, planCasaJardim, planCasaPatio, planEspacoEixo, planStudioLinhaSource } from '@/data/plans';
import type { VectorFloorPlan } from '@/types/property';
import { debugJobs, jobs, type Job } from './jobs';

declare global {
  interface Window {
    __save: (name: string, dataUrl: string) => Promise<void>;
    __log: (msg: string) => void;
    __run: (filter?: string) => Promise<void>;
  }
}

const plans: Record<string, VectorFloorPlan> = {
  horizonte: planCasaHorizonte,
  mirante: planApartamentoMirante,
  jardim: planCasaJardim,
  patio: planCasaPatio,
  eixo: planEspacoEixo,
  studio: { kind: 'vetorial', source: '', levels: [planStudioLinhaSource] },
};

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const pmrem = new THREE.PMREMGenerator(renderer);

type Mood = Job['mood'];
const MOODS: Record<Mood, { elevation: number; azimuth: number; turbidity: number; rayleigh: number; exposure: number; sun: string; sunI: number; hemi: number; lamps: number; fog: string }> = {
  dia: { elevation: 38, azimuth: 205, turbidity: 4, rayleigh: 1.2, exposure: 0.62, sun: '#fff4e6', sunI: 3.2, hemi: 0.5, lamps: 0.1, fog: '#c9d6e4' },
  dourado: { elevation: 9, azimuth: 235, turbidity: 6, rayleigh: 2.2, exposure: 0.72, sun: '#ffc68a', sunI: 3.0, hemi: 0.35, lamps: 1.5, fog: '#d9b48f' },
  crepusculo: { elevation: -1.5, azimuth: 250, turbidity: 10, rayleigh: 3.2, exposure: 0.95, sun: '#ff9a5a', sunI: 0.25, hemi: 0.12, lamps: 14, fog: '#2a3350' },
  interior: { elevation: 30, azimuth: 160, turbidity: 3, rayleigh: 1, exposure: 0.85, sun: '#fff1de', sunI: 3.4, hemi: 0.8, lamps: 0.6, fog: '#dfe7ef' },
};

function setupScene(mood: Mood, fogDist: number) {
  const scene = new THREE.Scene();
  const m = MOODS[mood];
  const sky = new Sky();
  sky.scale.setScalar(10000);
  const u = sky.material.uniforms;
  u.turbidity.value = m.turbidity;
  u.rayleigh.value = m.rayleigh;
  u.mieCoefficient.value = 0.005;
  u.mieDirectionalG.value = 0.85;
  const sun = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - m.elevation), THREE.MathUtils.degToRad(m.azimuth));
  u.sunPosition.value.copy(sun);
  scene.add(sky);
  const envScene = new THREE.Scene();
  envScene.add(sky.clone());
  const env = pmrem.fromScene(envScene as unknown as THREE.Scene, 0.02).texture;
  scene.environment = env;
  scene.environmentIntensity = mood === 'crepusculo' ? 0.5 : 1;
  const dl = new THREE.DirectionalLight(m.sun, m.sunI);
  dl.position.copy(sun).multiplyScalar(60);
  dl.castShadow = true;
  dl.shadow.mapSize.set(4096, 4096);
  dl.shadow.bias = -0.0004;
  dl.shadow.normalBias = 0.03;
  const sc = dl.shadow.camera;
  sc.left = sc.bottom = -30; sc.right = sc.top = 30; sc.near = 1; sc.far = 160;
  scene.add(dl);
  scene.add(new THREE.HemisphereLight('#dbe8ff', '#4a4636', m.hemi));
  scene.fog = new THREE.Fog(m.fog, fogDist, fogDist * 4);
  renderer.toneMappingExposure = m.exposure;
  return { scene, m };
}

function build(job: Job) {
  const plan = plans[job.plan];
  const { root, materials } = buildFromPlan(plan, job.build);
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = (mesh.material as THREE.Material).name;
    if (name === 'nx_glass' || name === 'nx_water' || name === 'nx_lamp') mesh.castShadow = false;
  });
  for (const n of job.hide ?? []) root.traverse((o) => { if (o.name.startsWith(n)) o.visible = false; });
  return { root, materials, plan };
}

function addRoomLights(scene: THREE.Object3D, plan: VectorFloorPlan, intensity: number) {
  if (intensity < 1) return;
  const presets = cameraPresetsFromPlan(plan);
  for (const p of Object.values(presets)) {
    if (!p.interior) continue;
    const l = new THREE.PointLight('#ffcf94', intensity * 2.2, 9, 1.6);
    l.position.set(p.target[0], p.target[1] + 1.5, p.target[2]);
    scene.add(l);
  }
}

const rand = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/** Cidade simplificada vista lá de baixo pelas janelas dos apartamentos */
function addCity(scene: THREE.Scene, root: THREE.Object3D, mood: Mood) {
  const LIFT = 46;
  root.position.y = LIFT;
  const r = rand(42);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: '#6d7266', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const mats = ['#c9c6bf', '#a9adb3', '#d8d4cc', '#8d9298', '#b8b2a6'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, emissive: mood === 'crepusculo' ? new THREE.Color('#ffcc88') : new THREE.Color('#000'), emissiveIntensity: mood === 'crepusculo' ? 0.06 : 0 }));
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2;
    const d = 40 + r() * 520;
    const w = 10 + r() * 22, h = 8 + r() * (d < 160 ? 60 : 30), dd = 10 + r() * 22;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), mats[i % mats.length]);
    b.position.set(Math.cos(a) * d, h / 2, Math.sin(a) * d);
    b.rotation.y = r() * 0.3;
    scene.add(b);
  }
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2, d = 50 + r() * 400;
    const t = new THREE.Mesh(new THREE.IcosahedronGeometry(4 + r() * 4, 1), new THREE.MeshStandardMaterial({ color: '#4c6a36', flatShading: true }));
    t.position.set(Math.cos(a) * d, 4, Math.sin(a) * d);
    scene.add(t);
  }
  // laje e guarda-corpo do prédio em volta da unidade
  const slabM = new THREE.MeshStandardMaterial({ color: '#e9e7e2', roughness: 0.9 });
  const tower = new THREE.Mesh(new THREE.BoxGeometry(26, LIFT, 22), slabM);
  tower.position.set(0, LIFT / 2 - 0.05, 2);
  scene.add(tower);
}

function addPavement(scene: THREE.Scene) {
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: '#9c9a95', roughness: 0.95 }));
  plaza.rotation.x = -Math.PI / 2;
  plaza.receiveShadow = true;
  scene.add(plaza);
  const street = new THREE.Mesh(new THREE.PlaneGeometry(300, 10), new THREE.MeshStandardMaterial({ color: '#2f3134', roughness: 0.8 }));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.01, -16);
  street.receiveShadow = true;
  scene.add(street);
  const neighbors = new THREE.MeshStandardMaterial({ color: '#c4bfb6', roughness: 0.9 });
  for (const [x, w, h] of [[-14, 12, 9], [17, 10, 12], [-28, 14, 16], [30, 14, 7]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 16), neighbors);
    b.position.set(x, h / 2, 1);
    b.castShadow = b.receiveShadow = true;
    scene.add(b);
  }
}

/** Terreno vazio: estacas de demarcação, linha de nylon, árvores existentes e morros ao fundo */
function buildLot(scene: THREE.Scene) {
  const plan = plans.horizonte;
  const { root } = buildFromPlan(plan, { backdrop: 36 });
  root.children.filter((c) => c.name !== 'site').forEach((c) => root.remove(c));
  root.traverse((o) => { if (o.name.startsWith('pool')) o.visible = false; });
  scene.add(root);
  const stake = new THREE.MeshStandardMaterial({ color: '#d9c7a0', roughness: 0.8 });
  const tape = new THREE.MeshStandardMaterial({ color: '#e8572a', roughness: 0.6 });
  const corners: [number, number][] = [[-12, -16], [12, -16], [12, 18], [-12, 18]];
  corners.forEach(([x, z], i) => {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), stake);
    s.position.set(x, 0.45, z);
    s.castShadow = true;
    scene.add(s);
    const [nx, nz] = corners[(i + 1) % 4];
    const len = Math.hypot(nx - x, nz - z);
    const line = new THREE.Mesh(new THREE.BoxGeometry(len, 0.012, 0.012), tape);
    line.position.set((x + nx) / 2, 0.7, (z + nz) / 2);
    line.rotation.y = -Math.atan2(nz - z, nx - x);
    scene.add(line);
  });
  const r = rand(9);
  const hillM = new THREE.MeshStandardMaterial({ color: '#5f7a4a', roughness: 1, flatShading: true });
  for (let i = 0; i < 9; i++) {
    const h = new THREE.Mesh(new THREE.IcosahedronGeometry(60 + r() * 50, 2), hillM);
    h.scale.y = 0.35;
    h.position.set(-200 + i * 50, -10, -180 - r() * 60);
    scene.add(h);
  }
}

async function renderJob(job: Job) {
  const [W, H] = job.size;
  const SS = job.supersample ?? 2;
  renderer.setPixelRatio(1);
  renderer.setSize(W * SS, H * SS, false);
  const { scene, m } = setupScene(job.mood, job.fog ?? 40);
  let cam: THREE.Camera;
  if (job.kind === 'lote') {
    buildLot(scene);
  } else {
    const { root, materials, plan } = build(job);
    materials.lamp.emissiveIntensity = m.lamps;
    if (m.lamps > 5) { materials.poolTile.emissive.set('#2fb7dc'); materials.poolTile.emissiveIntensity = 3.2; materials.water.opacity = 0.55; }
    scene.add(root);
    addRoomLights(root as unknown as THREE.Scene, plan, m.lamps);
    if (job.city) addCity(scene, root, job.mood);
    if (job.pavement) addPavement(scene);
  }
  if (job.kind === 'planta') {
    const l = plans[job.plan].levels[0];
    const margin = 0.6;
    const ortho = new THREE.OrthographicCamera(-l.width / 2 - margin, l.width / 2 + margin, l.depth / 2 + margin, -l.depth / 2 - margin, 0.1, 100);
    ortho.position.set(0, 30, 0);
    ortho.up.set(0, 0, -1);
    ortho.lookAt(0, 0, 0);
    scene.background = new THREE.Color('#f5f7fb');
    scene.fog = null;
    renderer.setSize(Math.round((l.width + 2 * margin) * 200), Math.round((l.depth + 2 * margin) * 200), false);
    cam = ortho;
    renderer.render(scene, cam);
    await window.__save(`${job.file}.webp`, renderer.domElement.toDataURL('image/webp', 0.86));
    disposeScene(scene);
    return;
  }
  const pcam = new THREE.PerspectiveCamera(job.fov ?? 38, W / H, 0.1, 3000);
  pcam.position.set(...job.camera.position);
  pcam.lookAt(new THREE.Vector3(...job.camera.target));
  if (job.city) { pcam.position.y += 46; pcam.lookAt(new THREE.Vector3(job.camera.target[0], job.camera.target[1] + 46, job.camera.target[2])); }
  if (job.shift) pcam.setViewOffset(W, H, 0, job.shift * H, W, H);
  cam = pcam;
  renderer.render(scene, cam);
  const out = document.createElement('canvas');
  out.width = W; out.height = H;
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(renderer.domElement, 0, 0, W, H);
  await window.__save(`${job.file}.webp`, out.toDataURL('image/webp', 0.84));
  if (job.thumb) {
    const t = document.createElement('canvas');
    t.width = job.thumb; t.height = Math.round((job.thumb * H) / W);
    const tc = t.getContext('2d')!;
    tc.imageSmoothingQuality = 'high';
    tc.drawImage(out, 0, 0, t.width, t.height);
    await window.__save(`${job.file}-${job.thumb}.webp`, t.toDataURL('image/webp', 0.8));
  }
  disposeScene(scene);
}

/** Panorama equirretangular 2:1 renderizado de dentro do modelo */
async function renderPanorama(job: Job) {
  const { scene, m } = setupScene(job.mood, 60);
  const { root, materials, plan } = build(job);
  materials.lamp.emissiveIntensity = m.lamps;
  scene.add(root);
  addRoomLights(scene, plan, m.lamps);
  const rt = new THREE.WebGLCubeRenderTarget(2048, { type: THREE.HalfFloatType });
  const cube = new THREE.CubeCamera(0.05, 1000, rt);
  cube.position.set(...job.camera.position);
  renderer.setPixelRatio(1);
  cube.update(renderer, scene);
  const W = 4096, H = 2048;
  renderer.setSize(W, H, false);
  const quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { map: { value: rt.texture } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform samplerCube map; varying vec2 vUv;
        void main(){
          // mesma convenção do fundo equirretangular do three.js: u = atan(z, x) / 2π + 0.5 (centro = +x)
          float th = (vUv.x - 0.5) * 6.28318530718; float lat = (vUv.y - 0.5) * 3.14159265359;
          vec3 dir = vec3(cos(th) * cos(lat), sin(lat), sin(th) * cos(lat));
          gl_FragColor = textureCube(map, dir);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      toneMapped: true,
    }),
  );
  const s = new THREE.Scene();
  s.add(quad);
  renderer.render(s, new THREE.Camera());
  await window.__save(`${job.file}.webp`, renderer.domElement.toDataURL('image/webp', 0.82));
  rt.dispose();
  disposeScene(scene);
}

function disposeScene(scene: THREE.Scene) {
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
  });
}

/** Junta as malhas por material dentro de cada grupo (pavimento, cobertura, entorno) para reduzir draw calls */
function mergeGroup(group: THREE.Object3D) {
  group.updateMatrixWorld(true);
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const shadows = new Map<THREE.Material, boolean>();
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const mat = mesh.material as THREE.Material;
    let geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    if (geo.index) geo = geo.toNonIndexed();
    geo.clearGroups();
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    (buckets.get(mat) ?? buckets.set(mat, []).get(mat)!).push(geo);
    shadows.set(mat, mesh.castShadow);
  });
  const out = new THREE.Group();
  out.name = group.name;
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.name = `${group.name}_${mat.name}`;
    mesh.castShadow = shadows.get(mat) ?? true;
    mesh.receiveShadow = true;
    out.add(mesh);
  }
  return out;
}

async function exportGlb(job: Job) {
  const { root } = build(job);
  const optimized = new THREE.Group();
  optimized.name = 'nexora_model';
  for (const child of [...root.children]) optimized.add(mergeGroup(child));
  const exporter = new GLTFExporter();
  const glb = (await exporter.parseAsync(optimized, { binary: true, maxTextureSize: 1024 })) as ArrayBuffer;
  const bytes = new Uint8Array(glb);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  await window.__save(`${job.file}.glb`, 'data:model/gltf-binary;base64,' + btoa(bin));
}

window.__run = async (filter?: string) => {
  for (const job of filter === 'debug' ? debugJobs : jobs) {
    if (filter && filter !== 'debug' && !job.file.includes(filter)) continue;
    window.__log(`→ ${job.file}`);
    if (job.kind === 'glb') await exportGlb(job);
    else if (job.kind === 'panorama') await renderPanorama(job);
    else await renderJob(job);
  }
};

export type { BuildOptions };
