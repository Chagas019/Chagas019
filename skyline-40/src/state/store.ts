import { create } from 'zustand';
import { FLOOR_COUNT, isResidential } from '../data/building';
import type { UnitId } from '../data/apartment';
import {
  apartmentShot, floorShot, garageShot, presetShot, rooftopPath, rooftopShot, unitShot,
  type ApartmentView, type CameraShot, type GarageView, type RooftopSpot, type ViewId,
} from '../three/camera/views';
import { detectQuality, type Quality } from '../config/performance';

export type Mode = 'overview' | 'floor' | 'apartment' | 'rooftop' | 'garage';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type Page = 'home' | 'explore';

export interface CameraRequest {
  id: number;
  shot?: CameraShot;
  path?: CameraShot[];
  duration: number;
}

export interface Layers {
  facade: boolean;
  landscape: boolean;
  archLights: boolean;
  technical: boolean;
  context: boolean;
}

export interface SkylineState {
  page: Page;
  ready: boolean;
  webglFailed: string | null;
  mode: Mode;
  activeView: ViewId | null;
  selectedFloor: number | null;
  hoveredFloor: number | null;
  selectedUnit: UnitId | null;
  apartmentView: ApartmentView;
  apartmentRoom: string;
  rooftopSpot: RooftopSpot;
  garageLevel: number;
  garageView: GarageView;
  exploded: boolean;
  explodeGap: number;
  timeOfDay: TimeOfDay;
  layers: Layers;
  uiHidden: boolean;
  helpOpen: boolean;
  quality: Quality;
  autoQuality: boolean;
  reducedMotion: boolean;
  /** Pedido de movimento de câmera em andamento (o CameraRig executa). */
  camera: CameraRequest;
  /** Órbita automática (rad/s) — usada pela apresentação guiada e pelo início. */
  orbitSpeed: number;
  tour: { active: boolean; step: number; paused: boolean };
  toast: { id: number; text: string } | null;
  insets: { left: number; right: number; bottom: number };

  // ações
  enterExplore: () => void;
  goHome: () => void;
  setReady: (v: boolean) => void;
  setWebglFailed: (reason: string | null) => void;
  setView: (v: ViewId) => void;
  resetCamera: () => void;
  toggleExploded: (v?: boolean) => void;
  setExplodeGap: (gap: number) => void;
  selectFloor: (n: number | null, opts?: { fly?: boolean }) => void;
  stepFloor: (delta: number) => void;
  hoverFloor: (n: number | null) => void;
  selectUnit: (floor: number, unit: UnitId) => void;
  openApartment: (floor?: number, unit?: UnitId) => void;
  setApartmentView: (v: ApartmentView, room?: string) => void;
  openRooftop: (spot?: RooftopSpot) => void;
  playRooftopFilm: () => void;
  openGarage: (level?: number, view?: GarageView) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  cycleTimeOfDay: () => void;
  setLayer: (k: keyof Layers, v?: boolean) => void;
  setUiHidden: (v: boolean) => void;
  setHelpOpen: (v: boolean) => void;
  setQuality: (q: Quality, auto?: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setOrbitSpeed: (s: number) => void;
  setTour: (t: Partial<SkylineState['tour']>) => void;
  notify: (text: string) => void;
  setInsets: (i: Partial<SkylineState['insets']>) => void;
  flyTo: (shot: CameraShot, duration?: number) => void;
}

let reqId = 1;
const DEFAULT_GAP = 6;
export const DEMO_FLOOR = 24;
export const DEMO_UNIT: UnitId = 'B';

function dur(get: () => SkylineState, base: number) {
  return get().reducedMotion ? 0.01 : base;
}

export const useSkyline = create<SkylineState>((set, get) => ({
  page: 'home',
  ready: false,
  webglFailed: null,
  mode: 'overview',
  activeView: 'overview',
  selectedFloor: null,
  hoveredFloor: null,
  selectedUnit: null,
  apartmentView: 'perspective',
  apartmentRoom: 'living',
  rooftopSpot: 'overview',
  garageLevel: 0,
  garageView: 'perspective',
  exploded: false,
  explodeGap: DEFAULT_GAP,
  timeOfDay: 'day',
  layers: { facade: true, landscape: true, archLights: true, technical: false, context: true },
  uiHidden: false,
  helpOpen: false,
  quality: detectQuality(),
  autoQuality: typeof location === 'undefined' || !new URLSearchParams(location.search).has('quality'),
  reducedMotion: false,
  camera: { id: 0, shot: { position: [520, 260, 640], target: [0, 60, 0] }, duration: 0 },
  orbitSpeed: 0,
  tour: { active: false, step: 0, paused: false },
  toast: null,
  insets: { left: 0, right: 0, bottom: 0 },

  flyTo: (shot, duration = 1.8) => set({ camera: { id: reqId++, shot, duration: dur(get, duration) } }),

  enterExplore: () => {
    set({ page: 'explore', orbitSpeed: 0 });
    const s = get();
    s.flyTo(presetShot('overview', s.exploded ? 1 : 0, s.explodeGap), 2.4);
    set({ activeView: 'overview' });
  },
  goHome: () => {
    set({
      page: 'home', mode: 'overview', selectedFloor: null, selectedUnit: null, exploded: false,
      tour: { active: false, step: 0, paused: false }, uiHidden: false,
    });
    get().flyTo(presetShot('overview'), 1.6);
  },
  setReady: (v) => set({ ready: v }),
  setWebglFailed: (reason) => set({ webglFailed: reason }),

  setView: (v) => {
    const s = get();
    if (v === 'exploded') {
      s.toggleExploded();
      return;
    }
    set({ activeView: v, mode: 'overview', selectedUnit: null, orbitSpeed: 0 });
    s.flyTo(presetShot(v, s.exploded ? 1 : 0, s.explodeGap), v === 'bottom' ? 2.4 : 1.9);
  },
  resetCamera: () => {
    set({
      mode: 'overview', activeView: 'overview', selectedFloor: null, selectedUnit: null, exploded: false,
      explodeGap: DEFAULT_GAP, orbitSpeed: 0,
      layers: { ...get().layers, facade: true, technical: false },
    });
    get().flyTo(presetShot('overview'), 1.8);
  },
  toggleExploded: (v) => {
    const s = get();
    const exploded = v ?? !s.exploded;
    set({ exploded, activeView: exploded ? 'exploded' : 'overview', orbitSpeed: 0 });
    if (s.mode === 'apartment' || s.mode === 'garage' || s.mode === 'rooftop') set({ mode: s.selectedFloor ? 'floor' : 'overview', selectedUnit: null });
    const sel = get().selectedFloor;
    if (sel && get().mode === 'floor') s.flyTo(floorShot(sel, exploded ? 1 : 0, s.explodeGap), 2.2);
    else s.flyTo(exploded ? presetShot('exploded', 1, s.explodeGap) : presetShot('overview'), 2.2);
  },
  setExplodeGap: (gap) => set({ explodeGap: Math.max(1, Math.min(14, gap)) }),

  selectFloor: (n, opts) => {
    const s = get();
    if (n === null) {
      set({ selectedFloor: null, selectedUnit: null, mode: 'overview', activeView: null });
      if (opts?.fly !== false) s.flyTo(s.exploded ? presetShot('exploded', 1, s.explodeGap) : presetShot('overview'), 1.8);
      return;
    }
    const floor = Math.max(1, Math.min(FLOOR_COUNT, Math.round(n)));
    set({ selectedFloor: floor, selectedUnit: null, mode: 'floor', activeView: null, orbitSpeed: 0 });
    if (opts?.fly !== false) s.flyTo(floorShot(floor, s.exploded ? 1 : 0, s.explodeGap), 1.7);
  },
  stepFloor: (delta) => {
    const s = get();
    const base = s.selectedFloor ?? (delta > 0 ? 0 : FLOOR_COUNT + 1);
    const next = Math.max(1, Math.min(FLOOR_COUNT, base + delta));
    s.selectFloor(next);
  },
  hoverFloor: (n) => {
    if (get().hoveredFloor !== n) set({ hoveredFloor: n });
  },
  selectUnit: (floor, unit) => {
    if (!isResidential(floor)) {
      get().selectFloor(floor);
      return;
    }
    const s = get();
    if (s.selectedFloor !== floor || s.mode !== 'floor') s.selectFloor(floor, { fly: false });
    set({ selectedUnit: unit });
    s.flyTo(unitShot(floor, unit, s.exploded ? 1 : 0, s.explodeGap), 1.6);
  },
  openApartment: (floor, unit) => {
    const s = get();
    const f = floor ?? (s.selectedFloor && isResidential(s.selectedFloor) ? s.selectedFloor : DEMO_FLOOR);
    const u = unit ?? s.selectedUnit ?? DEMO_UNIT;
    set({
      mode: 'apartment', selectedFloor: f, selectedUnit: u, exploded: false, apartmentView: 'perspective',
      apartmentRoom: 'living', activeView: null, orbitSpeed: 0,
    });
    s.flyTo(apartmentShot(f, u, 'perspective'), 2.2);
  },
  setApartmentView: (v, room) => {
    const s = get();
    if (s.mode !== 'apartment' || !s.selectedFloor || !s.selectedUnit) return;
    const r = room ?? s.apartmentRoom;
    set({ apartmentView: v, apartmentRoom: r });
    s.flyTo(apartmentShot(s.selectedFloor, s.selectedUnit, v, r), v === 'interior' ? 1.6 : 1.8);
  },
  openRooftop: (spot = 'overview') => {
    const s = get();
    set({ mode: 'rooftop', rooftopSpot: spot, selectedFloor: null, selectedUnit: null, exploded: false, activeView: null, orbitSpeed: 0 });
    s.flyTo(rooftopShot(spot), spot === 'overview' ? 2.6 : 1.8);
  },
  playRooftopFilm: () => {
    const s = get();
    set({ mode: 'rooftop', exploded: false, selectedFloor: null, selectedUnit: null, activeView: null, orbitSpeed: 0 });
    if (s.reducedMotion) {
      s.flyTo(rooftopShot('pool'), 0.01);
      return;
    }
    set({ camera: { id: reqId++, path: rooftopPath(), duration: 22 } });
  },
  openGarage: (level, view) => {
    const s = get();
    const lv = level ?? s.garageLevel;
    const gv = view ?? (s.mode === 'garage' ? s.garageView : 'perspective');
    set({ mode: 'garage', garageLevel: lv, garageView: gv, exploded: false, selectedFloor: null, selectedUnit: null, activeView: null, orbitSpeed: 0 });
    s.flyTo(garageShot(lv, gv), s.mode === 'garage' ? 1.6 : 2.6);
  },
  setTimeOfDay: (t) => set({ timeOfDay: t }),
  cycleTimeOfDay: () => {
    const order: TimeOfDay[] = ['day', 'sunset', 'night'];
    set({ timeOfDay: order[(order.indexOf(get().timeOfDay) + 1) % order.length] });
  },
  setLayer: (k, v) => set({ layers: { ...get().layers, [k]: v ?? !get().layers[k] } }),
  setUiHidden: (v) => set({ uiHidden: v }),
  setHelpOpen: (v) => set({ helpOpen: v }),
  setQuality: (q, auto = false) => set({ quality: q, autoQuality: auto }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setOrbitSpeed: (sp) => set({ orbitSpeed: sp }),
  setTour: (t) => set({ tour: { ...get().tour, ...t } }),
  notify: (text) => set({ toast: { id: reqId++, text } }),
  setInsets: (i) => {
    const cur = get().insets;
    const next = { ...cur, ...i };
    if (next.left !== cur.left || next.right !== cur.right || next.bottom !== cur.bottom) set({ insets: next });
  },
}));
