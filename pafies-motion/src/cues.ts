/**
 * cues.ts — frames NOMEADOS de cada ação do storyboard (docs/02), em frames ABSOLUTOS.
 *
 * Regra: todo frame sincronizado com áudio vem de src/timeline.json (IMPACTS, TICKS, PLUCKS…).
 * Ações sem som próprio (saídas, antecipações, durações) são escritas como deslocamentos
 * em BEAT (15 f) ou em frames a partir de um cue, com o frame do storyboard comentado.
 * Para mudar o tempo de um evento sonoro, edite timeline.json (e regenere a trilha);
 * para ajustar uma ação visual, edite aqui.
 */
import {
  BEAT,
  BLOOPS,
  CHIMES,
  FINAL_HIT,
  HEARTBEATS,
  IMPACTS,
  PLUCKS,
  RISERS,
  SCENE,
  SILENCE,
  TICKS,
  WHOOSHES,
} from './timeline';

const [
  IMPACT_GOTA, // 240
  IMPACT_ENERGIA, // 480
  HIT_JUNTOS, // 540
  IMPACT_REVEZAMENTO, // 600
  IMPACT_DEZ, // 840
  HIT_GIRO, // 900
  IMPACT_SELO, // 960
  IMPACT_ENCONTRO, // 1020
] = IMPACTS;

const [WH_FAISCA, WH_ESPIRAL, WH_MERGULHO, WH_WHIP, WH_GIRO, WH_ZERO] = WHOOSHES; // 88 228 470 705 892 930
const [TK_UNIR, TK_CUIDAR, TK_COMPART, TK_UNIR2, TK_CUIDAR2, TK_COMPART2, TK_EDICAO, TK_PAFIES, TK_DEZ_EDICAO] = TICKS;
const [HB_FAISCA, HB_PULSO, , , HB_ANEL, HB_SPARKLES] = HEARTBEATS; // 15 60 … 720 780
const [BLOOP_CORACAO, BLOOP_SELO] = BLOOPS; // 420 990
const [CHIME_SOLIDARIA, CHIME_SPARKLES, CHIME_ENCONTRO] = CHIMES; // 750 780 1020
const [SILENCE_START] = SILENCE[0]; // 836
const RISER_ZERO = RISERS[3]; // [930, 960]

export const S01 = {
  scene: SCENE.S01,
  sparkIn: HB_FAISCA, // 15 ★
  sparkPulse: HB_PULSO, // 60 ★
  anticStart: WH_FAISCA - 4, // 84 — antecipação da faísca
  shoot: WH_FAISCA + 2, // 90 — faísca vira cabeça da fita
  unir: TK_UNIR, // 120 ★
  unirOut: TK_UNIR + 24, // 144–149
  cuidar: TK_CUIDAR, // 150 ★
  cuidarOut: TK_CUIDAR + 20, // 170–175 (adiantado 4 f: a passada de COMPARTILHAR começa em 176)
  compartilhar: TK_COMPART, // 180 ★
  suckStart: TK_COMPART + 2 * BEAT, // 210–219 — palavra sugada pela espiral
  spiralDone: WH_ESPIRAL, // 228 — espiral vira gota
  dropStart: WH_ESPIRAL - 8, // 220 — gota começa a se formar
} as const;

export const S02 = {
  scene: SCENE.S02,
  blobsIn: SCENE.S02.from, // 225 — blobs entram com antecipação
  dropPop: IMPACT_GOTA, // 240 ★ gota estala
  letters: PLUCKS, // 300…390 ★ uma letra por pluck
  underline: PLUCKS[PLUCKS.length - 1], // 390–404
  fuseStart: PLUCKS[PLUCKS.length - 1] + BEAT, // 405 — blobs colidem
  heartClose: BLOOP_CORACAO, // 420 ★ coração fecha
  orbitStart: BLOOP_CORACAO + 6, // 426–456 — fita orbita o coração
  diveStart: SCENE.S03.from, // 465 — mergulho no reflexo
  diveWhoosh: WH_MERGULHO, // 470
  diveWhite: SCENE.S03.from + 9, // 474 — reflexo toma a tela (S03 abre daqui)
} as const;

export const S03 = {
  scene: SCENE.S03,
  irisStart: S02.diveWhite, // 474 — íris electric abre do branco
  energia: IMPACT_ENERGIA, // 480 ★
  racePasses: [IMPACT_ENERGIA + 4, IMPACT_ENERGIA + 22, IMPACT_ENERGIA + 40] as const, // 3 diagonais
  raceDur: 14,
  energiaOut: HIT_JUNTOS - 10, // 530–539 whip vertical
  juntos: HIT_JUNTOS, // 540 ★
  juntosUp: HIT_JUNTOS + 20, // 560 — encolhe e sobe
  armsIn: HIT_JUNTOS + 20, // 560–599 — braços entram
  handoff: IMPACT_REVEZAMENTO, // 600 ★ mãos se tocam
  armsOut: IMPACT_REVEZAMENTO + 6, // 606–616
  wrap: IMPACT_REVEZAMENTO + 14, // 614–644 — fita embrulha JUNTOS
  juntosOut: TK_UNIR2 - 6, // 654 — JUNTOS libera o topo para a pilha
  stack: [TK_UNIR2, TK_CUIDAR2, TK_COMPART2] as const, // 660 / 675 / 690 ★
  finalLine: TK_COMPART2 + 6, // 696–705 — fita estica na horizontal
  whip: WH_WHIP, // 705 — whip-pan (15 f)
  whipDur: BEAT,
} as const;

export const S04 = {
  scene: SCENE.S04,
  whipIn: WH_WHIP, // 705–719 — chega do whip
  ringClose: HB_ANEL, // 720 ★ fita fecha em anel
  writeOn: CHIME_SOLIDARIA, // 750 ★ início do write-on
  writeOnEnd: CHIME_SOLIDARIA + 3 * BEAT, // 795
  sparkles: CHIME_SPARKLES, // 780 ★ (= HB_SPARKLES)
  heartbeat2: HB_SPARKLES,
  accelerate: CHIME_SPARKLES + 20, // 800–827
  collapse: SCENE.S05.from, // 828 — colapso
  freeze: SILENCE_START, // 836–839 — congelamento total
} as const;

export const S05 = {
  scene: SCENE.S05,
  dez: IMPACT_DEZ, // 840 ★ impacto máximo
  dezLand: IMPACT_DEZ + 6, // 846 — pouso com overshoot
  edicao: TK_EDICAO, // 870 ★
  spinAntic: WH_GIRO, // 892–899
  spin: HIT_GIRO, // 900 ★
  spinDur: 14,
  edicaoOut: HIT_GIRO + BEAT, // 915–929
  dive: RISER_ZERO[0], // 930–959 mergulho no "0" (= WH_ZERO)
  diveEnd: RISER_ZERO[1], // 960
  diveWhoosh: WH_ZERO,
} as const;

export const S06 = {
  scene: SCENE.S06,
  sealDrawStart: SCENE.S06.from + 3, // 948
  sealClose: IMPACT_SELO, // 960 ★
  sealDrawEnd: IMPACT_SELO + 40, // 1000
  dropFall: IMPACT_SELO + BEAT, // 975
  heartSettle: BLOOP_SELO, // 990 ★
  peopleIn: BLOOP_SELO, // 990–1005
  armsUp: BLOOP_SELO + BEAT, // 1005
  ribbonIn: BLOOP_SELO + 10, // 1000–1018
  meet: IMPACT_ENCONTRO, // 1020 ★ O ENCONTRO (= CHIME_ENCONTRO)
  chime: CHIME_ENCONTRO,
  gincana: IMPACT_ENCONTRO + BEAT, // 1035 ★ (hit snare)
  solidaria: IMPACT_ENCONTRO + 20, // 1040–1070
  pafies: TK_PAFIES, // 1065 ★
  dezEdicao: TK_DEZ_EDICAO, // 1072 ★
  stamp: FINAL_HIT, // 1080 ★ hit final
  shimmerStart: FINAL_HIT + 6, // 1086–1110
  shimmerEnd: FINAL_HIT + 30,
  holdSparkles: [FINAL_HIT + 16, FINAL_HIT + 32, FINAL_HIT + 48] as const, // 1096 1112 1128
} as const;

/** Shakes de câmera (§4.3): frame, duração, amplitude (px na base 1920). */
export const SHAKES: { frame: number; dur: number; amp: number }[] = [
  { frame: IMPACT_ENERGIA, dur: 3, amp: 8 },
  { frame: HIT_JUNTOS, dur: 3, amp: 5 },
  { frame: IMPACT_REVEZAMENTO, dur: 3, amp: 8 },
  { frame: IMPACT_DEZ, dur: 4, amp: 10 },
  { frame: HIT_GIRO, dur: 3, amp: 5 },
  { frame: FINAL_HIT, dur: 3, amp: 4 },
];

/** Flashes de impacto (2 frames) — docs/02 por cena. */
export const FLASHES: { frame: number; color: 'white' | 'amber' | 'gold'; opacity: number; dur: number }[] = [
  { frame: IMPACT_GOTA, color: 'amber', opacity: 0.18, dur: 2 },
  { frame: IMPACT_ENERGIA, color: 'amber', opacity: 0.35, dur: 2 },
  { frame: HIT_JUNTOS, color: 'white', opacity: 0.22, dur: 2 },
  { frame: IMPACT_REVEZAMENTO, color: 'white', opacity: 0.35, dur: 2 },
  { frame: IMPACT_DEZ, color: 'gold', opacity: 0.4, dur: 2 },
  { frame: HIT_GIRO, color: 'white', opacity: 0.2, dur: 2 },
  { frame: IMPACT_SELO, color: 'gold', opacity: 0.15, dur: 2 },
  { frame: IMPACT_ENCONTRO, color: 'white', opacity: 0.18, dur: 2 },
  { frame: FINAL_HIT, color: 'gold', opacity: 0.25, dur: 2 },
];

/** Grão sobe no break (S04). */
export const GRAIN_BREAK = { from: HB_ANEL, to: SILENCE_START + 3 } as const;
