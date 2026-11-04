// Rig do Pafieis: definição da pose, performance (keyframes) e camada procedural
// (respiração, piscadas, micro-movimentos de olhos e cabeça, energia da fala).
import { E, Ease, Key, rng, sampleKeys, sampleSteps } from '../lib/anim';

export type HandShape = 'relaxed' | 'open' | 'point' | 'fist' | 'thumb';
export type Side = 'L' | 'R'; // L = lado esquerdo da TELA, R = lado direito da tela

export type Pose = {
  x: number; y: number; scale: number; // posição dos pés no palco e escala
  lean: number; squash: number; // inclinação do corpo (graus) e squash/stretch (1 = normal)
  headTilt: number; headTurn: number; headNod: number; // graus, -1..1, px
  eyeX: number; eyeY: number; blinkL: number; blinkR: number; squint: number;
  browL: number; browR: number; browAngle: number; // levantar (-1..1), ângulo (+ = bravo, - = preocupado)
  mouthOpen: number; mouthWide: number; mouthRound: number; smile: number;
  armLsh: number; armLel: number; armRsh: number; armRel: number;
  handL: HandShape; handR: HandShape;
  beanie: number; // ajuste do gorro (graus)
  cheeks: number; // rubor
};

export const REST: Pose = {
  x: 540, y: 1750, scale: 1, lean: 0, squash: 1,
  headTilt: 0, headTurn: 0, headNod: 0,
  eyeX: 0, eyeY: 0, blinkL: 0, blinkR: 0, squint: 0,
  browL: 0, browR: 0, browAngle: 0,
  mouthOpen: 0, mouthWide: 0.2, mouthRound: 0, smile: 0.45,
  armLsh: 10, armLel: -12, armRsh: 10, armRel: -12,
  handL: 'relaxed', handR: 'relaxed',
  beanie: 0, cheeks: 0.35,
};

// Geometria do braço (coordenadas locais do personagem, origem nos pés)
export const SHOULDER = { x: -168, y: -742 };
export const L1 = 150; // braço
export const L2 = 140; // antebraço

/** IK de dois ossos. Recebe alvo em coordenadas do personagem e devolve ângulos (convenção do rig). */
export function ik(side: Side, tx: number, ty: number): { sh: number; el: number } {
  // trabalha no referencial do braço esquerdo (o direito é espelhado)
  const x = side === 'L' ? tx : -tx;
  const vx = x - SHOULDER.x, vy = ty - SHOULDER.y;
  let d = Math.hypot(vx, vy);
  d = Math.min(d, L1 + L2 - 2);
  const phi = Math.atan2(-vx, vy);
  const alpha = Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + d * d - L2 * L2) / (2 * L1 * d))));
  const sh = phi + alpha; // cotovelo para fora
  const ex = -Math.sin(sh) * L1, ey = Math.cos(sh) * L1;
  const a2 = Math.atan2(-(vx * (d / Math.hypot(vx, vy)) - ex), vy * (d / Math.hypot(vx, vy)) - ey);
  return { sh: (sh * 180) / Math.PI, el: ((a2 - sh) * 180) / Math.PI };
}

type NumKey = Exclude<keyof Pose, 'handL' | 'handR'>;

/** Performance = coleção de keyframes por propriedade + trilhas de formato das mãos. */
export class Performance {
  keys: Partial<Record<NumKey, Key[]>> = {};
  hands: Record<Side, { t: number; v: HandShape }[]> = { L: [], R: [] };
  speech: { t: number; open: number; wide: number; round: number }[] = [];
  base: Pose;
  constructor(base: Partial<Pose> = {}) {
    this.base = { ...REST, ...base };
  }
  /** Adiciona um keyframe. Se a key anterior estiver longe, insere uma "pausa" antes,
   *  para que cada ação aconteça em ~TRANS segundos (sem poses derretendo devagar). */
  set(p: NumKey, t: number, v: number, e: Ease = E.inOut, trans = 0.32) {
    const ks = (this.keys[p] ??= []);
    const last = ks.length ? ks.reduce((a, b) => (b.t > a.t ? b : a)) : null;
    if (last && t - last.t > trans + 0.05) ks.push({ t: t - trans, v: last.v, e: E.linear });
    else if (!last && t > trans + 0.05) ks.push({ t: t - trans, v: this.base[p], e: E.linear });
    ks.push({ t, v, e });
    return this;
  }
  /** Mantém o valor atual até t (útil antes de uma nova ação). */
  hold(p: NumKey, t: number) {
    const ks = this.keys[p];
    const v = ks && ks.length ? sampleKeys(this.sorted(p), t, this.base[p]) : this.base[p];
    return this.set(p, t, v, E.linear);
  }
  sorted(p: NumKey) {
    const ks = this.keys[p] ?? [];
    ks.sort((a, b) => a.t - b.t);
    return ks;
  }
  hand(side: Side, t: number, v: HandShape) {
    this.hands[side].push({ t, v });
    return this;
  }
  arm(side: Side, t: number, sh: number, el: number, e: Ease = E.inOut) {
    this.set(side === 'L' ? 'armLsh' : 'armRsh', t, sh, e);
    this.set(side === 'L' ? 'armLel' : 'armRel', t, el, e);
    return this;
  }
  armTo(side: Side, t: number, x: number, y: number, e: Ease = E.inOut) {
    const a = ik(side, x, y);
    return this.arm(side, t, a.sh, a.el, e);
  }
  rest(side: Side, t: number, e: Ease = E.inOut) {
    this.hand(side, t, 'relaxed');
    return this.arm(side, t, REST.armLsh, REST.armLel, e);
  }
  many(t: number, vals: Partial<Record<NumKey, number>>, e: Ease = E.inOut) {
    for (const k in vals) this.set(k as NumKey, t, (vals as Record<string, number>)[k], e);
    return this;
  }

  /** Amostra a pose no tempo t (segundos), já com a camada procedural. */
  sample(t: number, lip?: { o: number; w: number; r: number } | null): Pose {
    const p: Pose = { ...this.base };
    for (const k in this.keys) {
      const key = k as NumKey;
      p[key] = sampleKeys(this.sorted(key), t, this.base[key]);
    }
    p.handL = sampleSteps(this.hands.L, t, this.base.handL);
    p.handR = sampleSteps(this.hands.R, t, this.base.handR);
    procedural(p, t, lip);
    return p;
  }
}

// ---------------- camada procedural ----------------
const R = rng(2024);
const BLINKS: number[] = [];
for (let t = 0.9; t < 120; t += 2.2 + R() * 2.4) {
  BLINKS.push(t);
  if (R() < 0.18) BLINKS.push(t + 0.28); // piscada dupla de vez em quando
}
const SACC: { t: number; x: number; y: number }[] = [];
for (let t = 0; t < 120; t += 0.7 + R() * 1.3) SACC.push({ t, x: (R() - 0.5) * 0.35, y: (R() - 0.5) * 0.2 });

function procedural(p: Pose, t: number, lip?: { o: number; w: number; r: number } | null) {
  // respiração e balanço
  p.squash *= 1 + Math.sin(t * 2.4) * 0.009;
  p.lean += Math.sin(t * 0.85) * 1.1;
  p.headTilt += Math.sin(t * 1.1 + 1) * 1.4;
  p.headNod += Math.sin(t * 2.4 + 0.6) * 2.5;
  // piscadas (a pálpebra fecha rápido e abre um pouco mais devagar)
  let blink = 0;
  for (const b of BLINKS) {
    const d = t - b;
    if (d > -0.07 && d < 0.16) blink = Math.max(blink, d < 0 ? 1 + d / 0.07 : 1 - d / 0.16);
  }
  p.blinkL = Math.max(p.blinkL, blink);
  p.blinkR = Math.max(p.blinkR, blink);
  // micro-movimentos dos olhos (sacadas)
  let s = SACC[0];
  for (const c of SACC) if (c.t <= t) s = c;
  p.eyeX += s.x * 0.6;
  p.eyeY += s.y * 0.6;
  // fala
  if (lip) {
    p.mouthOpen = Math.max(p.mouthOpen, lip.o);
    p.mouthWide = p.mouthWide * (1 - lip.o) + lip.w * lip.o + lip.w * 0.3;
    p.mouthRound = Math.max(p.mouthRound, lip.r);
    const energy = lip.o;
    p.headNod += energy * Math.sin(t * 11) * 5;
    p.headTilt += energy * Math.sin(t * 5.3) * 2.2;
    p.browL += energy * 0.28;
    p.browR += energy * 0.28;
  }
}
