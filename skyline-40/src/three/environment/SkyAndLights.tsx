import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, SphereGeometry, BackSide, BufferAttribute, BufferGeometry, Color, Fog, ShaderMaterial, Vector3,
  type DirectionalLight, type HemisphereLight, type Points, type PointsMaterial,
} from 'three';
import { useSkyline } from '../../state/store';
import { QUALITY } from '../../config/performance';
import { ATMOSPHERES, atmosphere, lerpAtmosphere } from './atmosphere';
import { rng } from '../utils/geo';

const SUN_TARGET = new Vector3(0, 60, 0);

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w; // sempre no fundo
  }
`;
const skyFragment = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uBottom; uniform vec3 uSunDir; uniform vec3 uGlow;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, clamp(-h * 6.0, 0.0, 1.0));
    float sun = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    col += uGlow * (pow(sun, 600.0) * 2.5 + pow(sun, 16.0) * 0.35 + pow(sun, 3.0) * 0.08);
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function makeSkyMaterial() {
  return new ShaderMaterial({
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
    side: BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uTop: { value: new Color() },
      uHorizon: { value: new Color() },
      uBottom: { value: new Color() },
      uSunDir: { value: new Vector3() },
      uGlow: { value: new Color() },
    },
  });
}

function syncSky(m: ShaderMaterial) {
  m.uniforms.uTop.value.copy(atmosphere.skyTop);
  m.uniforms.uHorizon.value.copy(atmosphere.skyHorizon);
  m.uniforms.uBottom.value.copy(atmosphere.skyBottom);
  m.uniforms.uSunDir.value.copy(atmosphere.sunDir);
  m.uniforms.uGlow.value.copy(atmosphere.sunGlow);
}

/** Céu em gradiente, estrelas, sol/lua, luz hemisférica, neblina e mapa de ambiente para reflexos. */
export function SkyAndLights() {
  const quality = useSkyline((s) => s.quality);
  const q = QUALITY[quality];
  const { scene, gl } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const stars = useRef<Points>(null);
  const skyMat = useMemo(makeSkyMaterial, []);
  const fog = useMemo(() => new Fog(atmosphere.fog.clone(), 650, 3000), []);
  const starsGeo = useMemo(() => {
    const rand = rng(77);
    const n = 1400;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rand() * Math.PI * 2;
      const v = Math.acos(rand() * 0.95);
      const r = 2600;
      pos[i * 3] = Math.sin(v) * Math.cos(u) * r;
      pos[i * 3 + 1] = Math.cos(v) * r;
      pos[i * 3 + 2] = Math.sin(v) * Math.sin(u) * r;
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    return g;
  }, []);

  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [scene, fog]);
  useEffect(() => () => { skyMat.dispose(); starsGeo.dispose(); }, [skyMat, starsGeo]);

  useFrame((_, delta) => {
    const s = useSkyline.getState();
    const k = s.reducedMotion ? 1 : 1 - Math.exp(-delta * 1.6);
    lerpAtmosphere(ATMOSPHERES[s.timeOfDay], k);
    syncSky(skyMat);
    fog.color.copy(atmosphere.fog);
    gl.toneMappingExposure = atmosphere.exposure;
    scene.environmentIntensity = atmosphere.envIntensity;
    if (sun.current) {
      sun.current.position.copy(atmosphere.sunDir).multiplyScalar(320).add(SUN_TARGET);
      sun.current.target.position.set(0, 60, 0);
      sun.current.target.updateMatrixWorld();
      sun.current.color.copy(atmosphere.sunColor);
      sun.current.intensity = atmosphere.sunIntensity;
    }
    if (hemi.current) {
      hemi.current.color.copy(atmosphere.hemiSky);
      hemi.current.groundColor.copy(atmosphere.hemiGround);
      hemi.current.intensity = atmosphere.hemiIntensity * (s.mode === 'garage' ? 1.15 : 1);
    }
    if (stars.current) {
      const m = stars.current.material as PointsMaterial;
      m.opacity = atmosphere.stars;
      stars.current.visible = atmosphere.stars > 0.02;
    }
  });

  return (
    <>
      <mesh material={skyMat} scale={2900} frustumCulled={false} renderOrder={-10} raycast={() => null}>
        <sphereGeometry args={[1, 48, 24]} />
      </mesh>
      <points ref={stars} geometry={starsGeo} frustumCulled={false} raycast={() => null}>
        <pointsMaterial size={2.2} sizeAttenuation={false} color="#dfe8ff" transparent opacity={0} depthWrite={false} blending={AdditiveBlending} fog={false} />
      </points>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow={q.shadows}
        shadow-mapSize-width={q.shadowMapSize}
        shadow-mapSize-height={q.shadowMapSize}
        shadow-camera-left={-120}
        shadow-camera-right={120}
        shadow-camera-top={120}
        shadow-camera-bottom={-120}
        shadow-camera-near={10}
        shadow-camera-far={800}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
      />
      <EnvMap />
    </>
  );
}

/**
 * Mapa de ambiente (reflexos e luz indireta) gerado com PMREM a partir do céu do horário escolhido,
 * mais painéis de luz. É refeito a cada troca de horário e o anterior é liberado.
 */
function EnvMap() {
  const timeOfDay = useSkyline((s) => s.timeOfDay);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const t = ATMOSPHERES[timeOfDay];
    const envScene = new Scene();
    const sky = makeSkyMaterial();
    sky.uniforms.uTop.value.copy(t.skyTop);
    sky.uniforms.uHorizon.value.copy(t.skyHorizon);
    sky.uniforms.uBottom.value.copy(t.skyBottom);
    sky.uniforms.uSunDir.value.copy(t.sunDir);
    sky.uniforms.uGlow.value.copy(t.sunGlow);
    const sphereGeo = new SphereGeometry(100, 32, 16);
    envScene.add(new Mesh(sphereGeo, sky));
    const panels: [string, number, [number, number, number], [number, number], number][] =
      timeOfDay === 'night'
        ? [['#ffd7a0', 0.9, [0, 6, -70], [140, 4], 0], ['#8fb0ff', 0.6, [70, 10, 0], [120, 6], -Math.PI / 2]]
        : [[timeOfDay === 'day' ? '#ffffff' : '#ffc79a', timeOfDay === 'day' ? 2.2 : 1.2, [0, 40, 0], [80, 80], -1], ['#e8f0ff', 1.4, [-60, 8, -30], [60, 12], Math.PI / 2]];
    const extras: { dispose(): void }[] = [sphereGeo, sky];
    for (const [color, k, pos, size, rotY] of panels) {
      const g = new PlaneGeometry(size[0], size[1]);
      const m = new MeshBasicMaterial({ color, side: 2, toneMapped: false });
      m.color.multiplyScalar(k);
      const mesh = new Mesh(g, m);
      mesh.position.set(...pos);
      if (rotY === -1) mesh.rotation.x = Math.PI / 2;
      else mesh.rotation.y = rotY;
      envScene.add(mesh);
      extras.push(g, m);
    }
    const pmrem = new PMREMGenerator(gl);
    const target = pmrem.fromScene(envScene, 0.02);
    scene.environment = target.texture;
    return () => {
      if (scene.environment === target.texture) scene.environment = null;
      target.dispose();
      pmrem.dispose();
      extras.forEach((e) => e.dispose());
    };
  }, [timeOfDay, gl, scene]);
  return null;
}
