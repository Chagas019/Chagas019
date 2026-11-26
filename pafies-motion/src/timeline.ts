/**
 * timeline.ts — acesso tipado à fonte única de tempo (src/timeline.json).
 * Tudo em frames ABSOLUTOS a 30 fps (frame 0 = início do vídeo).
 * O script scripts/gerar_trilha.py lê o MESMO JSON → áudio e animação nunca divergem.
 */
import data from './timeline.json';

export type CueType =
  | 'heartbeat'
  | 'heartbeat2'
  | 'kick'
  | 'snare'
  | 'hat'
  | 'tick'
  | 'pluck'
  | 'bloop'
  | 'chime'
  | 'clap'
  | 'whoosh'
  | 'impact'
  | 'hit'
  | 'crash'
  | 'boom'
  | 'final_hit'
  | 'riser_start'
  | 'riser_end'
  | 'snare_roll_start'
  | 'snare_roll_end'
  | 'reverse_cymbal_start'
  | 'reverse_cymbal_end'
  | 'silence_start'
  | 'silence_end'
  | 'fade_start'
  | 'fade_end';

export type Cue = {
  frame: number; // pode ser fracionário (hats no contratempo: beat + 7.5)
  type: CueType;
  intensity?: number; // 0..1
  peak?: boolean; // ★ — pico visual deve cair exatamente aqui
  label?: string;
  note?: string;
  duration?: number; // whoosh: duração em frames
  end?: number; // eventos contínuos: frame final
  id?: string;
};

export type SceneId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06';
export type Scene = {
  id: SceneId;
  name: string;
  from: number;
  to: number; // inclusivo
  durationInFrames: number;
  overlapIn: number;
  section: string;
};

export const FPS: number = data.fps;
export const BPM: number = data.bpm;
export const BEAT: number = data.beatFrames; // 15
export const BAR: number = data.barFrames; // 60
export const DURATION: number = data.durationInFrames; // 1140
export const WIDTH: number = data.width;
export const HEIGHT: number = data.height;

export const SCENES: Scene[] = data.scenes as Scene[];
export const SCENE: Record<SceneId, Scene> = Object.fromEntries(
  SCENES.map((s) => [s.id, s]),
) as Record<SceneId, Scene>;
export const SECTIONS = data.sections;
export const MUSIC = data.music;
export const CUES: Cue[] = (data.cues as Cue[]).slice().sort((a, b) => a.frame - b.frame);

/** Constantes do §3.3 do storyboard (mesmos números). */
export const IMPACTS: number[] = data.groups.IMPACTS;
export const WHOOSHES: number[] = data.groups.WHOOSHES;
export const RISERS = data.groups.RISERS as [number, number][];
export const HEARTBEATS: number[] = data.groups.HEARTBEATS;
export const PLUCKS: number[] = data.groups.PLUCKS;
export const TICKS: number[] = data.groups.TICKS;
export const BLOOPS: number[] = data.groups.BLOOPS;
export const CHIMES: number[] = data.groups.CHIMES;
export const SILENCE = data.groups.SILENCE as [number, number][];
export const FINAL_HIT: number = data.groups.FINAL_HIT;

/** beat 0-based → frame (beat 0 = frame 0). */
export const beatToFrame = (beat: number): number => beat * BEAT;
/** compasso 1-based → frame do tempo 1 (barToFrame(1) = 0, barToFrame(9) = 480). beat 1-based opcional. */
export const barToFrame = (bar: number, beatInBar = 1): number =>
  (bar - 1) * BAR + (beatInBar - 1) * BEAT;
export const frameToBeat = (frame: number): number => frame / BEAT;
export const frameToSeconds = (frame: number): number => frame / FPS;

/** Converte frame absoluto em frame local de uma cena (para usar dentro do <Sequence from={scene.from}>). */
export const toSceneFrame = (sceneId: SceneId, absFrame: number): number =>
  absFrame - SCENE[sceneId].from;
/** Cena "por cima" no frame (em overlaps, a que entra vence). */
export const sceneAt = (frame: number): Scene => {
  let found = SCENES[0];
  for (const s of SCENES) if (frame >= s.from && frame <= s.to) found = s;
  return found;
};

const cache = new Map<string, number[]>();
const key = (t: CueType | CueType[]) => (Array.isArray(t) ? t.slice().sort().join('|') : t);

/** Todos os cues de um tipo (ou de vários tipos), ordenados por frame. */
export const cuesOfType = (type: CueType | CueType[]): Cue[] => {
  const set = new Set(Array.isArray(type) ? type : [type]);
  return CUES.filter((c) => set.has(c.type));
};
const framesOf = (type: CueType | CueType[]): number[] => {
  const k = key(type);
  let v = cache.get(k);
  if (!v) {
    v = cuesOfType(type).map((c) => c.frame);
    cache.set(k, v);
  }
  return v;
};

/** Cue mais próximo do frame (opcionalmente filtrado por tipo e direção). */
export const nearestCue = (
  frame: number,
  type?: CueType | CueType[],
  direction: 'any' | 'past' | 'future' = 'any',
): Cue | null => {
  const list = type ? cuesOfType(type) : CUES;
  let best: Cue | null = null;
  let bestD = Infinity;
  for (const c of list) {
    const d = frame - c.frame;
    if (direction === 'past' && d < 0) continue;
    if (direction === 'future' && d > 0) continue;
    if (Math.abs(d) < bestD) {
      bestD = Math.abs(d);
      best = c;
    }
  }
  return best;
};

/** Último cue já ocorrido (frame <= atual). */
export const lastCue = (frame: number, type?: CueType | CueType[]) => nearestCue(frame, type, 'past');
/** Próximo cue (frame >= atual). */
export const nextCue = (frame: number, type?: CueType | CueType[]) => nearestCue(frame, type, 'future');

export type BeatPulseOptions = {
  /** duração do decaimento em frames (default 10). */
  decay?: number;
  /** curva: 'exp' (default, ataque instantâneo e cauda) ou 'quad' (zera exatamente em `decay`). */
  curve?: 'exp' | 'quad';
  /** frames de subida ANTES do cue (antecipação; default 0 = pico exato no frame do cue). */
  attack?: number;
  /** multiplica pela intensity do cue (default true). */
  useIntensity?: boolean;
};

/**
 * Envoltória 0..1 que vale 1 no frame do cue e decai depois — para elementos pulsarem no ritmo.
 * Ex.: const p = useBeatPulse(frame, 'kick'); scale = 1 + 0.03 * p.
 * (Função pura — pode ser chamada em qualquer lugar, inclusive fora de componentes.)
 */
export const useBeatPulse = (
  frame: number,
  type: CueType | CueType[],
  opts: BeatPulseOptions = {},
): number => {
  const { decay = 10, curve = 'exp', attack = 0, useIntensity = true } = opts;
  const frames = framesOf(type);
  const list = useIntensity ? cuesOfType(type) : null;
  let v = 0;
  for (let i = 0; i < frames.length; i++) {
    const d = frame - frames[i];
    if (d < -attack) break;
    let e = 0;
    if (d < 0) {
      e = 1 + d / Math.max(attack, 1e-6); // rampa de antecipação
      e = e * e;
    } else if (d <= decay * (curve === 'exp' ? 3 : 1)) {
      e = curve === 'exp' ? Math.exp((-d * 3) / decay) : Math.pow(1 - d / decay, 2);
    }
    if (list) e *= list[i].intensity ?? 1;
    if (e > v) v = e;
  }
  return Math.max(0, Math.min(1, v));
};
export const beatPulse = useBeatPulse;

/** true se o frame está dentro de um silêncio da cue sheet (836–839). */
export const isSilent = (frame: number): boolean => SILENCE.some(([a, b]) => frame >= a && frame <= b);
