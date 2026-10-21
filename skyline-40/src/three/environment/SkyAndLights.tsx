import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending, EquirectangularReflectionMapping, Mesh, PMREMGenerator, Scene, SphereGeometry, BackSide, BufferAttribute, BufferGeometry, Color, Fog, ShaderMaterial, Vector3,
  type DirectionalLight, type HemisphereLight, type Points, type PointsMaterial,
} from 'three';
import { useSkyline, type TimeOfDay } from '../../state/store';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
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
  uniform float uClouds; uniform vec3 uCloudLit; uniform vec3 uCloudShade; uniform float uTime;
  varying vec3 vDir;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 6; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }
  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 col = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, clamp(-h * 6.0, 0.0, 1.0));
    float sun = max(dot(dir, normalize(uSunDir)), 0.0);
    // nuvens volumosas projetadas num plano alto (mais densas perto do horizonte)
    if (h > 0.0 && uClouds > 0.0) {
      vec2 p = dir.xz / (h + 0.12) * 1.6 + vec2(uTime * 0.004, uTime * 0.002);
      float d = fbm(p);
      float cover = smoothstep(0.62 - uClouds * 0.32, 0.95 - uClouds * 0.2, d);
      float thick = fbm(p * 1.7 + 3.1);
      vec3 cloud = mix(uCloudShade, uCloudLit, clamp(thick * 1.25 + pow(sun, 4.0) * 0.6, 0.0, 1.0));
      float fade = smoothstep(0.0, 0.12, h);
      col = mix(col, cloud, cover * fade * 0.95);
    }
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
      uClouds: { value: 0 },
      uCloudLit: { value: new Color() },
      uCloudShade: { value: new Color() },
      uTime: { value: 0 },
    },
  });
}

function syncSky(m: ShaderMaterial) {
  m.uniforms.uTop.value.copy(atmosphere.skyTop);
  m.uniforms.uHorizon.value.copy(atmosphere.skyHorizon);
  m.uniforms.uBottom.value.copy(atmosphere.skyBottom);
  m.uniforms.uSunDir.value.copy(atmosphere.sunDir);
  m.uniforms.uGlow.value.copy(atmosphere.sunGlow);
  m.uniforms.uClouds.value = atmosphere.clouds;
  m.uniforms.uCloudLit.value.copy(atmosphere.cloudLit);
  m.uniforms.uCloudShade.value.copy(atmosphere.cloudShade);
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
    skyMat.uniforms.uTime.value += s.reducedMotion ? 0 : delta;
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
const HDRI: Record<TimeOfDay, () => Promise<{ default: string }>> = {
  // mapas fotográficos CC0 (Poly Haven via @pmndrs/assets), baixados sob demanda
  day: () => import('@pmndrs/assets/hdri/city.exr'),
  sunset: () => import('@pmndrs/assets/hdri/sunset.exr'),
  night: () => import('@pmndrs/assets/hdri/night.exr'),
};
const HDRI_ROTATION: Record<TimeOfDay, number> = { day: 0.6, sunset: 2.2, night: 0 };

function EnvMap() {
  const timeOfDay = useSkyline((s) => s.timeOfDay);
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    // 1) mapa procedural imediato (céu do horário), 2) troca pelo HDRI fotográfico quando carregar
    const t = ATMOSPHERES[timeOfDay];
    const envScene = new Scene();
    const sky = makeSkyMaterial();
    sky.uniforms.uTop.value.copy(t.skyTop);
    sky.uniforms.uHorizon.value.copy(t.skyHorizon);
    sky.uniforms.uBottom.value.copy(t.skyBottom);
    sky.uniforms.uSunDir.value.copy(t.sunDir);
    sky.uniforms.uGlow.value.copy(t.sunGlow);
    sky.uniforms.uClouds.value = t.clouds;
    sky.uniforms.uCloudLit.value.copy(t.cloudLit);
    sky.uniforms.uCloudShade.value.copy(t.cloudShade);
    const sphereGeo = new SphereGeometry(100, 32, 16);
    envScene.add(new Mesh(sphereGeo, sky));
    const pmrem = new PMREMGenerator(gl);
    const procedural = pmrem.fromScene(envScene, 0.02);
    sphereGeo.dispose();
    sky.dispose();
    scene.environment = procedural.texture;
    let hdr: { dispose(): void } | null = null;
    let cancelled = false;
    HDRI[timeOfDay]()
      .then((m) => new EXRLoader().loadAsync(m.default))
      .then((tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        tex.mapping = EquirectangularReflectionMapping;
        const target = pmrem.fromEquirectangular(tex);
        tex.dispose();
        hdr = target;
        scene.environment = target.texture;
        scene.environmentRotation.set(0, HDRI_ROTATION[timeOfDay], 0);
      })
      .catch(() => {
        /* sem o HDRI, fica o mapa procedural */
      });
    return () => {
      cancelled = true;
      scene.environment = null;
      procedural.dispose();
      hdr?.dispose();
      pmrem.dispose();
    };
  }, [timeOfDay, gl, scene]);
  return null;
}
