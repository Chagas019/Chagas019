/**
 * timelineCore.ts — fábrica genérica de timeline (usada por src/timeline.ts [V1] e src/timeline-v2.ts [V2]).
 * Tudo em frames ABSOLUTOS (frame 0 = início do vídeo). Funções puras e determinísticas.
 *
 *   import data from './timeline-v2.json';
 *   export const TL = createTimeline<'V1' | 'V2'>(data);
 *   TL.useBeatPulse(frame, 'kick'); TL.nextCue(frame, 'impact'); TL.isSilent(frame) ...
 */

export type CueType =
  | 'heartbeat'
  | 'heartbeat2'
  | 'kick'
  | 'snare'
  | 'hat'
  | 'open_hat'
  | 'tick'
  | 'pluck'
  | 'bloop'
  | 'chime'
  | 'clap'
  | 'whoosh'
  | 'impact'
  | 'hit'
  | 'stab'
  | 'crash'
  | 'boom'
  | 'cut'
  | 'drop'
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

export type SceneBase<Id extends string = string> = {
  id: Id;
  name: string;
  from: number;
  to: number; // inclusivo
  durationInFrames: number;
  overlapIn: number;
  section: string;
  /** V2: cor de fundo chapada da cena (opcional). */
  bg?: string;
  /** V2: texto obrigatório da cena (opcional). */
  text?: string;
};

/** Forma mínima do JSON (V1 e V2). Campos extras são livres. */
export type TimelineJSON = {
  fps: number;
  bpm: number;
  beatFrames: number;
  barFrames: number;
  durationInFrames: number;
  width: number;
  height: number;
  scenes: unknown[];
  sections: unknown;
  music: unknown;
  groups: Record<string, unknown>;
  cues: unknown[];
};

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

export function createTimeline<SceneId extends string = string, D extends TimelineJSON = TimelineJSON>(data: D) {
  type Scene = SceneBase<SceneId>;
  const FPS: number = data.fps;
  const BPM: number = data.bpm;
  const BEAT: number = data.beatFrames;
  const BAR: number = data.barFrames;
  const DURATION: number = data.durationInFrames;
  const WIDTH: number = data.width;
  const HEIGHT: number = data.height;
  const SCENES = data.scenes as Scene[];
  const SCENE = Object.fromEntries(SCENES.map((s) => [s.id, s])) as Record<SceneId, Scene>;
  const CUES: Cue[] = (data.cues as Cue[]).slice().sort((a, b) => a.frame - b.frame);
  const SILENCE = ((data.groups.SILENCE as [number, number][] | undefined) ?? []).slice();

  const beatToFrame = (beat: number): number => beat * BEAT;
  const barToFrame = (bar: number, beatInBar = 1): number => (bar - 1) * BAR + (beatInBar - 1) * BEAT;
  const frameToBeat = (frame: number): number => frame / BEAT;
  const frameToSeconds = (frame: number): number => frame / FPS;
  const toSceneFrame = (sceneId: SceneId, absFrame: number): number => absFrame - SCENE[sceneId].from;
  /** Cena "por cima" no frame (em overlaps, a que entra vence). */
  const sceneAt = (frame: number): Scene => {
    let found = SCENES[0];
    for (const s of SCENES) if (frame >= s.from && frame <= s.to) found = s;
    return found;
  };

  const cache = new Map<string, Cue[]>();
  const key = (t: CueType | CueType[]) => (Array.isArray(t) ? t.slice().sort().join('|') : t);
  /** Todos os cues de um tipo (ou de vários tipos), ordenados por frame. */
  const cuesOfType = (type: CueType | CueType[]): Cue[] => {
    const k = key(type);
    let v = cache.get(k);
    if (!v) {
      const set = new Set(Array.isArray(type) ? type : [type]);
      v = CUES.filter((c) => set.has(c.type));
      cache.set(k, v);
    }
    return v;
  };
  const framesOfType = (type: CueType | CueType[]): number[] => cuesOfType(type).map((c) => c.frame);

  /** Cue mais próximo do frame (opcionalmente filtrado por tipo e direção). */
  const nearestCue = (
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
  const lastCue = (frame: number, type?: CueType | CueType[]) => nearestCue(frame, type, 'past');
  const nextCue = (frame: number, type?: CueType | CueType[]) => nearestCue(frame, type, 'future');

  /**
   * Envoltória 0..1 que vale 1 no frame do cue e decai depois — para elementos pulsarem no ritmo.
   * Ex.: const p = useBeatPulse(frame, 'kick'); scale = 1 + 0.03 * p.  (Função pura.)
   */
  const useBeatPulse = (frame: number, type: CueType | CueType[], opts: BeatPulseOptions = {}): number => {
    const { decay = 10, curve = 'exp', attack = 0, useIntensity = true } = opts;
    const list = cuesOfType(type);
    let v = 0;
    for (let i = 0; i < list.length; i++) {
      const d = frame - list[i].frame;
      if (d < -attack) break;
      let e = 0;
      if (d < 0) {
        e = 1 + d / Math.max(attack, 1e-6);
        e = e * e;
      } else if (d <= decay * (curve === 'exp' ? 3 : 1)) {
        e = curve === 'exp' ? Math.exp((-d * 3) / decay) : Math.pow(1 - d / decay, 2);
      }
      if (useIntensity) e *= list[i].intensity ?? 1;
      if (e > v) v = e;
    }
    return Math.max(0, Math.min(1, v));
  };

  /** true se o frame está dentro de um silêncio da cue sheet. */
  const isSilent = (frame: number): boolean => SILENCE.some(([a, b]) => frame >= a && frame <= b);

  return {
    data,
    FPS,
    BPM,
    BEAT,
    BAR,
    DURATION,
    WIDTH,
    HEIGHT,
    SCENES,
    SCENE,
    CUES,
    SILENCE,
    beatToFrame,
    barToFrame,
    frameToBeat,
    frameToSeconds,
    toSceneFrame,
    sceneAt,
    cuesOfType,
    framesOfType,
    nearestCue,
    lastCue,
    nextCue,
    useBeatPulse,
    beatPulse: useBeatPulse,
    isSilent,
  };
}

export type Timeline<SceneId extends string = string> = ReturnType<typeof createTimeline<SceneId>>;
