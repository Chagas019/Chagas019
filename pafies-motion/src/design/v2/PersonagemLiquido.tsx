/**
 * PersonagemLiquido — humanoide original de formas fluidas chapadas (refs 1 e 2).
 * Sem contorno, sem degradê: corpo âmbar com sombra em forma, mãos/pés que viram
 * respingos azuis, faixa na cintura, gotas que "voam" atrás no sentido do movimento.
 *
 * Controlado 100% por props (sem useCurrentFrame). Anime com:
 *   pose={runCycle(t)}  — t 0..1 (quantize em 8 passos p/ "on twos")
 *   seed={Math.floor(frame / 2)}  — faz as bordas "ferverem" on twos
 *
 * Sistema de coordenadas interno: unidades onde o boneco em pé mede ~200u,
 * origem (0,0) = ponto do chão sob a bacia. `size` = px por 200u.
 */
import React from "react";
import { useSvgId, mixHex } from "../elements/geom";
import { BG_V2, INK_V2, TONE_V2 } from "./tokensV2";
import { P, capsulePath, dropPath, blobPath, rng, D2R, clamp, lerpN } from "./liquid";

/* ------------------------------------------------------------------ */
/* Pose                                                               */
/* ------------------------------------------------------------------ */

/**
 * Ângulos em graus. Membros: 0 = apontando para baixo; positivo gira para +x
 * (para a FRENTE quando o boneco olha para a direita; facing=-1 espelha).
 * L = lado de trás/esquerda da tela, R = lado da frente/direita.
 *  - shoulder*: relativo ao tronco (gira junto com `lean`).
 *  - elbow*: flexão (+ dobra o antebraço para +x).
 *  - hip*: absoluto (relativo ao mundo).
 *  - knee*: flexão (+ dobra a canela para trás, −x).
 *  - ankle*: + levanta a ponta do pé.
 */
export type PoseLiquida = {
  /** 0 = perfil (correndo) … 1 = de frente (acenando). */
  turn: number;
  /** Inclinação do tronco (+ para frente). */
  lean: number;
  /** Deslocamento vertical da bacia em unidades (+ = desce, − = sobe/pulo). */
  bounce: number;
  /** Deslocamento horizontal da bacia (u). */
  shift?: number;
  /** Inclinação da cabeça. */
  head?: number;
  shoulderL: number;
  elbowL: number;
  shoulderR: number;
  elbowR: number;
  hipL: number;
  kneeL: number;
  hipR: number;
  kneeR: number;
  ankleL?: number;
  ankleR?: number;
  /** Escala vertical do corpo todo a partir do chão (squash <1, stretch >1). */
  stretch?: number;
  /** Direção do movimento em graus (0 = →, 90 = ↓, -90 = ↑). Gera gotas que ficam para trás. null = só gravidade. */
  trail?: number | null;
  /** Mão que aponta (dedo líquido estendido). */
  pointing?: "L" | "R" | null;
};

export const POSE_NEUTRA: PoseLiquida = {
  turn: 0.6,
  lean: 0,
  bounce: 0,
  head: 0,
  shoulderL: -8,
  elbowL: 10,
  shoulderR: 8,
  elbowR: 10,
  hipL: -4,
  kneeL: 0,
  hipR: 4,
  kneeR: 0,
  ankleL: 0,
  ankleR: 0,
  stretch: 1,
  trail: null,
  pointing: null,
};

const NUM_KEYS = [
  "turn", "lean", "bounce", "shift", "head",
  "shoulderL", "elbowL", "shoulderR", "elbowR",
  "hipL", "kneeL", "hipR", "kneeR", "ankleL", "ankleR", "stretch",
] as const;

/** Interpola duas poses (t 0..1). trail/pointing vêm da pose mais próxima. */
export const lerpPose = (a: PoseLiquida, b: PoseLiquida, t: number): PoseLiquida => {
  const out: PoseLiquida = { ...(t < 0.5 ? a : b) };
  for (const k of NUM_KEYS) {
    const va = (a[k] ?? POSE_NEUTRA[k] ?? 0) as number;
    const vb = (b[k] ?? POSE_NEUTRA[k] ?? 0) as number;
    (out as Record<string, unknown>)[k] = va + (vb - va) * t;
  }
  if (a.trail != null && b.trail != null) out.trail = a.trail + (b.trail - a.trail) * t;
  return out;
};

const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

/** Interpolação periódica Catmull-Rom sobre valores-chave igualmente espaçados. */
const loopKeys = (keys: number[], t: number) => {
  const n = keys.length;
  const x = (((t % 1) + 1) % 1) * n;
  const i = Math.floor(x);
  const u = x - i;
  const g = (j: number) => keys[((j % n) + n) % n];
  return cr(g(i - 1), g(i), g(i + 1), g(i + 2), u);
};

// Perna (lado R) nas 8 poses do ciclo, começando no contato do pé R na frente.
//            contato  recuo  passagem impulso  saída  chute-trás  passagem  alcance
const HIP = [   34,     14,    -12,     -38,     -50,     -26,       28,       58];
const KNEE = [  12,     48,     30,      10,      62,     118,      112,       52];
const ANKLE = [ 14,     -4,     -8,     -28,     -40,     -20,        6,       18];

/**
 * Ciclo de corrida em perfil (olhando p/ direita), t 0..1 = uma passada completa
 * (2 passos). As 8 poses-chave caem em t = 0, 1/8, … 7/8. Para "on twos",
 * passe t quantizado: runCycle(Math.floor(t * 8) / 8).
 */
export const runCycle = (t: number): PoseLiquida => {
  const T = ((t % 1) + 1) % 1;
  const legR = (p: number) => ({ hip: loopKeys(HIP, p), knee: loopKeys(KNEE, p), ankle: loopKeys(ANKLE, p) });
  const R = legR(T);
  const L = legR(T + 0.5);
  const w = 2 * Math.PI * T;
  return {
    turn: 0.12,
    lean: 16 + 3 * Math.cos(2 * w),
    // bacia mais baixa no recuo (1/8 e 5/8), mais alta na fase de voo
    bounce: 7 * Math.cos(2 * (w - (2 * Math.PI) / 8)),
    shift: 0,
    head: -6 + 3 * Math.sin(2 * w),
    // braço oposto à perna: quando a perna R está na frente (T=0) o braço R está atrás
    shoulderR: -8 - 62 * Math.cos(w),
    elbowR: 92 + 26 * Math.sin(w + 0.6),
    shoulderL: -8 + 62 * Math.cos(w),
    elbowL: 92 - 26 * Math.sin(w + 0.6),
    hipR: R.hip,
    kneeR: R.knee,
    ankleR: R.ankle,
    hipL: L.hip,
    kneeL: L.knee,
    ankleL: L.ankle,
    stretch: 1 + 0.04 * Math.cos(2 * (w - (2 * Math.PI) / 8) + Math.PI),
    trail: 0,
    pointing: null,
  };
};

/** As 8 poses-chave do ciclo (para pranchas / on twos). */
export const RUN_KEYS: PoseLiquida[] = Array.from({ length: 8 }, (_, i) => runCycle(i / 8));

/** Aceno de frente. t 0..1 = um vai-e-volta da mão (faça loop). */
export const wavePose = (t: number): PoseLiquida => {
  const w = 2 * Math.PI * t;
  return {
    turn: 0.9,
    lean: -3 + 2 * Math.sin(w),
    bounce: 1.5 * Math.sin(2 * w),
    shift: 0,
    head: 7 * Math.sin(w + 0.4),
    shoulderR: 148 + 12 * Math.sin(w),
    elbowR: 28 + 30 * Math.sin(w + 0.9),
    shoulderL: -14,
    elbowL: -18,
    hipL: -7,
    kneeL: -3,
    hipR: 8,
    kneeR: 3,
    ankleL: 0,
    ankleR: 0,
    stretch: 1,
    trail: null,
    pointing: null,
  };
};

const JUMP_KEYS: Array<[number, PoseLiquida]> = [
  // pronto
  [0, { ...POSE_NEUTRA, turn: 0.95, shoulderL: -14, elbowL: -10, shoulderR: 14, elbowR: 10, hipL: -7, hipR: 7 }],
  // antecipação: agacha, braços para trás/baixo
  [0.22, { ...POSE_NEUTRA, turn: 0.95, lean: 6, bounce: 26, stretch: 0.9, shoulderL: -38, elbowL: -30, shoulderR: 38, elbowR: 30, hipL: -34, kneeL: -66, hipR: 34, kneeR: 66, head: -4 }],
  // impulso: estica tudo
  [0.36, { ...POSE_NEUTRA, turn: 0.95, bounce: -46, stretch: 1.12, shoulderL: -165, elbowL: -8, shoulderR: 165, elbowR: 8, hipL: -6, kneeL: 0, hipR: 6, kneeR: 0, ankleL: -40, ankleR: -40, trail: -90 }],
  // ápice: estrela
  [0.56, { ...POSE_NEUTRA, turn: 1, bounce: -78, stretch: 1, shoulderL: -132, elbowL: -22, shoulderR: 132, elbowR: 22, hipL: -30, kneeL: -14, hipR: 30, kneeR: 14, ankleL: -20, ankleR: -20, head: 6, trail: -90 }],
  // queda
  [0.78, { ...POSE_NEUTRA, turn: 1, bounce: -30, stretch: 1.06, shoulderL: -110, elbowL: -30, shoulderR: 110, elbowR: 30, hipL: -10, kneeL: -6, hipR: 10, kneeR: 6, ankleL: -30, ankleR: -30, trail: 90 }],
  // aterrissagem (squash)
  [0.88, { ...POSE_NEUTRA, turn: 1, lean: 4, bounce: 20, stretch: 0.86, shoulderL: -72, elbowL: -40, shoulderR: 72, elbowR: 40, hipL: -30, kneeL: -56, hipR: 30, kneeR: 56 }],
  [1, { ...POSE_NEUTRA, turn: 0.95, shoulderL: -20, elbowL: -16, shoulderR: 20, elbowR: 16, hipL: -7, hipR: 7 }],
];

const easeIO = (u: number) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

/** Salto de frente (antecipação → estrela → squash). t 0..1. */
export const jumpPose = (t: number): PoseLiquida => {
  const T = clamp(t);
  for (let i = 0; i < JUMP_KEYS.length - 1; i++) {
    const [ta, a] = JUMP_KEYS[i];
    const [tb, b] = JUMP_KEYS[i + 1];
    if (T <= tb) return lerpPose(a, b, easeIO((T - ta) / (tb - ta)));
  }
  return JUMP_KEYS[JUMP_KEYS.length - 1][1];
};

const backOut = (u: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};

/** Aponta para frente (+x) com overshoot. t 0..1 (0 = braço baixo, 1 = apontando). */
export const pointPose = (t: number): PoseLiquida => {
  const u = backOut(clamp(t));
  return {
    turn: 0.4,
    lean: 4 + 6 * u,
    bounce: 2 * (1 - u),
    shift: 0,
    head: 8 * u,
    shoulderR: lerpN(14, 96, u),
    elbowR: lerpN(40, 2, u),
    shoulderL: lerpN(-10, -34, u),
    elbowL: lerpN(20, 105, u),
    hipL: -16,
    kneeL: 4,
    hipR: 20,
    kneeR: 10,
    ankleL: 0,
    ankleR: 6,
    stretch: 1,
    trail: null,
    pointing: "R",
  };
};

/* ------------------------------------------------------------------ */
/* Cores                                                              */
/* ------------------------------------------------------------------ */

export type PersonagemCores = {
  /** Corpo (luz). */
  body: string;
  /** Sombra em forma do corpo. */
  shade: string;
  /** Respingos das mãos/pés. */
  splash: string;
  /** Sombra dos respingos. */
  splashShade: string;
  /** Faixa da cintura; null = sem faixa. */
  sash: string | null;
  sashShade: string;
  /** Sombra chapada no chão; null = sem sombra. */
  ground: string | null;
};

export const PERSONAGEM_CORES = {
  /** Sobre fundo laranja #FF6A13. */
  sobreLaranja: {
    body: INK_V2.amber,
    shade: TONE_V2.amberShade,
    splash: INK_V2.blue,
    splashShade: TONE_V2.blueDeep,
    sash: TONE_V2.sash,
    sashShade: TONE_V2.sashShade,
    ground: TONE_V2.groundOnOrange,
  },
  /** Sobre azul elétrico #1F5BFF. */
  sobreAzul: {
    body: INK_V2.amber,
    shade: INK_V2.orange,
    splash: INK_V2.white,
    splashShade: "#C9D8FF",
    sash: INK_V2.navy,
    sashShade: "#06102E",
    ground: TONE_V2.groundOnElectric,
  },
  /** Sobre marinho #0B1A4A. */
  sobreMarinho: {
    body: INK_V2.amber,
    shade: INK_V2.orange,
    splash: INK_V2.blueLight,
    splashShade: INK_V2.blue,
    sash: TONE_V2.sash,
    sashShade: TONE_V2.sashShade,
    ground: TONE_V2.groundOnNavy,
  },
  /** Sobre turquesa #2EC4D6. */
  sobreTurquesa: {
    body: INK_V2.amber,
    shade: INK_V2.orange,
    splash: INK_V2.blue,
    splashShade: TONE_V2.blueDeep,
    sash: INK_V2.white,
    sashShade: "#D5EEF2",
    ground: TONE_V2.groundOnTurquoise,
  },
} as const satisfies Record<string, PersonagemCores>;

/* ------------------------------------------------------------------ */
/* Componente                                                         */
/* ------------------------------------------------------------------ */

export type PersonagemLiquidoProps = {
  /** Altura em px do boneco em pé (200u). */
  size: number;
  pose?: PoseLiquida;
  /** 0..1 — câmera baixa (pernas/pés maiores, cabeça menor). */
  lowAngle?: number;
  /** 0..1 — derrete/escorre em respingos (transições). */
  melt?: number;
  /** Semente (mude a cada 2 frames p/ "on twos"). */
  seed?: number;
  colors?: Partial<PersonagemCores>;
  /** 1 = olha para a direita, -1 = esquerda. */
  facing?: 1 | -1;
  /** Quantidade de gotas soltas (0..1). */
  drips?: number;
  /** Se x/y forem dados, posiciona em absoluto com o ponto do chão em (x, y). */
  x?: number;
  y?: number;
  style?: React.CSSProperties;
};

// caixa do SVG em unidades
const VB = { x: -170, y: -310, w: 340, h: 360 };
/** Âncora do ponto do chão dentro do SVG (fração da largura/altura). */
export const PERSONAGEM_ANCHOR = { x: -VB.x / VB.w, y: -VB.y / VB.h } as const;

type Part = {
  key: string;
  d: string;
  fill: string;
  shade: string;
  /** deslocamento da "luz" (u) — sombra aparece do lado oposto. */
  light: number;
  /** pintura extra recortada dentro da forma (respingos azuis, faixa). */
  inside?: Array<{ d: string; fill: string }>;
};

const dirOf = (deg: number): P => ({ x: Math.sin(deg * D2R), y: Math.cos(deg * D2R) });
const add = (a: P, v: P, s: number): P => ({ x: a.x + v.x * s, y: a.y + v.y * s });

const ShadedPart: React.FC<{ part: Part; id: string }> = ({ part, id }) => {
  const { d, fill, shade, light, inside } = part;
  return (
    <g>
      <clipPath id={id}>
        <path d={d} />
      </clipPath>
      <path d={d} fill={shade} />
      <g clipPath={`url(#${id})`}>
        <path d={d} fill={fill} transform={`translate(${-light * 0.9} ${-light * 0.55})`} />
        {inside?.map((s, i) => <path key={i} d={s.d} fill={s.fill} />)}
      </g>
    </g>
  );
};

export const PersonagemLiquido: React.FC<PersonagemLiquidoProps> = ({
  size,
  pose = POSE_NEUTRA,
  lowAngle = 0,
  melt = 0,
  seed = 0,
  colors,
  facing = 1,
  drips = 0.6,
  x,
  y,
  style,
}) => {
  const uid = useSvgId("pl");
  const c: PersonagemCores = { ...PERSONAGEM_CORES.sobreLaranja, ...colors };
  const la = clamp(lowAngle);
  const m = clamp(melt);
  const turn = clamp(pose.turn);
  const lean = pose.lean;
  const stretch = pose.stretch ?? 1;
  const trail = pose.trail ?? null;
  const R = rng(seed + 1);
  // tom "longe" para os membros de trás (some quando de frente)
  const farAmt = (1 - turn) * 0.75;
  const farBody = mixHex(c.body, c.shade, farAmt);
  const farShade = mixHex(c.shade, mixHex(c.shade, "#B23A00", 0.5), farAmt);
  const farSplash = mixHex(c.splash, c.splashShade, farAmt * 0.8);

  /* proporções (câmera baixa exagera pernas/pés, encolhe cabeça/tronco) */
  const legK = 1 + 0.32 * la;
  const legW = 1 + 0.55 * la;
  const footK = 1 + 1.0 * la;
  const torsoK = 1 - 0.1 * la;
  const armK = 1 - 0.06 * la;
  const headK = 1 - 0.32 * la;
  const meltW = 1 + 0.7 * m;
  const near = (side: "L" | "R") => (side === "R" ? 1 + 0.16 * la : 1 - 0.06 * la);

  const THIGH = 50 * legK;
  const SHIN = 47 * legK;
  const ANKLE_H = 8 * footK;
  const standHip = THIGH + SHIN + ANKLE_H;

  /* esqueleto */
  // perna que dá o apoio: a mais estendida/baixa define a altura da bacia (pés no chão)
  const legReach = (hip: number, knee: number, k: number) =>
    (Math.cos(hip * D2R) * THIGH + Math.cos((hip - knee) * D2R) * SHIN) * k + ANKLE_H;
  const reachL = legReach(pose.hipL, pose.kneeL, near("L"));
  const reachR = legReach(pose.hipR, pose.kneeR, near("R"));
  const support = Math.max(reachL, reachR);
  const pelvisY = -Math.max(support, standHip * 0.55) + pose.bounce;
  const pelvis: P = { x: pose.shift ?? 0, y: pelvisY };

  const up: P = { x: Math.sin(lean * D2R), y: -Math.cos(lean * D2R) };
  const side: P = { x: Math.cos(lean * D2R), y: Math.sin(lean * D2R) }; // "direita" do tronco
  const TORSO = 52 * torsoK;
  const chest = add(pelvis, up, TORSO);
  const torsoWide = 1 + 0.38 * turn;

  // raios
  const rPelvis = 19 * torsoK * meltW;
  const rChest = 21 * torsoK * meltW;

  const shoulderOff = 3 + 15 * turn;
  const hipOff = 2 + 9 * turn;
  const shoulder = (s: "L" | "R"): P => add(add(chest, up, -7), side, (s === "R" ? 1 : -1) * shoulderOff);
  const hipJ = (s: "L" | "R"): P => ({ x: pelvis.x + (s === "R" ? 1 : -1) * hipOff, y: pelvis.y + 4 });

  /* melt: escorre para o chão e espalha */
  const mp = (p: P): P => {
    if (m <= 0) return p;
    const k = Math.pow(m, 1.15);
    const wob = Math.sin(p.y * 0.06 + seed * 0.7) * 10 * m;
    return { x: p.x * (1 + 0.55 * k) + wob, y: p.y * (1 - 0.82 * k) };
  };

  const parts: Part[] = [];
  const front: React.ReactNode[] = []; // respingos fora do clip (por cima)
  const behind: React.ReactNode[] = []; // gotas atrás do corpo
  let keyN = 0;
  const K = () => `k${keyN++}`;

  // gotas que ficam para trás (direção do movimento) ou caem (gravidade)
  const spawnTrail = (at: P, scale: number, color: string, n: number, layer: React.ReactNode[]) => {
    const count = Math.round(n * drips);
    for (let i = 0; i < count; i++) {
      const ang = trail != null ? trail * D2R : Math.PI / 2;
      const spread = (R() - 0.5) * 0.9;
      const dist = (10 + R() * 26) * scale;
      const back = ang + Math.PI + spread;
      const head = { x: at.x + Math.cos(back) * dist, y: at.y + Math.sin(back) * dist + (trail == null ? 6 * scale : 0) };
      const r = (1.6 + R() * 2.6) * scale;
      layer.push(
        <path key={K()} d={dropPath(mp(head), r, ang + spread * 0.3, r * (2.5 + R() * 3.5))} fill={color} />,
      );
    }
  };

  /* ---------- braço ---------- */
  const arm = (s: "L" | "R") => {
    const isFar = s === "L" && turn < 0.5;
    const body = isFar ? farBody : c.body;
    const shade = isFar ? farShade : c.shade;
    const splash = isFar ? farSplash : c.splash;
    const sh = s === "R" ? pose.shoulderR : pose.shoulderL;
    const el = s === "R" ? pose.elbowR : pose.elbowL;
    const k = armK * near(s) * (s === "L" ? 1 - 0.06 * (1 - turn) : 1);
    const aUp = sh + lean;
    const aLo = aUp + el;
    const S = shoulder(s);
    const E = add(S, dirOf(aUp), 35 * k);
    const W = add(E, dirOf(aLo), 33 * k);
    const r1 = 10.5 * k * meltW;
    const r2 = 7.6 * k * meltW;
    const r3 = 6 * k * meltW;
    const [mS, mE, mW] = [mp(S), mp(E), mp(W)];
    const d = `${capsulePath(mS, r1, mE, r2, 0.18)} ${capsulePath(mE, r2, mW, r3, 0.12)}`;
    const dl = dirOf(aLo);
    const dipC = add(mW, dl, 2);
    const inside = [
      { d: blobPath(dipC, 15 * k, 11 * k, Math.atan2(dl.y, dl.x), seed * 3 + (s === "R" ? 11 : 23), 0.3, 8), fill: splash },
    ];
    parts.push({ key: `arm${s}`, d, fill: body, shade, light: r1 * 0.5, inside });

    // mão-respingo
    const hc = add(mW, dl, 6 * k);
    const ang = Math.atan2(dl.y, dl.x);
    const hand: React.ReactNode[] = [];
    hand.push(<path key={K()} d={blobPath(hc, 9.5 * k, 8 * k, ang, seed * 7 + (s === "R" ? 3 : 5), 0.2, 8)} fill={splash} />);
    const pointing = pose.pointing === s;
    if (pointing) {
      hand.push(<path key={K()} d={capsulePath(hc, 4.4 * k, add(hc, dl, 22 * k), 2.6 * k, 0)} fill={splash} />);
      hand.push(<path key={K()} d={dropPath(add(hc, dl, 30 * k), 2.6 * k, ang, 8 * k)} fill={splash} />);
    } else {
      // "dedos" de respingo
      const fingers = 3;
      for (let i = 0; i < fingers; i++) {
        const a = ang + (i - 1) * 0.62 + (R() - 0.5) * 0.35;
        const len = (8 + R() * 9) * k;
        hand.push(
          <path key={K()} d={dropPath({ x: hc.x + Math.cos(a) * len, y: hc.y + Math.sin(a) * len }, (2 + R() * 1.6) * k, a, len * 0.9)} fill={splash} />,
        );
      }
    }
    (isFar ? behind : front).push(<g key={K()}>{hand}</g>);
    spawnTrail(hc, k, splash, 3, isFar ? behind : front);
    return { hc, isFar };
  };

  /* ---------- perna ---------- */
  const leg = (s: "L" | "R") => {
    const isFar = s === "L" && turn < 0.5;
    const body = isFar ? farBody : c.body;
    const shade = isFar ? farShade : c.shade;
    const splash = isFar ? farSplash : c.splash;
    const splashShade = isFar ? mixHex(c.splashShade, "#000000", 0.1) : c.splashShade;
    const hp = s === "R" ? pose.hipR : pose.hipL;
    const kn = s === "R" ? pose.kneeR : pose.kneeL;
    const an = (s === "R" ? pose.ankleR : pose.ankleL) ?? 0;
    const nk = near(s);
    const aTh = hp;
    const aSh = hp - kn;
    const H = hipJ(s);
    const Kn = add(H, dirOf(aTh), THIGH * nk);
    const A = add(Kn, dirOf(aSh), SHIN * nk);
    const w = legW * nk * meltW;
    const r1 = 14.5 * w;
    const r2 = 10 * w;
    const r3 = 8 * w;
    const [mH, mK, mA] = [mp(H), mp(Kn), mp(A)];
    const d = `${capsulePath(mH, r1, mK, r2, 0.2)} ${capsulePath(mK, r2, mA, r3, 0.16)}`;
    const ds = dirOf(aSh);
    const inside = [
      { d: blobPath(add(mA, ds, -2), 17 * w, 13 * w, Math.atan2(ds.y, ds.x), seed * 5 + (s === "R" ? 31 : 47), 0.32, 8), fill: splash },
    ];
    // respingo azul subindo pela coxa (ref 1)
    if (!isFar || turn > 0.5) {
      const p0 = add(mK, dirOf(aTh), -THIGH * 0.25);
      inside.push({ d: dropPath(p0, 4.5 * w, Math.atan2(-dirOf(aTh).y, -dirOf(aTh).x) + 0.2, 22 * w), fill: splash });
    }
    parts.push({ key: `leg${s}`, d, fill: body, shade, light: r1 * 0.45, inside });

    // pé = "sapato" líquido azul
    const fk = footK * nk * (1 + 0.3 * m);
    const footAng = aSh + 90 + an;
    const fd = dirOf(footAng);
    const flen = 24 * fk * (1 - 0.6 * turn);
    const heel = add(mA, fd, -5 * fk);
    const toe = add(mA, fd, flen);
    const footD = `${capsulePath(heel, 9 * fk, toe, 7 * fk, 0.25)}`;
    const foot: React.ReactNode[] = [];
    foot.push(<path key={K()} d={footD} fill={splashShade} />);
    foot.push(
      <path key={K()} d={capsulePath(add(heel, { x: 0, y: -1 }, 1.6 * fk), 7.4 * fk, add(toe, { x: 0, y: -1 }, 1.6 * fk), 5.6 * fk, 0.25)} fill={splash} />,
    );
    // gotas do pé (saem do calcanhar para trás)
    const fang = Math.atan2(fd.y, fd.x);
    for (let i = 0; i < 2; i++) {
      const a = fang + Math.PI + (R() - 0.5) * 1.1;
      const len = (7 + R() * 10) * fk;
      foot.push(
        <path key={K()} d={dropPath({ x: heel.x + Math.cos(a) * len, y: heel.y + Math.sin(a) * len }, (2 + R() * 1.5) * fk, a, len)} fill={splash} />,
      );
    }
    (isFar ? behind : front).push(<g key={K()}>{foot}</g>);
    spawnTrail(heel, fk, splash, 3, isFar ? behind : front);
    return { toe, heel };
  };

  /* ---------- montagem (ordem de pintura) ---------- */
  arm("L");
  leg("L");
  const farParts = parts.splice(0, parts.length);

  // tronco: feijão abaulado; largura cresce de frente
  const tPelvis = mp(pelvis);
  const tChest = mp(chest);
  const torsoD = capsulePath(tPelvis, rPelvis * torsoWide, tChest, rChest * torsoWide, 0.22);
  const torsoInside: Array<{ d: string; fill: string }> = [];
  if (c.sash) {
    const bandC = add(tPelvis, up, 9);
    const sw = 42 * torsoWide;
    torsoInside.push({
      d: capsulePath(add(add(bandC, side, -sw), up, -3), 7.5 * torsoK, add(add(bandC, side, sw), up, 3), 6.5 * torsoK, 0),
      fill: c.sash,
    });
    torsoInside.push({
      d: capsulePath(add(add(bandC, side, -sw), up, -6.5), 3, add(add(bandC, side, sw), up, -0.5), 2.5, 0),
      fill: c.sashShade,
    });
  }
  // respingos azuis no corpo (gotas subindo de baixo, como na ref 1)
  {
    const rr = rng(seed * 13 + 5);
    for (let i = 0; i < 2; i++) {
      const base = add(add(tPelvis, side, (rr() - 0.3) * 22 * torsoWide), up, 14 + rr() * 26);
      const a = Math.atan2(up.y, up.x) + (rr() - 0.5) * 0.6;
      torsoInside.push({ d: dropPath(base, 3 + rr() * 2.5, a, 14 + rr() * 16), fill: c.splash });
    }
  }
  const torsoPart: Part = { key: "torso", d: torsoD, fill: c.body, shade: c.shade, light: rChest * 0.45, inside: torsoInside };

  // cabeça + pescoço
  const hk = headK * (1 - 0.3 * m);
  const neckTop = add(tChest, up, 14 * hk + 6);
  const headAng = lean + (pose.head ?? 0);
  const hUp = dirOf(180 + headAng);
  const headC = add(neckTop, hUp, 9 * hk);
  const headD = `${capsulePath(add(tChest, up, -4), 8.5 * hk, neckTop, 7 * hk, 0)} ${blobPath(
    headC,
    13 * hk * (1 + 0.05 * turn),
    15.5 * hk,
    (headAng - 0) * D2R + Math.PI / 2,
    seed * 2 + 91,
    0.05,
    10,
  )}`;
  // cabelo líquido: calota no topo/atrás da cabeça (recortada pela cabeça — sem "aba" na frente,
  // que lia como boné/gorro) + mecha que escorre para trás. Rosto: olho(s) e nariz discretos.
  const hairDir = trail != null ? (trail + 180) * D2R : (180 + 25) * D2R;
  const fwd: P = { x: -hUp.y, y: hUp.x }; // frente da cabeça (perpendicular ao "para cima")
  const backK = 1 - turn * 0.8; // de frente, o cabelo fica centrado no topo
  const hairC = add(add(headC, hUp, 10.5 * hk), fwd, -6 * hk * backK);
  const headInside: Array<{ d: string; fill: string }> = [
    { d: blobPath(hairC, (12.5 + 3 * turn) * hk, 8.5 * hk, Math.atan2(fwd.y, fwd.x) - 0.25 * backK, seed * 2 + 41, 0.12, 9), fill: c.splash },
  ];
  const headPart: Part = { key: "head", d: headD, fill: c.body, shade: c.shade, light: 6 * hk, inside: headInside };
  // rosto (por cima da cabeça): nariz em perfil + olho(s) marinho
  const faceEls: React.ReactNode[] = [];
  if (m < 0.5) {
    const eyeY = -1.5 * hk;
    if (turn < 0.65) {
      const nose = add(add(headC, fwd, 13.2 * hk), hUp, -1 * hk);
      faceEls.push(<circle key="nose" cx={nose.x} cy={nose.y} r={3.6 * hk} fill={c.body} />);
      const eye = add(add(headC, fwd, 7.5 * hk), hUp, -eyeY);
      faceEls.push(<ellipse key="eyeR" cx={eye.x} cy={eye.y} rx={1.7 * hk} ry={2.6 * hk} fill={INK_V2.navy} />);
    } else {
      for (const sgn of [-1, 1]) {
        const eye = add(add(headC, fwd, (sgn * 5.2 + 1.5) * hk), hUp, -eyeY);
        faceEls.push(<ellipse key={`eye${sgn}`} cx={eye.x} cy={eye.y} rx={1.7 * hk} ry={2.6 * hk} fill={INK_V2.navy} />);
      }
    }
  }
  // mecha: ponta do cabelo saindo para trás da cabeça
  const hairTip = (
    <path
      key="hair"
      d={dropPath(
        { x: headC.x + Math.cos(hairDir) * 13 * hk + hUp.x * 7 * hk, y: headC.y + Math.sin(hairDir) * 13 * hk + hUp.y * 7 * hk },
        5 * hk,
        hairDir,
        (16 + 12 * (trail != null ? 1 : 0)) * hk,
        0.35,
      )}
      fill={c.splash}
    />
  );

  // faixa: ponta que tremula para trás
  let sashTail: React.ReactNode = null;
  if (c.sash) {
    const bandC = add(tPelvis, up, 9);
    const back = trail != null ? (trail + 180) * D2R : Math.PI * 0.8;
    const startP = add(bandC, side, -(rPelvis * torsoWide * 0.8));
    const tipP = { x: startP.x + Math.cos(back) * 20, y: startP.y + Math.sin(back) * 20 + 7 };
    sashTail = (
      <g key="sash">
        <path d={capsulePath(startP, 6.5, tipP, 3.5, 0.3)} fill={c.sash} />
        {/* ponta arredondada (antes era uma gota pontuda) */}
        <path d={blobPath({ x: tipP.x + Math.cos(back) * 3, y: tipP.y + Math.sin(back) * 3 + 1 }, 4.6, 3.4, back, seed + 77, 0.12, 7)} fill={c.sash} />
      </g>
    );
  }

  arm("R");
  leg("R");
  const nearParts = parts.splice(0, parts.length);
  const nearArm = nearParts.find((p) => p.key === "armR");
  const nearLeg = nearParts.find((p) => p.key === "legR");

  // ordem: braço/perna de trás → faixa → tronco → perna da frente → cabeça → braço da frente
  const farCount = farParts.length;
  const ordered: Part[] = [...farParts, torsoPart];
  if (nearLeg) ordered.push(nearLeg);
  ordered.push(headPart);
  if (nearArm) ordered.push(nearArm);

  // derretimento: poça + escorridos
  const meltLayer: React.ReactNode[] = [];
  if (m > 0) {
    const pw = 30 + 120 * m;
    meltLayer.push(<path key="poca" d={blobPath({ x: 0, y: -2 }, pw, 6 + 12 * m, 0, seed * 3 + 7, 0.22, 11)} fill={c.body} />);
    meltLayer.push(<path key="poca2" d={blobPath({ x: pw * 0.25, y: -1 }, pw * 0.45, 4 + 7 * m, 0, seed * 3 + 9, 0.3, 9)} fill={c.splash} />);
    const rr = rng(seed * 17 + 3);
    const n = Math.round(14 * m);
    for (let i = 0; i < n; i++) {
      const px = (rr() - 0.5) * pw * 1.6;
      const py = -rr() * (40 + 80 * (1 - m)) - 8;
      const r = 2 + rr() * 5 * m;
      meltLayer.push(
        <path key={`m${i}`} d={dropPath({ x: px, y: py }, r, Math.PI / 2, r * (3 + 6 * m))} fill={rr() > 0.6 ? c.splash : c.body} />,
      );
    }
  }

  // sombra no chão (encolhe quando sobe)
  const air = clamp(-pose.bounce / 90);
  const groundEl =
    c.ground != null ? (
      <ellipse cx={pelvis.x + 6} cy={1} rx={(62 + 30 * la + 60 * m) * (1 - 0.45 * air)} ry={(9 + 4 * la) * (1 - 0.4 * air)} fill={c.ground} />
    ) : null;

  const s = size / 200;
  const W = VB.w * s;
  const Hh = VB.h * s;
  const pos: React.CSSProperties =
    x != null && y != null ? { position: "absolute", left: x - PERSONAGEM_ANCHOR.x * W, top: y - PERSONAGEM_ANCHOR.y * Hh } : {};

  return (
    <svg
      width={W}
      height={Hh}
      viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
      style={{ overflow: "visible", ...pos, ...style }}
    >
      {groundEl}
      <g transform={`scale(${facing} 1)`}>
        <g transform={`scale(${1 / Math.sqrt(stretch)} ${stretch})`}>
          {ordered.slice(0, farCount).map((p) => (
            <ShadedPart key={p.key} part={p} id={`${uid}-${p.key}`} />
          ))}
          {behind}
          {sashTail}
          {ordered.slice(farCount).map((p) => (
            <ShadedPart key={p.key} part={p} id={`${uid}-${p.key}`} />
          ))}
          {hairTip}
          {faceEls}
          {front}
        </g>
        {meltLayer}
      </g>
    </svg>
  );
};
