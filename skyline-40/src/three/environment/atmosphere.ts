import { Color, Vector3 } from 'three';
import type { TimeOfDay } from '../../state/store';

/** Parâmetros de iluminação por horário. A cena interpola suavemente entre eles. */
export interface Atmosphere {
  sunDir: Vector3;
  sunColor: Color;
  sunIntensity: number;
  hemiSky: Color;
  hemiGround: Color;
  hemiIntensity: number;
  skyTop: Color;
  skyHorizon: Color;
  skyBottom: Color;
  sunGlow: Color;
  fog: Color;
  exposure: number;
  stars: number;
  envIntensity: number;
  clouds: number;
  cloudLit: Color;
  cloudShade: Color;
}

const c = (h: string) => new Color(h);

export const ATMOSPHERES: Record<TimeOfDay, Atmosphere> = {
  day: {
    sunDir: new Vector3(0.55, 0.78, 0.42).normalize(),
    sunColor: c('#fff3e2'),
    sunIntensity: 3.1,
    hemiSky: c('#d4e4ff'),
    hemiGround: c('#7d7a70'),
    hemiIntensity: 1.0,
    skyTop: c('#245fb8'),
    skyHorizon: c('#b7d0ea'),
    skyBottom: c('#d6e2ec'),
    sunGlow: c('#fff6df'),
    fog: c('#b4c9de'),
    exposure: 0.95,
    stars: 0,
    envIntensity: 1,
    clouds: 0.75,
    cloudLit: c('#f4f5f7'),
    cloudShade: c('#7d8794'),
  },
  sunset: {
    sunDir: new Vector3(-0.82, 0.13, 0.55).normalize(),
    sunColor: c('#ffad6b'),
    sunIntensity: 2.6,
    hemiSky: c('#ffc49a'),
    hemiGround: c('#4a3c40'),
    hemiIntensity: 0.65,
    skyTop: c('#2a3a68'),
    skyHorizon: c('#ff9a5a'),
    skyBottom: c('#f2b48a'),
    sunGlow: c('#ffcc8a'),
    fog: c('#d29a80'),
    exposure: 1.05,
    stars: 0.15,
    envIntensity: 0.8,
    clouds: 0.6,
    cloudLit: c('#ffc28a'),
    cloudShade: c('#5d4a5c'),
  },
  night: {
    sunDir: new Vector3(0.35, 0.62, -0.45).normalize(),
    sunColor: c('#9fb6ff'),
    sunIntensity: 0.35,
    hemiSky: c('#22325a'),
    hemiGround: c('#0b0d12'),
    hemiIntensity: 0.45,
    skyTop: c('#01030a'),
    skyHorizon: c('#14223f'),
    skyBottom: c('#1a2236'),
    sunGlow: c('#3a4f86'),
    fog: c('#0c1322'),
    exposure: 1.15,
    stars: 1,
    envIntensity: 0.35,
    clouds: 0.25,
    cloudLit: c('#2a3550'),
    cloudShade: c('#0b1020'),
  },
};

/** Estado atual (mutável) — interpolado a cada quadro pelo componente de iluminação. */
export const atmosphere: Atmosphere = {
  ...ATMOSPHERES.day,
  sunDir: ATMOSPHERES.day.sunDir.clone(),
  sunColor: ATMOSPHERES.day.sunColor.clone(),
  hemiSky: ATMOSPHERES.day.hemiSky.clone(),
  hemiGround: ATMOSPHERES.day.hemiGround.clone(),
  skyTop: ATMOSPHERES.day.skyTop.clone(),
  skyHorizon: ATMOSPHERES.day.skyHorizon.clone(),
  skyBottom: ATMOSPHERES.day.skyBottom.clone(),
  sunGlow: ATMOSPHERES.day.sunGlow.clone(),
  fog: ATMOSPHERES.day.fog.clone(),
  cloudLit: ATMOSPHERES.day.cloudLit.clone(),
  cloudShade: ATMOSPHERES.day.cloudShade.clone(),
};

export function lerpAtmosphere(target: Atmosphere, k: number) {
  const a = atmosphere;
  a.sunDir.lerp(target.sunDir, k).normalize();
  a.sunColor.lerp(target.sunColor, k);
  a.sunIntensity += (target.sunIntensity - a.sunIntensity) * k;
  a.hemiSky.lerp(target.hemiSky, k);
  a.hemiGround.lerp(target.hemiGround, k);
  a.hemiIntensity += (target.hemiIntensity - a.hemiIntensity) * k;
  a.skyTop.lerp(target.skyTop, k);
  a.skyHorizon.lerp(target.skyHorizon, k);
  a.skyBottom.lerp(target.skyBottom, k);
  a.sunGlow.lerp(target.sunGlow, k);
  a.fog.lerp(target.fog, k);
  a.exposure += (target.exposure - a.exposure) * k;
  a.stars += (target.stars - a.stars) * k;
  a.envIntensity += (target.envIntensity - a.envIntensity) * k;
  a.clouds += (target.clouds - a.clouds) * k;
  a.cloudLit.lerp(target.cloudLit, k);
  a.cloudShade.lerp(target.cloudShade, k);
}
