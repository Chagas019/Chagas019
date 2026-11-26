/**
 * timeline-v2.ts — fonte única de tempo da V2 (src/timeline-v2.json): 720 f · 30 fps · 120 BPM (beat = 15 f).
 * Mesmo formato/helpers da V1 (via ./timelineCore). A trilha é gerada do MESMO JSON:
 *   python3 scripts/gerar_trilha.py --timeline src/timeline-v2.json --out public/trilha-v2.wav
 *
 * Cenas (cortes secos, overlapIn 0): V1 0–119 · V2 120–299 · V3 300–479 · V4 480–599 · V5 600–719.
 * Impactos: 30, 45, 120 (corte), 225, 300, 390 (máx; silêncio 386–389), 405, 480 (whoosh/zoom), 540, 600, 660 (hit final).
 */
import data from './timeline-v2.json';
import { createTimeline, type SceneBase } from './timelineCore';

export type { Cue, CueType, BeatPulseOptions } from './timelineCore';

export type SceneIdV2 = 'V1' | 'V2' | 'V3' | 'V4' | 'V5';
export type SceneV2 = SceneBase<SceneIdV2> & { bg: string; text: string };

export const TLV2 = createTimeline<SceneIdV2>(data);

export const FPS_V2: number = TLV2.FPS; // 30
export const BPM_V2: number = TLV2.BPM; // 120
export const BEAT_V2: number = TLV2.BEAT; // 15
export const BAR_V2: number = TLV2.BAR; // 60
export const DURATION_V2: number = TLV2.DURATION; // 720
export const SCENES_V2 = TLV2.SCENES as SceneV2[];
export const SCENE_V2 = TLV2.SCENE as Record<SceneIdV2, SceneV2>;
export const SECTIONS_V2 = data.sections;
export const MUSIC_V2 = data.music;
export const CUES_V2 = TLV2.CUES;

/** Trocas de cor de fundo (corte seco no frame). */
export const BACKGROUNDS_V2: { frame: number; color: string; note?: string }[] = data.backgrounds;
/** Cor chapada de fundo vigente no frame (corte seco, sem interpolação). */
export const bgAt = (frame: number): string => {
  let col = BACKGROUNDS_V2[0].color;
  for (const b of BACKGROUNDS_V2) if (frame >= b.frame) col = b.color;
  return col;
};

export const IMPACTS_V2: number[] = data.groups.IMPACTS; // [30,45,120,225,300,390,405,480,540,600,660]
export const CUTS_V2: number[] = data.groups.CUTS; // [120,300,390,480,600]
export const WHOOSHES_V2: number[] = data.groups.WHOOSHES;
export const RISERS_V2 = data.groups.RISERS as [number, number][]; // [[330,386]]
export const SILENCE_V2 = data.groups.SILENCE as [number, number][]; // [[386,389]]
export const DROP_V2: number = data.groups.DROP; // 390
export const FINAL_HIT_V2: number = data.groups.FINAL_HIT; // 660
/** "TÁ CHEGANDO," — 1 letra por semicolcheia (3,75 f) a partir de 495 (use em KineticText mode 'type-beat'). */
export const TYPE_BEATS_V2: number[] = data.groups.TYPE_BEATS;
/** Frame do pico de cada texto do roteiro. */
export const TEXT_CUES_V2: Record<string, number> = data.groups.TEXT;

/** Frames de kick/snare/clap (para pop-word tremer no beat). */
export const KICKS_V2: number[] = TLV2.framesOfType('kick');
export const BACKBEAT_V2: number[] = TLV2.framesOfType('clap');

export const {
  beatToFrame: beatToFrameV2,
  barToFrame: barToFrameV2,
  frameToBeat: frameToBeatV2,
  toSceneFrame: toSceneFrameV2,
  sceneAt: sceneAtV2,
  cuesOfType: cuesOfTypeV2,
  nearestCue: nearestCueV2,
  lastCue: lastCueV2,
  nextCue: nextCueV2,
  useBeatPulse: useBeatPulseV2,
  isSilent: isSilentV2,
} = TLV2;
export const beatPulseV2 = TLV2.useBeatPulse;
