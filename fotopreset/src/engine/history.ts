import { NEUTRAL, combine, type Adjustments } from './adjustments';
import { findPreset } from '../presets/presets';

/** O que o usuário escolheu. A imagem em si nunca entra no histórico. */
export interface EditState {
  presetId: string | null;
  /** 0–1 */
  intensity: number;
  manual: Adjustments;
}

export const INITIAL_EDIT: EditState = {
  presetId: null,
  intensity: 1,
  manual: { ...NEUTRAL },
};

export function effectiveAdjustments(s: EditState): Adjustments {
  return combine(findPreset(s.presetId)?.adjustments ?? null, s.intensity, s.manual);
}

export interface History {
  past: EditState[];
  present: EditState;
  future: EditState[];
  /** Chave da última alteração, para juntar arrastos de um mesmo controle. */
  lastKey: string | null;
  lastAt: number;
}

export type HistoryAction =
  | { type: 'set'; state: EditState; key: string; at: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'reset'; at: number }
  | { type: 'clear' };

export const HISTORY_LIMIT = 100;
/** Alterações no mesmo controle dentro deste intervalo viram um passo só. */
export const COALESCE_MS = 700;

export function createHistory(present: EditState = INITIAL_EDIT): History {
  return { past: [], present, future: [], lastKey: null, lastAt: 0 };
}

function sameState(a: EditState, b: EditState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function historyReducer(h: History, action: HistoryAction): History {
  switch (action.type) {
    case 'set': {
      if (sameState(h.present, action.state)) return h;
      const coalesce = h.lastKey === action.key && action.at - h.lastAt < COALESCE_MS;
      const past = coalesce ? h.past : [...h.past, h.present].slice(-HISTORY_LIMIT);
      return { past, present: action.state, future: [], lastKey: action.key, lastAt: action.at };
    }
    case 'undo': {
      const prev = h.past[h.past.length - 1];
      if (!prev) return h;
      return {
        past: h.past.slice(0, -1),
        present: prev,
        future: [h.present, ...h.future],
        lastKey: null,
        lastAt: 0,
      };
    }
    case 'redo': {
      const next = h.future[0];
      if (!next) return h;
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
        lastKey: null,
        lastAt: 0,
      };
    }
    case 'reset':
      return historyReducer(h, { type: 'set', state: INITIAL_EDIT, key: 'reset', at: action.at });
    case 'clear':
      return createHistory();
  }
}
