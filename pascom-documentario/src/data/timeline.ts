import raw from "./timeline.json";
import assetsRaw from "./assets.generated.json";

export type PlateKind =
  | "black"
  | "door"
  | "stainedGlass"
  | "lens"
  | "viewfinder"
  | "candles"
  | "bokeh"
  | "procession"
  | "contactSheet"
  | "nave";

export type CameraMove = "still" | "push" | "pull" | "pullSlow" | "drift";

export type Shot = {
  id: string;
  act: string;
  start: number;
  end: number;
  plate: PlateKind;
  plateProps?: Record<string, unknown>;
  move?: CameraMove;
  slowMo?: number;
  slot?: string;
  queries?: string[];
  transition?: "dissolve" | "slow" | "cut" | "light";
  purpose: string;
};

export type NarrationCue = {
  id: string;
  start: number;
  end: number;
  text: string;
  caption?: boolean;
  direction: string;
};

export type TitleStyle = "whisper" | "hand" | "statement" | "hero" | "signature";

export type Chapter = { id: string; start: number; end: number; number: string; name: string };

export type Title = {
  id: string;
  start: number;
  end: number;
  style: TitleStyle;
  lines: string[];
};

export type Act = { id: string; name: string; folder: string; start: number; end: number };

export type SfxEvent = { type: string; t: number; dur?: number; gain?: number };

export type FootageAsset = {
  src: string;
  durationSec: number;
  width: number;
  height: number;
  trimStartSec?: number;
};

type Assets = {
  generatedAt: string | null;
  footage: Record<string, FootageAsset>;
  narration: Record<string, string>;
  narrationFull: string | null;
};

export const timeline = raw as unknown as {
  title: string;
  subtitle: string;
  fps: number;
  durationSec: number;
  acts: Act[];
  shots: Shot[];
  narration: NarrationCue[];
  titles: Title[];
  sfx: SfxEvent[];
  music: Record<string, number | string>;
  breath: { from: number; to: number; depth: number };
  chapters: Chapter[];
};

export const assets = assetsRaw as Assets;

export const FPS = timeline.fps;
export const DURATION_IN_FRAMES = Math.round(timeline.durationSec * FPS);

export const sec = (s: number) => Math.round(s * FPS);

export const shotsOfAct = (actId: string) => timeline.shots.filter((s) => s.act === actId);

export const actById = (id: string) => {
  const act = timeline.acts.find((a) => a.id === id);
  if (!act) throw new Error(`Ato desconhecido: ${id}`);
  return act;
};

export const shutterTimes = timeline.sfx.filter((e) => e.type === "shutter").map((e) => e.t);
