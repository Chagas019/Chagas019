/**
 * timeline.ts — acesso tipado à fonte única de tempo da V1 (src/timeline.json).
 * Tudo em frames ABSOLUTOS a 30 fps (frame 0 = início do vídeo).
 * O script scripts/gerar_trilha.py lê o MESMO JSON → áudio e animação nunca divergem.
 * Implementação compartilhada com a V2 em ./timelineCore (createTimeline).
 */
import data from './timeline.json';
import { createTimeline, type SceneBase } from './timelineCore';

export type { Cue, CueType, BeatPulseOptions } from './timelineCore';

export type SceneId = 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06';
export type Scene = SceneBase<SceneId>;

const TL = createTimeline<SceneId>(data);
export const TIMELINE = TL;

export const FPS: number = TL.FPS;
export const BPM: number = TL.BPM;
export const BEAT: number = TL.BEAT; // 15
export const BAR: number = TL.BAR; // 60
export const DURATION: number = TL.DURATION; // 1140
export const WIDTH: number = TL.WIDTH;
export const HEIGHT: number = TL.HEIGHT;

export const SCENES: Scene[] = TL.SCENES;
export const SCENE: Record<SceneId, Scene> = TL.SCENE;
export const SECTIONS = data.sections;
export const MUSIC = data.music;
export const CUES = TL.CUES;

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
export const beatToFrame = TL.beatToFrame;
/** compasso 1-based → frame do tempo 1 (barToFrame(1) = 0, barToFrame(9) = 480). beat 1-based opcional. */
export const barToFrame = TL.barToFrame;
export const frameToBeat = TL.frameToBeat;
export const frameToSeconds = TL.frameToSeconds;
/** Converte frame absoluto em frame local de uma cena (para usar dentro do <Sequence from={scene.from}>). */
export const toSceneFrame = TL.toSceneFrame;
/** Cena "por cima" no frame (em overlaps, a que entra vence). */
export const sceneAt = TL.sceneAt;
/** Todos os cues de um tipo (ou de vários tipos), ordenados por frame. */
export const cuesOfType = TL.cuesOfType;
/** Cue mais próximo do frame (opcionalmente filtrado por tipo e direção). */
export const nearestCue = TL.nearestCue;
/** Último cue já ocorrido (frame <= atual). */
export const lastCue = TL.lastCue;
/** Próximo cue (frame >= atual). */
export const nextCue = TL.nextCue;
/**
 * Envoltória 0..1 que vale 1 no frame do cue e decai depois — para elementos pulsarem no ritmo.
 * Ex.: const p = useBeatPulse(frame, 'kick'); scale = 1 + 0.03 * p.
 */
export const useBeatPulse = TL.useBeatPulse;
export const beatPulse = TL.useBeatPulse;
/** true se o frame está dentro de um silêncio da cue sheet (836–839). */
export const isSilent = TL.isSilent;
